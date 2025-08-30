import { useCallback, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useCentrifugoConnection } from './useCentrifugoConnection';
import { useCentrifugoSubscription } from './useCentrifugoSubscription';

// Notification message interface
export interface NotificationMessage {
  type: 'notification_created' | 'notification_updated' | 'notification_deleted';
  notification: {
    id: string;
    title: string;
    description?: string;
    type: 'info' | 'success' | 'warning' | 'error';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    createdAt: string;
    tenantId?: string;
    role?: string;
    userId?: string;
    metadata?: any;
  };
}

/**
 * Main Centrifugo hook that provides connection status and basic functionality
 */
export function useCentrifugo() {
  const { data: session } = useSession();
  const connection = useCentrifugoConnection();

  return {
    ...connection,
    userId: session?.user?.id,
    isAuthenticated: !!session?.user?.id,
  };
}

/**
 * Hook for subscribing to notification channels with automatic channel selection
 * based on user session and targeting rules
 */
export function useNotificationSubscription(
  onNotification: (message: NotificationMessage) => void,
  options?: {
    /** Subscribe to global notifications */
    includeGlobal?: boolean;
    /** Subscribe to user-specific notifications */
    includeUser?: boolean;
    /** Subscribe to tenant-wide notifications (requires tenantId) */
    includeTenant?: boolean;
    /** Specific tenant ID for tenant notifications */
    tenantId?: string;
    /** Subscribe to role-specific notifications (requires tenantId and role) */
    includeRole?: boolean;
    /** Specific role for role notifications */
    role?: string;
    /** Whether subscription is enabled */
    enabled?: boolean;
  }
) {
  const { data: session } = useSession();
  const { isConnected } = useCentrifugo();
  
  const {
    includeGlobal = true,
    includeUser = true,
    includeTenant = false,
    includeRole = false,
    tenantId,
    role,
    enabled = true,
  } = options || {};

  const userId = session?.user?.id;

  // Only log on debug mode to reduce noise
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (window as any).__CENTRIFUGO_DEBUG) {
    console.log("🔍 [useNotificationSubscription] Hook called with:", {
      userId, isConnected, enabled, includeGlobal, includeUser
    });
  }

  // Generate channel names based on options
  const channels = useMemo(() => {
    const channelList: string[] = [];
    
    if (includeGlobal) {
      channelList.push('notifications:global');
    }
    
    if (includeUser && userId) {
      channelList.push(`notifications:user:${userId}`);
    }
    
    if (includeTenant && tenantId) {
      channelList.push(`notifications:tenant:${tenantId}`);
    }
    
    if (includeRole && tenantId && role) {
      channelList.push(`notifications:tenant:${tenantId}:role:${role}`);
    }
    
    // Only log channels in debug mode
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (window as any).__CENTRIFUGO_DEBUG) {
      console.log('📡 [useNotificationSubscription] Generated channels:', channelList);
    }
    return channelList;
  }, [includeGlobal, includeUser, includeTenant, includeRole, userId, tenantId, role]);

  // Subscribe to global notifications
  const globalSub = useCentrifugoSubscription<NotificationMessage>(
    includeGlobal ? 'notifications:global' : undefined,
    onNotification,
    { enabled: enabled && isConnected }
  );

  // Subscribe to user-specific notifications
  const userSub = useCentrifugoSubscription<NotificationMessage>(
    includeUser && userId ? `notifications:user:${userId}` : undefined,
    onNotification,
    { enabled: enabled && isConnected }
  );

  // Subscribe to tenant notifications
  const tenantSub = useCentrifugoSubscription<NotificationMessage>(
    includeTenant && tenantId ? `notifications:tenant:${tenantId}` : undefined,
    onNotification,
    { enabled: enabled && isConnected }
  );

  // Subscribe to role notifications
  const roleSub = useCentrifugoSubscription<NotificationMessage>(
    includeRole && tenantId && role ? `notifications:tenant:${tenantId}:role:${role}` : undefined,
    onNotification,
    { enabled: enabled && isConnected }
  );

  // Debug logging for subscription states
  useEffect(() => {
    if (enabled && isConnected) {
      console.log('🔍 [useNotificationSubscription] Subscription states:', {
        global: { channel: 'notifications:global', isSubscribed: globalSub.state.isSubscribed, error: globalSub.state.error },
        user: { channel: `notifications:user:${userId}`, isSubscribed: userSub.state.isSubscribed, error: userSub.state.error },
        tenant: includeTenant ? { channel: `notifications:tenant:${tenantId}`, isSubscribed: tenantSub.state.isSubscribed, error: tenantSub.state.error } : 'disabled',
        role: includeRole ? { channel: `notifications:tenant:${tenantId}:role:${role}`, isSubscribed: roleSub.state.isSubscribed, error: roleSub.state.error } : 'disabled',
      });
    }
  }, [enabled, isConnected, globalSub.state.isSubscribed, userSub.state.isSubscribed, tenantSub.state.isSubscribed, roleSub.state.isSubscribed, userId, tenantId, role, includeTenant, includeRole]);

  // Aggregate subscription states
  const isSubscribed = [
    includeGlobal && globalSub.state.isSubscribed,
    includeUser && userSub.state.isSubscribed,
    includeTenant && tenantSub.state.isSubscribed,
    includeRole && roleSub.state.isSubscribed,
  ].filter(Boolean).every(Boolean);

  const hasErrors = [
    globalSub.state.error,
    userSub.state.error,
    tenantSub.state.error,
    roleSub.state.error,
  ].filter(Boolean).length > 0;

  const totalUnread = [
    globalSub.state.unread,
    userSub.state.unread,
    tenantSub.state.unread,
    roleSub.state.unread,
  ].reduce((sum, count) => sum + count, 0);

  // Helper functions
  const clearAllUnread = useCallback(() => {
    globalSub.clearUnread();
    userSub.clearUnread();
    tenantSub.clearUnread();
    roleSub.clearUnread();
  }, [globalSub, userSub, tenantSub, roleSub]);

  const pauseAll = useCallback((paused: boolean) => {
    globalSub.setPaused(paused);
    userSub.setPaused(paused);
    tenantSub.setPaused(paused);
    roleSub.setPaused(paused);
  }, [globalSub, userSub, tenantSub, roleSub]);

  return {
    isSubscribed,
    isConnected,
    hasErrors,
    totalUnread,
    channels,
    subscriptions: {
      global: globalSub,
      user: userSub,
      tenant: tenantSub,
      role: roleSub,
    },
    clearAllUnread,
    pauseAll,
  };
}

/**
 * Simplified hook for basic notification subscriptions
 * Automatically subscribes to global and user-specific notifications
 */
export function useBasicNotificationSubscription(
  onNotification: (message: NotificationMessage) => void
) {
  return useNotificationSubscription(onNotification, {
    includeGlobal: true,
    includeUser: true,
    enabled: true,
  });
}

/**
 * Hook for tenant-aware notification subscriptions
 * Subscribes to global, user, and tenant notifications
 */
export function useTenantNotificationSubscription(
  tenantId: string | undefined,
  onNotification: (message: NotificationMessage) => void,
  options?: {
    includeRole?: boolean;
    role?: string;
  }
) {
  return useNotificationSubscription(onNotification, {
    includeGlobal: true,
    includeUser: true,
    includeTenant: !!tenantId,
    tenantId,
    includeRole: options?.includeRole,
    role: options?.role,
    enabled: true,
  });
}

/**
 * Hook for subscribing to a single custom channel
 */
export function useCentrifugoChannel<T = unknown>(
  channel: string | undefined,
  onMessage: (message: T) => void,
  options?: {
    enabled?: boolean;
    autoClearOnMessage?: boolean;
  }
) {
  const { isConnected } = useCentrifugo();
  
  return useCentrifugoSubscription<T>(
    channel,
    onMessage,
    {
      enabled: (options?.enabled ?? true) && isConnected,
      autoClearOnMessage: options?.autoClearOnMessage,
    }
  );
}

// hooks/useCentrifugoSubscription.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { subscriptionManager } from "@/lib/centrifugo-subscription-manager";

// shape of local state this hook keeps per subscriber
export type SubscriptionState<T> = {
  last?: T;               // last received message payload
  receivedAt?: number;    // epoch ms when last arrived
  unread: number;         // count since last clear
  isSubscribed: boolean;  // whether we currently have a handler attached
  error?: string;         // last error (if any)
  paused: boolean;        // if true, handler attached but we don't update state
};

export type UseCentrifugoSubscriptionOptions<T> = {
  /** start with this state (e.g., seed from server-rendered data) */
  initial?: Partial<SubscriptionState<T>>;
  /** auto-clear unread counter when a new message arrives */
  autoClearOnMessage?: boolean;
  /** if true, skip attaching until ready */
  enabled?: boolean;
};

/**
 * Subscribe to a Centrifugo channel with shared underlying Subscription,
 * keep per-hook local state (last, unread, etc), and invoke your handler.
 */
export function useCentrifugoSubscription<T>(
  channel: string | undefined,
  onEvent?: (msg: T) => void,
  opts?: UseCentrifugoSubscriptionOptions<T>
) {
  const {
    initial,
    autoClearOnMessage = false,
    enabled = true,
  } = opts ?? {};

  const [state, setState] = useState<SubscriptionState<T>>(() => ({
    unread: 0,
    isSubscribed: false,
    paused: false,
    ...initial,
  }));

  // stable refs so we can read latest handler / flags inside the manager callback
  const onEventRef = useRef<typeof onEvent>();
  const pausedRef = useRef<boolean>(state.paused);
  onEventRef.current = onEvent;
  

  useEffect(() => { pausedRef.current = state.paused; }, [state.paused]);

  // attach our per-hook handler
  useEffect(() => {
    if (!enabled || !channel) {
      setState(s => ({ ...s, isSubscribed: false, error: undefined }));
      return;
    }

    setState(s => ({ ...s, isSubscribed: true, error: undefined }));

    try {
      const unsubscribe = subscriptionManager.subscribe(channel, (raw) => {      
        // drop state updates when paused, but still call user handler if present
        const msg = raw as T;

        // call user-provided handler first (doesn't affect local state)
        try { 
          onEventRef.current?.(msg); 
        } catch (e) {
          console.error("[Centrifugo] onEvent error", e);
        }

        if (pausedRef.current) {
          return;
        }

        setState(prev => {
          const base = {
            ...prev,
            last: msg,
            receivedAt: Date.now(),
          };
          return autoClearOnMessage
            ? { ...base, unread: 0 }
            : { ...base, unread: prev.unread + 1 };
        });
      });

      return () => {
        try { 
          unsubscribe(); 
          setState(s => ({ ...s, isSubscribed: false }));
        } catch (error) {
          console.error("[Centrifugo] Unsubscribe error", error);
          setState(s => ({ ...s, isSubscribed: false, error: error instanceof Error ? error.message : 'Unsubscribe failed' }));
        }
      };
    } catch (error) {
      console.error("[Centrifugo] Subscribe error", error);
      setState(s => ({ 
        ...s, 
        isSubscribed: false, 
        error: error instanceof Error ? error.message : 'Subscription failed' 
      }));
      return;
    }
  }, [channel, enabled]);

  // helpers the consumer can call
  const actions = useMemo(() => ({
    clearUnread: () => setState(s => ({ ...s, unread: 0 })),
    setPaused: (v: boolean) => setState(s => ({ ...s, paused: v })),
    setLast: (val: T | undefined) => setState(s => ({ ...s, last: val })),
    setError: (err?: string) => setState(s => ({ ...s, error: err })),
  }), []);

  return { state, ...actions };
}
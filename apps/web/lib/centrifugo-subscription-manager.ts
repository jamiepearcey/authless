// Global subscription manager to prevent duplicate subscriptions
import { centrifugoManager } from "./centrifugo-manager";

type SubscriptionHandler = (data: any) => void;

interface SubscriptionState {
  channel: string;
  handlers: Set<SubscriptionHandler>;
  disposed: boolean;
}

class CentrifugoSubscriptionManager {
  private subscriptions = new Map<string, SubscriptionState>();
  private isInitialized = false;

  private ensureInitialized() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      // Clean up any existing subscriptions on initialization
      this.cleanup();
    }
  }

  private cleanup() {
    // Clear any stale subscriptions
    this.subscriptions.clear();
  }

  /**
   * Subscribe to a channel with a handler
   * Returns a function to unsubscribe this specific handler
   */
  subscribe(channel: string, handler: SubscriptionHandler): () => void {
    this.ensureInitialized();

    if (!channel) {
      throw new Error("Channel name is required");
    }

    let subscription = this.subscriptions.get(channel);
    
    if (!subscription) {
      // Create new subscription state
      subscription = {
        channel,
        handlers: new Set(),
        disposed: false,
      };
      this.subscriptions.set(channel, subscription);
    }

    // If subscription was previously disposed, recreate it
    if (subscription.disposed) {
      subscription.disposed = false;
      subscription.handlers = new Set();
    }

    // Add the handler
    subscription.handlers.add(handler);

    // Set up the actual Centrifugo subscription if this is the first handler
    if (subscription.handlers.size === 1) {
      try {
        const dispose = centrifugoManager.addHandler(channel, (data) => {
          const sub = this.subscriptions.get(channel);
          if (sub && !sub.disposed) {
            // Notify all handlers for this channel
            sub.handlers.forEach(h => {
              try {
                h(data);
              } catch (error) {
                console.error(`[SubscriptionManager] Handler error for ${channel}:`, error);
              }
            });
          }
        });

        // Store the dispose function
        (subscription as any)._dispose = dispose;
      } catch (error) {
        console.error(`[SubscriptionManager] Failed to create subscription for ${channel}:`, error);
        // Remove the handler if subscription failed
        subscription.handlers.delete(handler);
        if (subscription.handlers.size === 0) {
          this.subscriptions.delete(channel);
        }
        throw error;
      }
    }

    // Return unsubscribe function for this specific handler
    return () => {
      const sub = this.subscriptions.get(channel);
      if (!sub) return;

      sub.handlers.delete(handler);

      // If no more handlers, dispose the subscription
      if (sub.handlers.size === 0) {
        sub.disposed = true;
        if ((sub as any)._dispose) {
          try {
            (sub as any)._dispose();
          } catch (error) {
            console.error(`[SubscriptionManager] Error disposing subscription for ${channel}:`, error);
          }
        }
        this.subscriptions.delete(channel);
      }
    };
  }

  /**
   * Get current subscription state for debugging
   */
  getSubscriptionState() {
    return Array.from(this.subscriptions.entries()).map(([channel, sub]) => ({
      channel,
      handlerCount: sub.handlers.size,
      disposed: sub.disposed,
    }));
  }

  /**
   * Force cleanup of all subscriptions (useful for hot reloading)
   */
  reset() {
    for (const [channel, sub] of this.subscriptions) {
      if ((sub as any)._dispose) {
        try {
          (sub as any)._dispose();
        } catch (error) {
          console.error(`[SubscriptionManager] Error during reset for ${channel}:`, error);
        }
      }
    }
    this.cleanup();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const subscriptionManager = new CentrifugoSubscriptionManager();

// Make it available for debugging
if (typeof window !== 'undefined') {
  (window as any).__centrifugoSubscriptionManager = subscriptionManager;
}

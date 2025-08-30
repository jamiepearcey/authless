// rt/centrifugoManager.ts
import { Centrifuge, Subscription } from "centrifuge";
import { centrifugoDebugger } from "./centrifugo-debug";

type Handler = (data: unknown) => void;

type ChannelEntry = {
  sub: Subscription;
  handlers: Set<Handler>;
};

class CentrifugoManager {
  private cf: Centrifuge | null = null;
  private channels = new Map<string, ChannelEntry>();
  private connecting = false;
  private connected = false;

  get isConnected() { return this.connected; }
  get isConnecting() { return this.connecting; }
  get client() { return this.cf; }

  async connect(url: string, token: string) {
    if (this.cf || this.connecting) return;

    centrifugoDebugger.log('connection', `Attempting to connect to ${url}`, { hasToken: !!token });
    
    this.connecting = true;
    const cf = new Centrifuge(url, { token, debug: process.env.NODE_ENV === "development" });

    cf.on("connected", (ctx) => {
      this.connected = true;
      this.connecting = false;
      centrifugoDebugger.log('connection', 'Connected successfully', ctx);
    });
    
    cf.on("disconnected", (ctx) => {
      this.connected = false;
      this.connecting = false;
      centrifugoDebugger.log('connection', 'Disconnected', ctx);
    });
    
    cf.on("error", (ctx) => {
      centrifugoDebugger.log('error', 'Connection error', ctx);
      this.connecting = false;
    });

    cf.on("connecting", (ctx) => {
      centrifugoDebugger.log('connection', 'Connecting...', ctx);
    });

    this.cf = cf;
    cf.connect();
  }

  disconnect() {
    // Unsubscribe each channel (cleans up on server, keeps local handlers intact)
    for (const [, entry] of this.channels) {
      try { entry.sub.unsubscribe(); } catch {
        // ignore
      }
      // keep handlers set; if you want hard reset:
      // this.channels.delete(ch)
    }
    this.cf?.disconnect();
    this.cf = null;
    this.connected = false;
    this.connecting = false;
  }

  /** Subscribe (or reuse) a channel and add a handler. Returns a disposer to remove this handler. */
  addHandler(channel: string, handler: Handler): () => void {
    if (!this.cf) throw new Error("Centrifuge not connected");

    centrifugoDebugger.log('subscription', `Adding handler for channel: ${channel}`);

    let entry = this.channels.get(channel);
    if (!entry) {
      centrifugoDebugger.log('subscription', `Creating new subscription for channel: ${channel}`);
      
      // Check if a subscription already exists in Centrifuge to prevent duplicate subscription error
      const existingSubs = this.cf.subscriptions();
      if (existingSubs[channel]) {
        centrifugoDebugger.log('subscription', `Subscription already exists in Centrifuge for ${channel}, cleaning up`);
        try {
          existingSubs[channel].unsubscribe();
        } catch (e) {
          centrifugoDebugger.log('error', `Failed to cleanup existing subscription for ${channel}`, e);
        }
      }

      const sub = this.cf.newSubscription(channel);

      sub.on("publication", (ctx) => {
        centrifugoDebugger.log('message', 'Message received', ctx.data, channel);
        // fan-out to all handlers for this channel
        const e = this.channels.get(channel);
        if (!e) return;
        centrifugoDebugger.log('message', `Fanning out to ${e.handlers.size} handlers for ${channel}`);
        for (const h of e.handlers) {
          try { h(ctx.data); } catch (err) { 
            centrifugoDebugger.log('error', 'Handler error', err, channel);
          }
        }
      });

      sub.on("subscribed", (ctx) => { 
        centrifugoDebugger.log('subscription', 'Subscribed successfully', ctx, channel);
      });
      sub.on("subscribing", (ctx) => { 
        centrifugoDebugger.log('subscription', 'Subscribing...', ctx, channel);
      });
      sub.on("unsubscribed", (ctx) => { 
        centrifugoDebugger.log('subscription', 'Unsubscribed', ctx, channel);
      });
      sub.on("error", (err) => { 
        centrifugoDebugger.log('error', 'Subscription error', err, channel);
      });

      sub.subscribe();
      entry = { sub, handlers: new Set() };
      this.channels.set(channel, entry);
    } else {
      centrifugoDebugger.log('subscription', `Reusing existing subscription for channel: ${channel}`);
    }

    // attach this hook's handler
    entry.handlers.add(handler);
    centrifugoDebugger.log('subscription', `Added handler for ${channel}, total handlers: ${entry.handlers.size}`);

    // disposer for this handler only
    return () => {
      centrifugoDebugger.log('subscription', `Removing handler for channel: ${channel}`);
      const e = this.channels.get(channel);
      if (!e) return;

      e.handlers.delete(handler);

      // if no handlers remain, we can free the subscription
      if (e.handlers.size === 0) {
        centrifugoDebugger.log('subscription', `No more handlers for ${channel}, cleaning up subscription`);
        try { e.sub.unsubscribe(); } catch {
          // ignore
        }
        this.channels.delete(channel);
      } else {
        centrifugoDebugger.log('subscription', `${e.handlers.size} handlers remaining for ${channel}`);
      }
    };
  }
}

export const centrifugoManager = new CentrifugoManager();
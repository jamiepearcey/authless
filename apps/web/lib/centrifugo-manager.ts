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
    for (const [ch, entry] of this.channels) {
      try { entry.sub.unsubscribe(); } catch {}
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

    console.log(`🔍 [centrifugoManager] Adding handler for channel: ${channel}`);

    let entry = this.channels.get(channel);
    if (!entry) {
      console.log(`🔍 [centrifugoManager] Creating new subscription for channel: ${channel}`);
      const sub = this.cf.newSubscription(channel);

      sub.on("publication", (ctx) => {
        centrifugoDebugger.log('message', 'Message received', ctx.data, channel);
        console.log(`🔍 [centrifugoManager] Publication received on ${channel}:`, ctx.data);
        // fan-out to all handlers for this channel
        const e = this.channels.get(channel);
        if (!e) return;
        console.log(`🔍 [centrifugoManager] Fanning out to ${e.handlers.size} handlers for ${channel}`);
        for (const h of e.handlers) {
          try { h(ctx.data); } catch (err) { 
            centrifugoDebugger.log('error', 'Handler error', err, channel);
          }
        }
      });

      sub.on("subscribed", (ctx) => { 
        centrifugoDebugger.log('subscription', 'Subscribed successfully', ctx, channel);
        console.log(`🔍 [centrifugoManager] Successfully subscribed to ${channel}`);
      });
      sub.on("subscribing", (ctx) => { 
        centrifugoDebugger.log('subscription', 'Subscribing...', ctx, channel);
        console.log(`🔍 [centrifugoManager] Subscribing to ${channel}...`);
      });
      sub.on("unsubscribed", (ctx) => { 
        centrifugoDebugger.log('subscription', 'Unsubscribed', ctx, channel);
        console.log(`🔍 [centrifugoManager] Unsubscribed from ${channel}`);
      });
      sub.on("error", (err) => { 
        centrifugoDebugger.log('error', 'Subscription error', err, channel);
        console.error(`🔍 [centrifugoManager] Subscription error on ${channel}:`, err);
      });

      sub.subscribe();
      entry = { sub, handlers: new Set() };
      this.channels.set(channel, entry);
    } else {
      console.log(`🔍 [centrifugoManager] Reusing existing subscription for channel: ${channel}`);
    }

    // attach this hook's handler
    entry.handlers.add(handler);
    console.log(`🔍 [centrifugoManager] Added handler for ${channel}, total handlers: ${entry.handlers.size}`);

    // disposer for this handler only
    return () => {
      console.log(`🔍 [centrifugoManager] Removing handler for channel: ${channel}`);
      const e = this.channels.get(channel);
      if (!e) return;

      e.handlers.delete(handler);

      // if no handlers remain, we can free the subscription
      if (e.handlers.size === 0) {
        console.log(`🔍 [centrifugoManager] No more handlers for ${channel}, cleaning up subscription`);
        try { e.sub.unsubscribe(); } catch {}
        this.channels.delete(channel);
      } else {
        console.log(`🔍 [centrifugoManager] ${e.handlers.size} handlers remaining for ${channel}`);
      }
    };
  }
}

export const centrifugoManager = new CentrifugoManager();
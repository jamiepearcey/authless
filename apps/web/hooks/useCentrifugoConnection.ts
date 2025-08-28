// hooks/useCentrifugo.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { centrifugoManager } from "@/lib/centrifugo-manager";
import { trpc } from "@/lib/trpc";

export function useCentrifugoConnection() {
  const { data: session, status } = useSession();
  const getToken = trpc.getCentrifugoToken.useMutation();
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    console.log("[useCentrifugoConnection] Connect called:", { 
      status, 
      userId: session?.user?.id,
      isConnected: centrifugoManager.isConnected,
      isConnecting: centrifugoManager.isConnecting 
    });
    
    if (status !== "authenticated" || !session?.user?.id) {
      console.log("[useCentrifugoConnection] Not authenticated or no user ID");
      return;
    }
    if (centrifugoManager.isConnected || centrifugoManager.isConnecting) {
      console.log("[useCentrifugoConnection] Already connected or connecting");
      return;
    }

    try {
      console.log("[useCentrifugoConnection] Getting token...");
      const { token, centrifugoUrl } = await getToken.mutateAsync();
      console.log("[useCentrifugoConnection] Token received, connecting to:", centrifugoUrl);
      
      await centrifugoManager.connect(centrifugoUrl, token);
      setError(null);
      console.log("[useCentrifugoConnection] Connection successful");
    } catch (e: any) {
      console.error("[useCentrifugoConnection] Connect failed:", e);
      setError(e?.message ?? "Failed to connect");
    }
  }, [status, session?.user?.id, getToken]);

  useEffect(() => {
    console.log("useEffect", status, session?.user?.id);
    if (status === "authenticated" && session?.user?.id) {
      connect();
    }
    // optional cleanup on unmount:
    return () => { /* keep connection if app-wide; or call centrifugoManager.disconnect() */ };
  }, [status, session?.user?.id, connect]);

  console.log("useCentrifugoConnection", centrifugoManager.isConnected, centrifugoManager.isConnecting, error);
  return {
    isConnected: centrifugoManager.isConnected,
    isConnecting: centrifugoManager.isConnecting,
    error,
    disconnect: () => centrifugoManager.disconnect(),
  };
}

/** subscribe a callback to a channel; gets auto-cleaned when component unmounts */
export function useCentrifugoChannel<T = unknown>(channel: string, onMessage: (msg: T) => void) {
  const disposerRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    if (!centrifugoManager.client || !centrifugoManager.isConnected) return;

    // attach handler for this channel
    disposerRef.current = centrifugoManager.addHandler(channel, (d) => onMessage(d as T));

    return () => {
      // remove only THIS hook's handler; keeps channel for other hooks if present
      disposerRef.current?.();
      disposerRef.current = null;
    };
  }, [channel, onMessage]);
}
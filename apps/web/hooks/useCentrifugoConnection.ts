// hooks/useCentrifugo.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { centrifugoManager } from "@/lib/centrifugo-manager";
import { trpc } from "@/lib/trpc";

export function useCentrifugoConnection() {
  const { data: session, status } = useSession();
  const getToken = trpc.getCentrifugoToken.useMutation();
  const [error, setError] = useState<string | null>(null);

  const connectionAttemptedRef = useRef(false);

  const connect = useCallback(async () => {
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }
    
    if (centrifugoManager.isConnected || centrifugoManager.isConnecting) {
      return;
    }

    // Prevent multiple simultaneous attempts
    if (connectionAttemptedRef.current) {
      return;
    }

    connectionAttemptedRef.current = true;

    try {
      const { token, centrifugoUrl } = await getToken.mutateAsync();
      await centrifugoManager.connect(centrifugoUrl, token);
      setError(null);
    } catch (e: any) {
      console.error("[Centrifugo] Connect failed:", e);
      setError(e?.message ?? "Failed to connect");
      connectionAttemptedRef.current = false; // Reset on error
    }
  }, [status, session?.user?.id]); // Removed getToken from dependencies

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id && !connectionAttemptedRef.current) {
      connect();
    }
    // Reset connection attempt flag when session changes
    if (status !== "authenticated") {
      connectionAttemptedRef.current = false;
    }
  }, [status, session?.user?.id, connect]);
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
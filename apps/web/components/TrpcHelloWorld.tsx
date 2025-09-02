"use client";

import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export function HelloWorld() {
    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => {
        setIsClient(true);
    }, []);

    const hello = trpc.hello.useQuery(
        { name: "Authless" },
        { enabled: isClient }
    );
  
    
    return hello.isLoading ? (
        "Pinging API..."
      ) : hello.error ? (
        <span className="text-destructive">
          API error: {hello.error.message}
        </span>
      ) : (
        <span className="rounded-full border px-3 py-1">
          tRPC says: {hello.data?.greeting}
        </span>
      )
}
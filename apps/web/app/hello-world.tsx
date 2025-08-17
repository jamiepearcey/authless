"use client";

import { trpc } from "@/lib/trpc";

export function HelloWorld() {
    console.log("HelloWorld where?", typeof window === "undefined" ? "server" : "browser");

    const hello = trpc.hello.useQuery({
      name: "Authless",
    });
  
    
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
"use client";
import { useEffect, useRef } from "react";

export default function PerspectiveGrid() {
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    let psWorker: any;
    let table: any;

    (async () => {
      // Load web components (client-only)
      await import("@finos/perspective-viewer");
      await import("@finos/perspective-viewer-datagrid");

      // Create Perspective worker via ESM import (no window.*)
      const { worker: createPerspectiveWorker } = await import("@finos/perspective");
      const WORKER_URL =
        "https://cdn.jsdelivr.net/npm/@finos/perspective@2.10.1/dist/umd/perspective.worker.js";
      psWorker = await createPerspectiveWorker(Promise.resolve(WORKER_URL));

      // (example) build a tiny table so you can verify it renders
      const rows = Array.from({ length: 1000 }, (_, i) => ({
        __id: i + 1,
        symbol: ["AAPL", "MSFT", "NVDA", "AMZN"][i % 4],
        price: 100 + (i % 100) * 0.5,
      }));
      table = await psWorker.table(rows);

      const viewer = viewerRef.current as any;
      await viewer.load(table);
      await viewer.restore({
        plugin: "Datagrid",
        sort: [["symbol", "asc"], ["__id", "asc"]],
        settings: true,
      });
    })();

    return () => {
      try { table?.delete(); } catch {}
      try { psWorker?.terminate?.(); } catch {}
    };
  }, []);

  return (
    <perspective-viewer
      ref={viewerRef}
      data-plugin="Datagrid"
      data-theme="Material Dark"
      style={{ height: "80vh", width: "100%" }}
    />
  );
}
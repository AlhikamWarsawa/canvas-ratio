"use client";

import { useEffect } from "react";

function readSnapshot(): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && (key.startsWith("canvas-ratio:") || key.startsWith("recall-lab:"))) {
      const value = window.localStorage.getItem(key);
      if (value !== null) snapshot[key] = value;
    }
  }
  return snapshot;
}

export function McpLocalStorageSync() {
  useEffect(() => {
    const sync = () => {
      void fetch("/api/mcp-sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ snapshot: readSnapshot() }) });
    };
    sync();
    const timer = window.setInterval(sync, 5_000);
    return () => window.clearInterval(timer);
  }, []);
  return null;
}

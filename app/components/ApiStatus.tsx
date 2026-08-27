"use client";

import { useEffect, useState } from "react";
import { API_BASE, fetchHealth } from "@/lib/api";
import type { HealthResponse } from "@/lib/types";

const STATUS_LABEL: Record<HealthResponse["status"] | "offline", string> = {
  ready: "Pi online",
  loading: "Models loading",
  error: "Pi error",
  offline: "Pi offline",
};

export default function ApiStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const next = await fetchHealth();
        if (!cancelled) {
          setHealth(next);
          setOffline(false);
        }
      } catch {
        if (!cancelled) {
          setOffline(true);
        }
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const status = offline ? "offline" : (health?.status ?? "loading");
  const tone =
    status === "ready"
      ? "bg-teal-400"
      : status === "loading"
        ? "bg-amber-400"
        : "bg-rose-500";

  return (
    <a
      href={API_BASE}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-amber-400/40 hover:text-white"
      title={health ? `${health.host} · ${health.device}` : API_BASE}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone} ${status === "ready" ? "pulse-dot" : ""}`} />
      {STATUS_LABEL[status]}
    </a>
  );
}

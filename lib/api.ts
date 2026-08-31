import type { HealthResponse, RecognizeResponse, StatsResponse } from "./types";

export const API_BASE = (
  process.env.NEXT_PUBLIC_ALPR_API_URL ?? "https://alpr.api.harryludemann.com"
).replace(/\/$/, "");

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function errorFromBody(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  const error = (data as { error?: unknown }).error;
  if (typeof error === "string") return error;
  return fallback;
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`, { signal, cache: "no-store" });
  const data = (await response.json().catch(() => null)) as HealthResponse | null;
  if (!response.ok || !data) {
    throw new Error(`Pi health check failed (${response.status})`);
  }
  return data;
}

export async function fetchStats(signal?: AbortSignal): Promise<StatsResponse> {
  const response = await fetch(`${API_BASE}/stats`, { signal, cache: "no-store" });
  const data = (await response.json().catch(() => null)) as StatsResponse | null;
  if (!response.ok || !data) {
    throw new Error(`Stats check failed (${response.status})`);
  }
  return data;
}

export async function recognizeImage(
  file: File,
  signal?: AbortSignal,
): Promise<RecognizeResponse> {
  const body = new FormData();
  body.append("image", file);

  const response = await fetch(`${API_BASE}/recognize`, {
    method: "POST",
    body,
    signal,
  });

  const data = (await response.json().catch(() => null)) as RecognizeResponse | { detail?: unknown } | null;
  if (!response.ok || !data) {
    throw new Error(errorFromBody(data, `Recognition failed (${response.status})`));
  }
  return data as RecognizeResponse;
}

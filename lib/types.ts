export type BoundingBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type PlateHit = {
  text: string;
  raw_text: string;
  confidence: number;
  detection_confidence: number;
  pattern_confidence: number;
  is_nz_format: boolean;
  bbox: BoundingBox;
  candidates: string[];
};

export type RecognizeResponse = {
  ok: boolean;
  plates: PlateHit[];
  processing_ms: number;
  image: { width: number; height: number };
  models: { detector: string; ocr: string };
  filename?: string | null;
  error?: string;
};

export type HealthResponse = {
  ok: boolean;
  status: "ready" | "loading" | "error";
  error: string | null;
  device: string;
  platform: string;
  host: string;
  models_loaded: boolean;
  uptime_s: number;
  models: { detector: string; ocr: string };
};

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, MAX_UPLOAD_BYTES, recognizeImage } from "@/lib/api";
import type { RecognizeResponse } from "@/lib/types";
import PlateResult from "./PlateResult";

type CameraState = "off" | "starting" | "live" | "blocked";

function revoke(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}

export default function Scanner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecognizeResponse | null>(null);
  const [camera, setCamera] = useState<CameraState>("off");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCamera("off");
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      stopCamera();
      revoke(preview);
    };
    // preview is snapshotted on unmount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopCamera]);

  const runFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("That file is not an image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Keep it under 8 MB — JPEG, PNG, or WebP.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setResult(null);
    setBusy(true);
    setPreview((current) => {
      revoke(current);
      return URL.createObjectURL(file);
    });

    try {
      const next = await recognizeImage(file, controller.signal);
      setResult(next);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Recognition failed.";
      setError(
        message.includes("fetch") || message.includes("Network")
          ? "Can't reach the recognition server. Try again in a moment."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = [...(event.clipboardData?.items ?? [])].find((entry) =>
        entry.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (file) {
        event.preventDefault();
        void runFile(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [runFile]);

  const startCamera = async () => {
    setError(null);
    setCamera("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamera("live");
    } catch {
      setCamera("blocked");
      setError("Camera access was blocked. You can still upload a photo.");
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopCamera();
        void runFile(new File([blob], "camera.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  };

  const imageW = result?.image.width ?? 1;
  const imageH = result?.image.height ?? 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
      <section className={`hud-panel relative overflow-hidden ${dragOver ? "ring-1 ring-amber-400/70" : ""}`}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void runFile(file);
            event.target.value = "";
          }}
        />

        {camera === "live" || camera === "starting" ? (
          <div className="relative aspect-[4/3] bg-black">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 reticle" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-3 p-4">
              <button type="button" onClick={captureFrame} className="btn-amber">
                Capture plate
              </button>
              <button type="button" onClick={stopCamera} className="btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        ) : preview ? (
          <div className="flex justify-center bg-black">
            <div className="relative inline-block max-h-[70vh] max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Uploaded vehicle" className="block max-h-[70vh] max-w-full" />
            {result?.plates.map((plate, index) => (
              <div
                key={`${plate.text}-${index}`}
                className="pointer-events-none absolute border-2 border-amber-400 shadow-[0_0_18px_rgba(245,197,24,0.35)]"
                style={{
                  left: `${(plate.bbox.x1 / imageW) * 100}%`,
                  top: `${(plate.bbox.y1 / imageH) * 100}%`,
                  width: `${((plate.bbox.x2 - plate.bbox.x1) / imageW) * 100}%`,
                  height: `${((plate.bbox.y2 - plate.bbox.y1) / imageH) * 100}%`,
                }}
              >
                <span className="absolute -top-6 left-0 whitespace-nowrap bg-amber-400 px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-black">
                  {plate.text || "PLATE"}
                </span>
              </div>
            ))}
            {busy ? <div className="scan-beam" /> : null}
            <div className="pointer-events-none absolute inset-0 reticle" />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const file = event.dataTransfer.files[0];
              if (file) void runFile(file);
            }}
            className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 px-6 text-center"
          >
            <div className="reticle-box relative flex h-full min-h-[280px] w-full items-center justify-center">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-400">
                  Drop a photo
                </p>
                <p className="mt-3 max-w-sm text-sm text-zinc-400">
                  JPEG, PNG, or WebP · under 8 MB. Paste from clipboard, or use the camera.
                </p>
              </div>
            </div>
          </button>
        )}
      </section>

      <aside className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="btn-amber">
            Upload photo
          </button>
          <button
            type="button"
            onClick={() => void startCamera()}
            className="btn-ghost"
            disabled={camera === "starting"}
          >
            {camera === "starting" ? "Starting camera…" : "Use camera"}
          </button>
        </div>

        <div className="hud-panel p-4 font-mono text-[11px] leading-6 text-zinc-400">
          <p className="uppercase tracking-[0.22em] text-zinc-500">Telemetry</p>
          <p className="mt-2 text-zinc-300">NODE {API_BASE.replace(/^https?:\/\//, "")}</p>
          {busy ? <p className="text-amber-300">SCANNING…</p> : null}
          {result ? (
            <>
              <p>LATENCY {result.processing_ms.toFixed(0)} ms</p>
              <p>PLATES {result.plates.length}</p>
              <p className="truncate">DET {result.models.detector}</p>
              <p className="truncate">OCR {result.models.ocr}</p>
            </>
          ) : (
            <p className="mt-1 text-zinc-500">Waiting for a frame.</p>
          )}
        </div>

        {error ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        {result && result.plates.length === 0 && !busy ? (
          <p className="hud-panel px-4 py-3 text-sm text-zinc-400">
            No plates found. Try a closer crop, less motion blur, or more light on the plate.
          </p>
        ) : null}

        {result?.plates.map((plate, index) => (
          <PlateResult key={`${plate.text}-${index}`} plate={plate} index={index} />
        ))}
      </aside>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works",
};

const STEPS = [
  {
    n: "01",
    title: "The website stays light",
    body: "This site is a Next.js front end on Vercel. It never loads YOLO or OCR models. It only sends your photo to the Pi and draws the boxes that come back.",
  },
  {
    n: "02",
    title: "The Pi does the heavy lifting",
    body: "A FastAPI service on the Raspberry Pi receives the image at alpr.api.harryludemann.com. One request at a time, CPU ONNX — no TensorRT, no CUDA.",
  },
  {
    n: "03",
    title: "Find the plate",
    body: "YOLOv9-tiny (384) locates licence plate regions. Each box is padded by 5% so characters on the edge still get read.",
  },
  {
    n: "04",
    title: "Read the characters",
    body: "A MobileViT global-plates OCR model reads the crop. EasyOCR and Tesseract from the original test script are skipped here so the Pi stays within RAM.",
  },
  {
    n: "05",
    title: "NZ format cleanup",
    body: "Confused pairs like 0/O, 8/B, and 5/S are swapped and scored against New Zealand plate patterns. Unlike the old tester, this path never looks at a known answer sheet.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-amber-400">Pipeline</p>
      <h1 className="mt-3 text-4xl font-light text-white">How it works</h1>
      <p className="mt-4 text-zinc-400">
        Two machines, one job. The public site is static-ish. The recogniser lives on hardware
        on my desk.
      </p>

      <ol className="mt-10 space-y-4">
        {STEPS.map((step) => (
          <li key={step.n} className="hud-panel p-5">
            <p className="font-mono text-[11px] tracking-[0.22em] text-amber-400">{step.n}</p>
            <h2 className="mt-2 text-lg text-white">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

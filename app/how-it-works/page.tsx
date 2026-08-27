import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works",
};

const STEPS = [
  {
    n: "01",
    title: "Upload a photo",
    body: "The site sends the image to the API and draws the boxes that come back.",
  },
  {
    n: "02",
    title: "Raspberry Pi",
    body: "A service on the Pi handles recognition, one image at a time.",
  },
  {
    n: "03",
    title: "Find the plate",
    body: "A detector locates licence plate regions in the photo.",
  },
  {
    n: "04",
    title: "Read the characters",
    body: "OCR reads the cropped plate and returns the text with a confidence score.",
  },
  {
    n: "05",
    title: "NZ format",
    body: "Common character mix-ups like 0/O and 8/B are checked against New Zealand plate patterns.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-amber-400">Pipeline</p>
      <h1 className="mt-3 text-4xl font-light text-white">How it works</h1>
      <p className="mt-4 text-zinc-400">
        Photos are sent to a Raspberry Pi, which finds plates and reads them.
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

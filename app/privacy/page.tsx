import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-amber-400">Privacy</p>
      <h1 className="mt-3 text-4xl font-light text-white">What happens to photos</h1>
      <div className="mt-8 space-y-4 text-sm leading-7 text-zinc-400">
        <p>
          Images go to the Raspberry Pi at{" "}
          <span className="text-zinc-200">alpr.api.harryludemann.com</span>. They are processed in
          memory and not stored.
        </p>
        <p>
          Uploads are limited to JPEG, PNG, and WebP under 8 MB. Don&apos;t upload photos you
          aren&apos;t comfortable sharing with a public demo.
        </p>
      </div>
    </div>
  );
}

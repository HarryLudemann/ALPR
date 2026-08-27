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
          Images are posted from your browser straight to the Raspberry Pi at{" "}
          <span className="text-zinc-200">alpr.api.harryludemann.com</span>. They do not go through
          Vercel, and they are not written to disk on the Pi. The bytes live in memory for the
          length of one inference, then they are discarded.
        </p>
        <p>
          The API is rate-limited and only accepts JPEG, PNG, and WebP under 8 MB. Do not upload
          photos of other people or plates you are not comfortable sharing with a public demo.
        </p>
        <p>
          This is a personal experiment, not a production surveillance product. No accounts, no
          result history, no analytics baked into the recogniser.
        </p>
      </div>
    </div>
  );
}

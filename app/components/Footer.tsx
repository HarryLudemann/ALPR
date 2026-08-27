import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 mt-auto border-t border-white/8 bg-black/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Raspberry Pi ·{" "}
          <a
            className="text-zinc-300 hover:text-amber-300"
            href="https://alpr.api.harryludemann.com"
            target="_blank"
            rel="noreferrer"
          >
            alpr.api.harryludemann.com
          </a>
        </p>
        <div className="flex gap-4">
          <Link href="/how-it-works" className="hover:text-white">
            How it works
          </Link>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}

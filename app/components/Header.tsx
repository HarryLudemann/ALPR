"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ApiStatus from "./ApiStatus";

const NAV = [
  { href: "/", label: "Scan" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/privacy", label: "Privacy" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="relative z-20 border-b border-white/8 bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="min-w-0">
          <span className="block text-[10px] uppercase tracking-[0.28em] text-amber-400/80">
            Harry Ludemann
          </span>
          <span className="mt-0.5 block font-mono text-lg tracking-[0.18em] text-white">
            ALPR
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-amber-400/15 text-white ring-1 ring-amber-400/35"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <ApiStatus />
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-white/5 px-4 py-2 sm:hidden">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${
                active ? "bg-amber-400/15 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

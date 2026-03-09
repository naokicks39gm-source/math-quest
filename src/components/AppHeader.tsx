"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDDEN_PREFIXES = ["/quest"];
const HIDDEN_EXACT = new Set(["/quest-handwrite-legacy"]);

export default function AppHeader() {
  const pathname = usePathname();

  if (!pathname) {
    return null;
  }

  if (HIDDEN_EXACT.has(pathname) || HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-black tracking-tight text-slate-900">
          Math Quest
        </Link>
        <nav className="flex items-center gap-3 text-sm font-semibold text-slate-700">
          <Link href="/skills" className="rounded-full px-3 py-2 transition hover:bg-slate-100">
            /skills
          </Link>
          <Link href="/review" className="rounded-full px-3 py-2 transition hover:bg-slate-100">
            /review
          </Link>
        </nav>
      </div>
    </header>
  );
}

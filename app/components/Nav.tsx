import Link from "next/link";
import { Logo } from "./Logo";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-ink-950/60 border-b border-white/[0.04]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center" aria-label="CIForge home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-[13px] text-ink-300">
          <Link
            href="#how"
            className="hidden sm:inline-block px-3 py-1.5 rounded-md hover:text-ink-50 transition-colors"
          >
            How it works
          </Link>
          <Link
            href="#anti"
            className="hidden sm:inline-block px-3 py-1.5 rounded-md hover:text-ink-50 transition-colors"
          >
            What it isn&apos;t
          </Link>
          <a
            href="https://github.com/emam07/CI-Forge"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-md hover:text-ink-50 transition-colors"
          >
            GitHub
          </a>
          <a
            href="#install"
            className="ml-2 inline-flex items-center gap-1.5 rounded-md bg-ink-50 text-ink-950 px-3 py-1.5 text-[13px] font-medium hover:bg-white transition-colors"
          >
            Install
          </a>
        </nav>
      </div>
    </header>
  );
}

import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-10">
      <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <Logo />
          <p className="font-mono text-[11.5px] text-ink-400">
            One PR comment. Edited in place. Built honestly.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-300">
          <a
            href="https://github.com/emam07/CI-Forge"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink-50 transition-colors"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}

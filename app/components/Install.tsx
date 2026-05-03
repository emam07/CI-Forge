import { Reveal } from "./Reveal";

export function Install() {
  return (
    <section id="install" className="relative py-24 sm:py-32 border-t border-white/[0.04]">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-[280px] w-[680px] rounded-full bg-accent/[0.08] blur-3xl"
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <span className="font-mono text-[11.5px] tracking-tight text-accent uppercase">
            Install
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-3 text-3xl sm:text-4xl font-medium tracking-tight text-balance gradient-text">
            Add CIForge to a repo. Open a PR. See the comment.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-4 text-ink-300 text-[15.5px] leading-relaxed text-pretty">
            Free during the design-partner phase. Read the{" "}
            <a
              href="/docs"
              className="text-ink-100 underline decoration-white/20 underline-offset-4 hover:decoration-white/60 transition-colors"
            >
              primer
            </a>{" "}
            first if you want the full picture before installing.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com/apps/ciforge-dev"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 rounded-lg bg-ink-50 text-ink-950 px-5 py-3 text-[14.5px] font-medium hover:bg-white transition-all hover:translate-y-[-1px] active:translate-y-0"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2 .37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Install on GitHub
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="transition-transform group-hover:translate-x-0.5"
              >
                <path
                  d="M3 7h8m0 0L7.5 3.5M11 7l-3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <a
              href="https://github.com/emam07/CI-Forge"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-5 py-3 text-[14.5px] text-ink-100 hover:bg-white/[0.04] hover:border-white/[0.12] transition-colors"
            >
              View source
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2 font-mono text-[11.5px] text-ink-300">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
            MVP-1 · Linux runners · GitHub Actions
          </div>
        </Reveal>
      </div>
    </section>
  );
}

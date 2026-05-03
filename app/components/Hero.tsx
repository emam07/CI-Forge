"use client";

import { motion, useReducedMotion } from "motion/react";
import { CommentMock } from "./CommentMock";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }
  }
};

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 grid-bg radial-fade opacity-50"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full bg-accent/[0.10] blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 lg:pt-28 lg:pb-32">
        <motion.div
          variants={stagger}
          initial={reduce ? "show" : "hidden"}
          animate="show"
          className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center"
        >
          <div className="space-y-7">
            <motion.div variants={item}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 font-mono text-[11.5px] tracking-tight text-ink-300">
                <span className="h-1.5 w-1.5 rounded-full bg-warn animate-pulse-soft" />
                CI regression detection · GitHub App
              </span>
            </motion.div>

            <motion.h1
              variants={item}
              className="text-balance text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight leading-[1.04] gradient-text"
            >
              Catch CI rot
              <br />
              before it ships.
            </motion.h1>

            <motion.p
              variants={item}
              className="text-pretty text-ink-300 text-[17px] leading-relaxed max-w-xl"
            >
              A single PR comment when your code makes CI slower — with the{" "}
              <span className="text-ink-100">likely cause</span>, the{" "}
              <span className="text-ink-100">delta</span>, and the{" "}
              <span className="text-ink-100">monthly cost</span>. No dashboard. No notifications. Edited in place on every push.
            </motion.p>

            <motion.p
              variants={item}
              className="text-pretty text-ink-400 text-[14.5px] leading-relaxed max-w-xl"
            >
              <span className="text-ink-200">Runner-neutral by design.</span>{" "}
              GitHub-hosted, self-hosted, Depot, Buildjet — we see all of them in one place. Runner companies only see their own.
            </motion.p>

            <motion.div variants={item} className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="#install"
                className="group inline-flex items-center gap-2 rounded-lg bg-ink-50 text-ink-950 px-4 py-2.5 text-[14px] font-medium hover:bg-white transition-all hover:translate-y-[-1px] active:translate-y-0"
              >
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
                href="#how"
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-[14px] text-ink-100 hover:bg-white/[0.04] hover:border-white/[0.12] transition-colors"
              >
                See how it works
              </a>
            </motion.div>

            <motion.div
              variants={item}
              className="flex items-center gap-6 pt-4 text-[12px] font-mono text-ink-400"
            >
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-success" />
                One comment per PR
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-success" />
                Edited in place
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-success" />
                Runner-neutral
              </span>
            </motion.div>
          </div>

          <motion.div variants={item} className="lg:pl-4">
            <CommentMock />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

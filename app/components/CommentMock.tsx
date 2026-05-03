"use client";

import { motion, useReducedMotion } from "motion/react";

export function CommentMock() {
  const reduce = useReducedMotion();
  const t = (delay: number) =>
    reduce
      ? { duration: 0 }
      : { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
      <div className="relative rounded-2xl bg-ink-900/80 hairline overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-warn animate-pulse-soft" />
            <span className="font-mono text-[11px] tracking-tight text-ink-300">
              ciforge[bot]
            </span>
            <span className="text-[11px] text-ink-400">commented just now</span>
          </div>
          <span className="font-mono text-[11px] text-ink-400">PR #42</span>
        </div>

        <div className="p-5 space-y-4 font-sans text-[14px] leading-relaxed text-ink-100">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={t(0.2)}
            className="text-balance"
          >
            <span className="inline-flex items-center gap-2 font-medium">
              <span className="text-warn">⚠</span>
              <span>
                <span className="font-semibold">CI Δ +3m12s (+22%)</span>{" "}
                <span className="text-ink-300">
                  vs <code className="font-mono text-[12.5px]">main</code>{" "}
                  baseline
                </span>
              </span>
            </span>
            <span className="block text-ink-400 text-[12.5px] mt-0.5">
              median of last 20 runs
            </span>
          </motion.p>

          <motion.ul
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={t(0.35)}
            className="space-y-1.5 text-[13.5px]"
          >
            <li className="text-ink-200">
              <span className="text-ink-400">·</span>{" "}
              <code className="font-mono text-[12.5px]">test-integration</code>{" "}
              <code className="font-mono text-[12.5px] text-ink-400">(shard 4)</code>:{" "}
              <span className="font-semibold text-warn">+1m40s</span>
              <span className="block pl-4 text-ink-400 text-[12.5px]">
                likely cause: new dep{" "}
                <code className="font-mono">selenium-stealth</code> in{" "}
                <code className="font-mono">package-lock.json</code>
              </span>
            </li>
            <li className="text-ink-200 pt-1">
              <span className="text-ink-400">·</span>{" "}
              <code className="font-mono text-[12.5px]">web/Dockerfile</code> build:{" "}
              <span className="font-semibold text-warn">+58s</span>
              <span className="block pl-4 text-ink-400 text-[12.5px]">
                likely cause: cache miss starting at line 14 (
                <code className="font-mono">ARG BUILD_SHA</code>)
              </span>
            </li>
            <li className="text-ink-200 pt-1">
              <span className="text-ink-400">·</span>{" "}
              <code className="font-mono text-[12.5px]">lint</code> ran on a docs-only change
              <span className="block pl-4 text-ink-400 text-[12.5px]">
                consider <code className="font-mono">paths-ignore</code>
              </span>
            </li>
          </motion.ul>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={t(0.5)}
            className="border-l-2 border-white/[0.08] pl-3 text-ink-300 text-[12.5px] italic"
          >
            Estimated cost impact if merged: +$87/mo at this repo&apos;s current push frequency.
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={t(0.65)}
            className="pt-1 text-[11.5px] text-ink-400 font-mono"
          >
            CIForge · 3 workflows · 14 jobs compared
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

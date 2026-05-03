import { Reveal } from "./Reveal";

const pillars = [
  {
    eyebrow: "Block A",
    title: "Headline Δ",
    body: "Compared against a 20-run median on your base branch. Both absolute (≥30s) and relative (≥10%) thresholds must trigger — silence wins ties.",
    code: "⚠ CI Δ +3m12s (+22%)"
  },
  {
    eyebrow: "Block B",
    title: "Cause attribution",
    body: "Six rules in priority order: runner change, matrix expansion, dep change, Docker cache miss, new tests, setup bloat. We say “unknown” instead of guessing.",
    code: "likely cause: matrix expanded +2"
  },
  {
    eyebrow: "Block C",
    title: "Static observations",
    body: "Two checks. Heavy CI on a docs-only PR. macOS runner used for steps that don’t need macOS. Cheap real estate, actionable suggestions.",
    code: "› docs-only · consider paths-ignore"
  },
  {
    eyebrow: "Block D",
    title: "Cost line",
    body: "Estimated $/month at your push frequency. Hidden if history < 7 days or pushes < 1/day — never quote a number you can’t defend.",
    code: "+$87/mo · estimated"
  }
];

export function Pillars() {
  return (
    <section className="relative py-24 sm:py-32 border-t border-white/[0.04]">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="max-w-2xl">
            <span className="font-mono text-[11.5px] tracking-tight text-accent uppercase">
              The artifact
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-medium tracking-tight text-balance gradient-text">
              Four blocks. One comment. Every push.
            </h2>
            <p className="mt-4 text-ink-300 text-[15.5px] leading-relaxed text-pretty">
              The PR comment is the product. It renders only what helps a reviewer make the next decision — and nothing else.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 gap-px bg-white/[0.04] rounded-2xl overflow-hidden hairline">
          {pillars.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.05}>
              <div className="group relative bg-ink-950 p-7 sm:p-8 h-full transition-colors hover:bg-ink-900/60">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] tracking-tight text-ink-400 uppercase">
                    {p.eyebrow}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-accent/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="mt-2 text-[19px] font-medium tracking-tight text-ink-50">
                  {p.title}
                </h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-300 text-pretty">
                  {p.body}
                </p>
                <div className="mt-5 inline-flex items-center rounded-md border border-white/[0.06] bg-white/[0.015] px-2.5 py-1 font-mono text-[12px] text-ink-200">
                  {p.code}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

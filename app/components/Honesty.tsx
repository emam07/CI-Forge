import { Reveal } from "./Reveal";

const rows = [
  ["Median, not mean", "CI distributions are heavy-tailed. Mean would chase outliers. Median ignores up to half of them."],
  ["Two thresholds, ANDed", "≥30s AND ≥10%. Headlines need both. A 30s slowdown on a 10-minute baseline is 5% — within noise. No alert."],
  ["Noisy baselines widen", "If IQR/median > 0.5 on any job, headline thresholds widen to 60s/15%. Flaky pipelines don’t cry wolf."],
  ["Strip ephemeral runner names", "GitHub assigns a fresh runner ID per job. We use the static runs-on label so runner-change fires only on real config changes."],
  ["Runner-neutral observation", "GitHub-hosted, self-hosted, Depot, Buildjet — we record them all and compare like-for-like. Runner vendors only see their own; we see the whole pipeline, including the bottleneck shifts between them."],
  ["Reset baseline on workflow edits", "When the workflow YAML changes, the baseline resets to a calibrating window. Otherwise every legitimate CI tweak becomes a false positive forever."],
  ["Dedupe push + pull_request", "Both events fire on a PR branch. Without dedupe, every PR would look 100% slower. We pick the pull_request event."],
  ["Fall back to “unknown”", "If no rule fires confidently, we say so. A wrong attribution costs more trust than a missing one."]
];

export function Honesty() {
  return (
    <section className="relative py-24 sm:py-32 border-t border-white/[0.04]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-16">
          <Reveal>
            <div>
              <span className="font-mono text-[11.5px] tracking-tight text-accent uppercase">
                Defensive engineering
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-medium tracking-tight text-balance gradient-text">
                The work isn&apos;t the math.
                <br />
                It&apos;s the false positives.
              </h2>
              <p className="mt-5 text-ink-300 text-[15.5px] leading-relaxed text-pretty">
                If a CI bot cries wolf three times, the engineer dismisses everything from it forever. So the algorithm is conservative on purpose — it would rather be quiet than wrong.
              </p>
              <p className="mt-4 text-ink-400 text-[14px] leading-relaxed text-pretty">
                Every line below is a defense against a specific way the comment could lose your trust.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-2xl hairline overflow-hidden">
              {rows.map(([label, body], i) => (
                <div
                  key={label}
                  className={`flex items-start gap-5 px-6 py-5 bg-ink-950 ${
                    i !== rows.length - 1 ? "border-b border-white/[0.04]" : ""
                  } hover:bg-ink-900/40 transition-colors`}
                >
                  <div className="font-mono text-[11px] text-ink-400 mt-0.5 w-7 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-medium tracking-tight text-ink-50">
                      {label}
                    </div>
                    <div className="mt-1 text-[13.5px] leading-relaxed text-ink-300 text-pretty">
                      {body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

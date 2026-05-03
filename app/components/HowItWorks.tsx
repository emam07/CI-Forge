import { Reveal } from "./Reveal";

const steps = [
  {
    n: "01",
    title: "Install the app",
    body: "One click on GitHub. We listen to workflow_run, workflow_job, and pull_request events for the repos you select.",
    detail: "No agent · no SDK · no YAML changes"
  },
  {
    n: "02",
    title: "We baseline",
    body: "Last 20 successful runs of each workflow on your base branch, per (job, matrix shard). Median, not mean — flaky outliers don’t move the line.",
    detail: "Warming up after 5 runs · widens on noisy baselines"
  },
  {
    n: "03",
    title: "PR comment",
    body: "On every push to a PR, we recompute Δ, attribute the cause, estimate the cost, and edit the existing comment in place. Latency target: under 30 seconds.",
    detail: "One comment · marker-keyed · never threaded"
  }
];

export function HowItWorks() {
  return (
    <section
      id="how"
      className="relative py-24 sm:py-32 border-t border-white/[0.04]"
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="max-w-2xl">
            <span className="font-mono text-[11.5px] tracking-tight text-accent uppercase">
              How it works
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-medium tracking-tight text-balance gradient-text">
              Webhook in. Comment out.
            </h2>
            <p className="mt-4 text-ink-300 text-[15.5px] leading-relaxed text-pretty">
              Three things between your push and the comment. Postgres for everything. No Redis, no separate queue, no analytics warehouse.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 relative">
          <div
            aria-hidden
            className="hidden md:block absolute left-0 right-0 top-9 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
          />
          <div className="grid md:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden hairline relative">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="relative bg-ink-950 p-7 sm:p-8 h-full">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] font-mono text-[11.5px] text-accent">
                      {s.n}
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
                  </div>
                  <h3 className="mt-5 text-[19px] font-medium tracking-tight">
                    {s.title}
                  </h3>
                  <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-300 text-pretty">
                    {s.body}
                  </p>
                  <p className="mt-5 font-mono text-[11.5px] text-ink-400 tracking-tight">
                    {s.detail}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

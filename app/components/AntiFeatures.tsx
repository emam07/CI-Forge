import { Reveal } from "./Reveal";

const items = [
  {
    title: "No dashboard",
    body: "The PR is the surface. If a reviewer has to click somewhere else, the signal is in the wrong place."
  },
  {
    title: "No flaky-test detection",
    body: "Different problem, saturated market. Trunk and BuildPulse are good at this; we don’t compete."
  },
  {
    title: "No notifications",
    body: "No Slack, no email, no digest. The PR comment is the only artifact."
  },
  {
    title: "No setup beyond install",
    body: "No SDK, no YAML changes, no bundled runner. We listen to the events GitHub already emits."
  },
  {
    title: "No paywall on detection",
    body: "If we can’t make the comment good, no amount of pricing-page polish saves the product."
  },
  {
    title: "No fake numbers",
    body: "The cost line hides under thin history. We never quote a $/month figure we can’t defend."
  }
];

export function AntiFeatures() {
  return (
    <section
      id="anti"
      className="relative py-24 sm:py-32 border-t border-white/[0.04]"
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="max-w-2xl">
            <span className="font-mono text-[11.5px] tracking-tight text-accent uppercase">
              What it isn&apos;t
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-medium tracking-tight text-balance gradient-text">
              The discipline is in what we left out.
            </h2>
            <p className="mt-4 text-ink-300 text-[15.5px] leading-relaxed text-pretty">
              Most CI tools become noisy because they keep saying yes. CIForge is opinionated about scope — every feature on this page is one we deliberately rejected.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden hairline">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={(i % 3) * 0.05}>
              <div className="bg-ink-950 p-6 sm:p-7 h-full">
                <div className="flex items-center gap-2 text-ink-400">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M3.5 3.5l7 7M10.5 3.5l-7 7"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="font-mono text-[11px] uppercase tracking-tight">
                    Out of scope
                  </span>
                </div>
                <h3 className="mt-3 text-[16.5px] font-medium tracking-tight text-ink-50">
                  {item.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-300 text-pretty">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

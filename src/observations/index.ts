import type { Observation, ObservationContext, Observer } from "./types";
import { docsOnlyObserver } from "./docs-only";
import { runnerMismatchObserver } from "./runner-mismatch";

const OBSERVERS: Observer[] = [docsOnlyObserver, runnerMismatchObserver];
const MAX_OBSERVATIONS = 2;

export function observe(ctx: ObservationContext): Observation[] {
  const out: Observation[] = [];
  for (const o of OBSERVERS) {
    try {
      const r = o(ctx);
      if (r) out.push(r);
      if (out.length >= MAX_OBSERVATIONS) break;
    } catch (err) {
      console.error(`[observation] ${o.name} threw`, err);
    }
  }
  return out;
}

export type { Observation, ObservationContext };

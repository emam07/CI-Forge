import type { ChangedFile, PrJobSnapshot } from "@/rules/types";

export interface ObservationContext {
  changedFiles: ChangedFile[];
  prJobs: PrJobSnapshot[];
}

export interface Observation {
  code: string;
  text: string;
}

export type Observer = (ctx: ObservationContext) => Observation | null;

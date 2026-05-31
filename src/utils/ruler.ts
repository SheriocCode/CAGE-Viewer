import type { RulerAxis } from "../types/ruler";

export const AXIS_LABELS: Record<RulerAxis, string> = { x: "X", y: "Y", z: "Z" };

export const RULER_MAX_TICKS = 16;

export const chooseNiceStep = (range: number, targetTicks = 8) => {
  if (!Number.isFinite(range) || range <= 0) return 1;
  const rough = range / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
};

export const formatRulerValue = (value: number, step: number) => {
  const decimals = Math.max(0, Math.min(4, Math.ceil(-Math.log10(step)) + 1));
  const normalized = Math.abs(value) < step * 0.0001 ? 0 : value;
  return normalized.toFixed(decimals);
};

export const expandRange = (min: number, max: number, padRatio = 0.08) => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: -10, max: 10 };
  if (min === max) return { min: min - 1, max: max + 1 };
  const pad = Math.max((max - min) * padRatio, 0.5);
  return { min: min - pad, max: max + pad };
};

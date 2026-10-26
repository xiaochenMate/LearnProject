export interface WaveConfig {
  amplitude: number;
  frequency: number;
  phase: number;
}
export type WaveExperiment = "constructive" | "destructive" | "beats";
export const DEFAULT_WAVES: [WaveConfig, WaveConfig] = [
  { amplitude: 1, frequency: 1, phase: 0 },
  { amplitude: 1, frequency: 1, phase: 90 },
];
export function phaseDifference(a: number, b: number) {
  const difference = (((a - b) % 360) + 360) % 360;
  return Math.min(difference, 360 - difference);
}
export function sampleWave(wave: WaveConfig, x: number, time: number) {
  return (
    wave.amplitude *
    Math.sin(
      x - 2 * Math.PI * wave.frequency * time + (wave.phase * Math.PI) / 180,
    )
  );
}
export function resultantAmplitude(a: WaveConfig, b: WaveConfig) {
  if (Math.abs(a.frequency - b.frequency) > 0.001) return null;
  return Math.sqrt(
    Math.max(
      0,
      a.amplitude ** 2 +
        b.amplitude ** 2 +
        2 *
          a.amplitude *
          b.amplitude *
          Math.cos(((a.phase - b.phase) * Math.PI) / 180),
    ),
  );
}
export function verifyWaveExperiment(
  kind: WaveExperiment,
  a: WaveConfig,
  b: WaveConfig,
) {
  if (a.amplitude < 0.1 || b.amplitude < 0.1) return false;
  const equalFrequency = Math.abs(a.frequency - b.frequency) < 0.001;
  if (kind === "beats")
    return !equalFrequency && Math.abs(a.frequency - b.frequency) <= 0.5;
  const phase = phaseDifference(a.phase, b.phase);
  return (
    equalFrequency &&
    Math.abs(a.amplitude - b.amplitude) < 0.001 &&
    (kind === "constructive" ? phase <= 1 : phase >= 179)
  );
}
export function normalizeWaves(value: unknown): [WaveConfig, WaveConfig] {
  if (!Array.isArray(value) || value.length !== 2)
    return DEFAULT_WAVES.map((item) => ({ ...item })) as [
      WaveConfig,
      WaveConfig,
    ];
  return value.map((item) => ({
    amplitude:
      typeof item?.amplitude === "number" && Number.isFinite(item.amplitude)
        ? Math.max(0, Math.min(2, item.amplitude))
        : 1,
    frequency:
      typeof item?.frequency === "number" && Number.isFinite(item.frequency)
        ? Math.max(0.2, Math.min(3, item.frequency))
        : 1,
    phase:
      typeof item?.phase === "number" && Number.isFinite(item.phase)
        ? Math.max(0, Math.min(360, item.phase))
        : 0,
  })) as [WaveConfig, WaveConfig];
}

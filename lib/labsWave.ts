import {
  DEFAULT_WAVES,
  normalizeWaves,
  sampleWave,
  type WaveConfig,
  type WaveExperiment,
} from "./wavePhysics";
import { finiteBetween } from "./labsCommon";

export const WAVE_TASKS: {
  id: WaveExperiment;
  title: string;
  question: string;
  explanation: string;
}[] = [
  {
    id: "constructive",
    title: "同相增强",
    question: "用两个非零、等振幅同频波，得到两倍振幅。",
    explanation: "同相时，合成振幅等于两个振幅之和。",
  },
  {
    id: "destructive",
    title: "完全相消",
    question: "保留两个非零波源，让合成位移处处为零。",
    explanation: "等振幅同频波相差 180° 时，理想线性模型中处处相消。",
  },
  {
    id: "beats",
    title: "发现拍频",
    question: "把频率差调至大于 0、不超过 0.5 Hz，比较定点随时间的变化。",
    explanation: "频率接近时，振幅周期性增强减弱；拍频为两源频率之差。",
  },
];
export const WAVE_PRESETS: {
  id: string;
  title: string;
  waves: [WaveConfig, WaveConfig];
}[] = [
  { id: "free", title: "自由探索", waves: normalizeWaves(DEFAULT_WAVES) },
  {
    id: "same",
    title: "同相双源",
    waves: [
      { amplitude: 1, frequency: 1, phase: 0 },
      { amplitude: 1, frequency: 1, phase: 0 },
    ],
  },
  {
    id: "cancel",
    title: "相消双源",
    waves: [
      { amplitude: 1, frequency: 1, phase: 0 },
      { amplitude: 1, frequency: 1, phase: 180 },
    ],
  },
  {
    id: "beat",
    title: "缓慢拍动",
    waves: [
      { amplitude: 1, frequency: 1, phase: 0 },
      { amplitude: 1, frequency: 1.2, phase: 0 },
    ],
  },
  {
    id: "unequal",
    title: "不等振幅相消",
    waves: [
      { amplitude: 1.5, frequency: 1, phase: 0 },
      { amplitude: 0.7, frequency: 1, phase: 180 },
    ],
  },
];
export type WaveView = "space" | "time";
export function validWaves(value: unknown): value is [WaveConfig, WaveConfig] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(
      (w) =>
        w &&
        finiteBetween(w.amplitude, 0, 2) &&
        finiteBetween(w.frequency, 0.2, 3) &&
        finiteBetween(w.phase, 0, 360),
    )
  );
}
export function sampleWaveTrace(
  waves: [WaveConfig, WaveConfig],
  view: WaveView,
  time: number,
  probe: number,
  count = 600,
) {
  const duration = view === "space" ? Math.PI * 6 : 12;
  return Array.from({ length: count + 1 }, (_, i) => {
    const axis = (i / count) * duration;
    const t = view === "time" ? time + axis : time;
    const x = view === "space" ? axis : probe;
    const a = sampleWave(waves[0], x, t),
      b = sampleWave(waves[1], x, t);
    return { axis: view === "time" ? t : axis, a, b, sum: a + b };
  });
}
export interface WaveRecord {
  id: string;
  at: string;
  waves: [WaveConfig, WaveConfig];
  time: number;
  task: WaveExperiment;
  verified: boolean;
  note: string;
  view?: WaveView;
  probe?: number;
  speed?: number;
}
export function validWaveRecords(value: unknown): value is WaveRecord[] {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every(
      (r) =>
        r &&
        typeof r.id === "string" &&
        typeof r.at === "string" &&
        Number.isFinite(Date.parse(r.at)) &&
        validWaves(r.waves) &&
        finiteBetween(r.time, 0, 3600) &&
        WAVE_TASKS.some((t) => t.id === r.task) &&
        typeof r.verified === "boolean" &&
        typeof r.note === "string" &&
        r.note.length <= 200 &&
        (r.view === undefined || ["space", "time"].includes(r.view)) &&
        (r.probe === undefined || finiteBetween(r.probe, 0, Math.PI * 6)) &&
        (r.speed === undefined || [0.25, 0.5, 1, 2].includes(r.speed)),
    )
  );
}

import { ORGANISMS, normalizeFoodChain, validateFoodChain } from "./ecology";
import { escapeXml, finiteBetween } from "./labsCommon";

export type Habitat = "meadow" | "pond";
export interface LabSpecies {
  id: string;
  name: string;
  role: string;
  habitat: Habitat;
  kind: "plant" | "bug" | "frog" | "snake" | "bird" | "mammal" | "fish";
  predators: string[];
}
const meadowEdges: Record<string, string[]> = {
  grass: ["locust", "rabbit"],
  locust: ["frog"],
  rabbit: ["snake", "eagle", "wolf"],
  frog: ["snake", "eagle"],
  snake: ["eagle"],
  wolf: [],
  eagle: [],
};
export const SPECIES: LabSpecies[] = [
  ...ORGANISMS.map((o) => ({
    id: o.id,
    name: o.name,
    role: o.role,
    habitat: "meadow" as const,
    kind: (o.id === "grass"
      ? "plant"
      : o.id === "locust"
        ? "bug"
        : o.id === "frog"
          ? "frog"
          : o.id === "snake"
            ? "snake"
            : o.id === "eagle"
              ? "bird"
              : "mammal") as LabSpecies["kind"],
    predators: meadowEdges[o.id],
  })),
  {
    id: "algae",
    name: "浮游藻类",
    role: "生产者",
    habitat: "pond",
    kind: "plant",
    predators: ["zooplankton"],
  },
  {
    id: "zooplankton",
    name: "浮游动物",
    role: "初级消费者",
    habitat: "pond",
    kind: "bug",
    predators: ["smallfish"],
  },
  {
    id: "smallfish",
    name: "小型鱼",
    role: "消费者",
    habitat: "pond",
    kind: "fish",
    predators: ["bass", "heron"],
  },
  {
    id: "bass",
    name: "鲈鱼",
    role: "捕食者",
    habitat: "pond",
    kind: "fish",
    predators: ["heron"],
  },
  {
    id: "heron",
    name: "鹭",
    role: "捕食者",
    habitat: "pond",
    kind: "bird",
    predators: [],
  },
];
export const SPECIES_BY_ID = new Map(SPECIES.map((s) => [s.id, s]));
export const ECO_PRESETS = [
  {
    id: "meadow-short",
    title: "草地 · 三级",
    habitat: "meadow" as const,
    chain: ["grass", "rabbit", "wolf"],
  },
  {
    id: "meadow-long",
    title: "草地 · 五级",
    habitat: "meadow" as const,
    chain: ["grass", "locust", "frog", "snake", "eagle"],
  },
  {
    id: "pond-short",
    title: "池塘 · 四级",
    habitat: "pond" as const,
    chain: ["algae", "zooplankton", "smallfish", "heron"],
  },
  {
    id: "pond-long",
    title: "池塘 · 五级",
    habitat: "pond" as const,
    chain: ["algae", "zooplankton", "smallfish", "bass", "heron"],
  },
];
export function checkTopology(chain: string[], habitat: Habitat) {
  if (!chain.length) return "从生产者开始。";
  if (chain.length > 6 || new Set(chain).size !== chain.length)
    return "同一物种只出现一次，最多六级。";
  if (chain.some((id) => SPECIES_BY_ID.get(id)?.habitat !== habitat))
    return "当前链中含有未知或不同生境的成员。";
  if (chain[0] !== (habitat === "meadow" ? "grass" : "algae"))
    return "能量链必须从生产者开始。";
  for (let i = 1; i < chain.length; i++) {
    if (!SPECIES_BY_ID.get(chain[i - 1])!.predators.includes(chain[i]))
      return `${SPECIES_BY_ID.get(chain[i])!.name}不能接在${SPECIES_BY_ID.get(chain[i - 1])!.name}之后。`;
  }
  return "";
}
export function validateLabChain(chain: string[], habitat: Habitat) {
  const issue = checkTopology(chain, habitat);
  if (issue) return { valid: false, message: issue };
  return habitat === "meadow"
    ? validateFoodChain(chain)
    : {
        valid: chain.length >= 3,
        message:
          chain.length < 3
            ? "至少连接三个营养级。"
            : "示例捕食关系成立，箭头从食物指向摄食者。",
      };
}
export function nextSpecies(chain: string[], habitat: Habitat) {
  if (checkTopology(chain, habitat) && chain.length) return [];
  const ids = chain.length
    ? SPECIES_BY_ID.get(chain[chain.length - 1])!.predators
    : [habitat === "meadow" ? "grass" : "algae"];
  return SPECIES.filter((s) => ids.includes(s.id) && !chain.includes(s.id));
}
export function energyLevels(
  chain: string[],
  initial: number,
  efficiency: number,
) {
  if (!finiteBetween(initial, 1, 1e6) || !finiteBetween(efficiency, 0.01, 0.5))
    throw new Error("能量参数超出模型范围");
  return chain.map((id, i) => ({
    id,
    level: i + 1,
    energy: initial * efficiency ** i,
    transferred: i < chain.length - 1 ? initial * efficiency ** (i + 1) : 0,
    untransferred:
      i < chain.length - 1 ? initial * efficiency ** i * (1 - efficiency) : 0,
  }));
}

export function ecologyChartSvg(state: EcoState) {
  if (checkTopology(state.chain, state.habitat))
    throw new Error("食物链尚未成立");
  const rows = energyLevels(state.chain, state.initial, state.efficiency);
  const removedIndex = state.removed ? state.chain.indexOf(state.removed) : -1;
  const height = 220 + rows.length * 65;
  const note = `教学模型；统一效率 ${(state.efficiency * 100).toFixed(0)}%；初始 ${state.initial} kJ；移除 ${state.removed ? SPECIES_BY_ID.get(state.removed)!.name : "无"}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="${height}"><rect width="100%" height="100%" fill="#0c1014"/><g font-family="sans-serif" fill="#e8eef3"><text x="45" y="45" font-size="24">生态能量预算 / kJ</text><text x="45" y="80" font-size="13">${escapeXml(note)}</text>${rows
    .map((row, i) => {
      const energy = removedIndex >= 0 && i >= removedIndex ? 0 : row.energy;
      return `<text x="45" y="${132 + i * 65}" font-size="15">${escapeXml(SPECIES_BY_ID.get(row.id)!.name)}</text><rect x="190" y="${110 + i * 65}" width="${(row.energy / state.initial) * 640}" height="30" fill="#a0e7cc" opacity="0.15"/><rect x="190" y="${110 + i * 65}" width="${(energy / state.initial) * 640}" height="30" fill="#a0e7cc"/><text x="850" y="${132 + i * 65}" font-size="14">${energy.toPrecision(4)} kJ</text>`;
    })
    .join(
      "",
    )}<text x="45" y="${165 + rows.length * 65}" font-size="12">条长为当前情景能量；淡色为未移除基线。线性比例，并非数量或实测值。</text></g></svg>`;
}
export interface EcoState {
  habitat: Habitat;
  chain: string[];
  initial: number;
  efficiency: number;
  target: number;
  removed: string | null;
}
export function legacyEcoState(value: unknown): EcoState {
  return {
    habitat: "meadow",
    chain: normalizeFoodChain(value),
    initial: 10000,
    efficiency: 0.1,
    target: 1,
    removed: null,
  };
}
export function initialEcoState(
  storage: { getItem(key: string): string | null } | null,
): EcoState {
  const fallback = legacyEcoState(null);
  if (!storage) return fallback;
  try {
    const current = storage.getItem("exbeam.ecology.lab.v1");
    const legacy = storage.getItem("exbeam.ecology.v2");
    if (current !== null) {
      const parsed: unknown = JSON.parse(current);
      return validEcoState(parsed) ? parsed : fallback;
    }
    if (legacy !== null) return legacyEcoState(JSON.parse(legacy));
    return { ...fallback, chain: [...ECO_PRESETS[0].chain] };
  } catch {
    return fallback;
  }
}
export function validEcoState(v: unknown): v is EcoState {
  const s = v as EcoState;
  return (
    !!s &&
    ["meadow", "pond"].includes(s.habitat) &&
    Array.isArray(s.chain) &&
    s.chain.length <= 6 &&
    s.chain.every((id) => SPECIES_BY_ID.has(id)) &&
    new Set(s.chain).size === s.chain.length &&
    finiteBetween(s.initial, 100, 1e6) &&
    finiteBetween(s.efficiency, 0.05, 0.2) &&
    finiteBetween(s.target, 0.1, 1000) &&
    (s.removed === null || s.chain.includes(s.removed))
  );
}
export interface EcoRecord {
  id: string;
  at: string;
  state: EcoState;
  task: string;
  note: string;
}
export function validEcoRecords(v: unknown): v is EcoRecord[] {
  return (
    Array.isArray(v) &&
    v.length <= 100 &&
    v.every(
      (r) =>
        r &&
        typeof r.id === "string" &&
        typeof r.at === "string" &&
        Number.isFinite(Date.parse(r.at)) &&
        validEcoState(r.state) &&
        typeof r.task === "string" &&
        typeof r.note === "string" &&
        r.note.length <= 200,
    )
  );
}

import { EXPERIENCE_BY_ID } from "./experienceCatalog";

export const EXPLORER_STORAGE_KEY = "exbeam.explorer.v2";
export type EvidenceKind =
  | "note"
  | "observation"
  | "experiment"
  | "challenge"
  | "artwork";
export interface ExperienceEvidence {
  key: string;
  kind: EvidenceKind;
  title: string;
  detail: string;
}
export interface Discovery extends ExperienceEvidence {
  id: string;
  moduleId: string;
  createdAt: string;
}
export interface ExplorationSession {
  id: string;
  moduleId: string;
  startedAt: string;
  seconds: number;
}
export interface ExplorerStore {
  version: 2;
  saved: string[];
  sessions: ExplorationSession[];
  discoveries: Discovery[];
  drafts: Record<string, string>;
  reducedMotion: boolean;
}
type StorageReader = Pick<Storage, "getItem">;
const kinds = new Set([
  "note",
  "observation",
  "experiment",
  "challenge",
  "artwork",
]);
const validId = (id: unknown): id is string =>
  typeof id === "string" && EXPERIENCE_BY_ID.has(id);
const validDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const unique = <T extends { id: string }>(items: T[]) => [
  ...new Map(items.map((item) => [item.id, item])).values(),
];
export const emptyExplorerStore = (): ExplorerStore => ({
  version: 2,
  saved: [],
  sessions: [],
  discoveries: [],
  drafts: {},
  reducedMotion: false,
});

export function normalizeExplorerStore(value: unknown): ExplorerStore {
  if (
    !value ||
    typeof value !== "object" ||
    (value as ExplorerStore).version !== 2
  )
    return emptyExplorerStore();
  const source = value as ExplorerStore;
  const text = (input: unknown, length: number) =>
    typeof input === "string" ? input.slice(0, length) : "";
  return {
    version: 2,
    saved: Array.isArray(source.saved)
      ? [...new Set(source.saved.filter(validId))]
      : [],
    sessions: Array.isArray(source.sessions)
      ? unique(
          source.sessions
            .filter(
              (item) =>
                item &&
                validId(item.moduleId) &&
                typeof item.id === "string" &&
                validDate(item.startedAt) &&
                Number.isFinite(item.seconds) &&
                item.seconds >= 0,
            )
            .map((item) => ({
              id: text(item.id, 100),
              moduleId: item.moduleId,
              startedAt: item.startedAt,
              seconds: Math.min(86400, Math.floor(item.seconds)),
            })),
        ).slice(0, 1000)
      : [],
    discoveries: Array.isArray(source.discoveries)
      ? unique(
          source.discoveries
            .filter(
              (item) =>
                item &&
                validId(item.moduleId) &&
                typeof item.id === "string" &&
                typeof item.key === "string" &&
                kinds.has(item.kind) &&
                typeof item.title === "string" &&
                validDate(item.createdAt),
            )
            .map((item) => ({
              id: text(item.id, 100),
              key: text(item.key, 200),
              moduleId: item.moduleId,
              kind: item.kind,
              title: text(item.title, 120),
              detail: text(item.detail, 2000),
              createdAt: item.createdAt,
            })),
        )
      : [],
    drafts:
      source.drafts &&
      typeof source.drafts === "object" &&
      !Array.isArray(source.drafts)
        ? Object.fromEntries(
            Object.entries(source.drafts)
              .filter(([id, note]) => validId(id) && typeof note === "string")
              .map(([id, note]) => [id, text(note, 2000)]),
          )
        : {},
    reducedMotion: source.reducedMotion === true,
  };
}

export function readExplorerStore(storage?: StorageReader): ExplorerStore {
  try {
    const target = storage || window.localStorage;
    const stored = target.getItem(EXPLORER_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.version === 2) return normalizeExplorerStore(parsed);
      } catch {
        /* Keep legacy migration available when a newer record is damaged. */
      }
    }
    const result = emptyExplorerStore();
    const parse = (key: string) => {
      try {
        return JSON.parse(target.getItem(key) || "null");
      } catch {
        return null;
      }
    };
    const saved = parse("exbeam.saved.v1") || parse("zst_saved_v2");
    result.saved = Array.isArray(saved) ? saved.filter(validId) : [];
    const usage = parse("exbeam.usage.v1");
    if (usage && typeof usage === "object") {
      for (const [moduleId, entry] of Object.entries(usage) as [
        string,
        any,
      ][]) {
        if (!validId(moduleId) || !entry || !validDate(entry.lastOpened))
          continue;
        const sessions =
          Array.isArray(entry.sessions) && entry.sessions.length
            ? entry.sessions
            : [
                {
                  startedAt: entry.lastOpened,
                  seconds: entry.totalSeconds || 0,
                },
              ];
        sessions.forEach((session: any, index: number) => {
          if (
            !session ||
            !validDate(session.startedAt) ||
            !Number.isFinite(session.seconds)
          )
            return;
          result.sessions.push({
            id: `legacy-${moduleId}-${index}`,
            moduleId,
            startedAt: session.startedAt,
            seconds: session.seconds,
          });
        });
      }
    }
    result.sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return normalizeExplorerStore(result);
  } catch {
    return emptyExplorerStore();
  }
}

export function writeExplorerStore(
  store: ExplorerStore,
  storage?: Pick<Storage, "setItem"> & Partial<Pick<Storage, "getItem">>,
): boolean {
  try {
    const target = storage || window.localStorage;
    const raw = target.getItem?.(EXPLORER_STORAGE_KEY);
    if (raw) {
      let damaged = false;
      try {
        damaged = JSON.parse(raw)?.version !== 2;
      } catch {
        damaged = true;
      }
      if (damaged) target.setItem(`${EXPLORER_STORAGE_KEY}.recovery`, raw);
    }
    target.setItem(EXPLORER_STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function addDiscovery(
  store: ExplorerStore,
  item: Discovery,
): ExplorerStore {
  const previous = store.discoveries.find(
    (entry) => entry.moduleId === item.moduleId && entry.key === item.key,
  );
  if (previous?.title === item.title && previous.detail === item.detail)
    return store;
  return {
    ...store,
    discoveries: [
      { ...item, id: previous?.id || item.id },
      ...store.discoveries.filter((entry) => entry.id !== previous?.id),
    ],
  };
}

export function mergeExplorerStores(
  current: ExplorerStore,
  incoming: ExplorerStore,
): ExplorerStore {
  const sessions = new Map(current.sessions.map((item) => [item.id, item]));
  for (const item of incoming.sessions) {
    const previous = sessions.get(item.id);
    if (!previous || item.seconds > previous.seconds)
      sessions.set(item.id, item);
  }
  const discoveries = new Map<string, Discovery>();
  for (const item of [...current.discoveries, ...incoming.discoveries]) {
    const key = `${item.moduleId}:${item.key}`;
    const previous = discoveries.get(key);
    if (!previous || item.createdAt > previous.createdAt)
      discoveries.set(key, item);
  }
  return normalizeExplorerStore({
    ...current,
    saved: [...new Set([...current.saved, ...incoming.saved])],
    sessions: [...sessions.values()].sort((a, b) =>
      b.startedAt.localeCompare(a.startedAt),
    ),
    discoveries: [...discoveries.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    ),
    drafts: { ...incoming.drafts, ...current.drafts },
  });
}

export function createExplorerBackup(data: ExplorerStore) {
  return {
    product: "ExBeam",
    format: 2,
    exportedAt: new Date().toISOString(),
    data,
  };
}
export function parseExplorerBackup(raw: string): ExplorerStore {
  if (raw.length > 4_000_000)
    throw new Error("备份文件过大，请选择 ExBeam 导出的记录文件。");
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("文件不是有效的记录备份。");
  }
  if (
    parsed?.product !== "ExBeam" ||
    parsed.format !== 2 ||
    parsed.data?.version !== 2 ||
    !Array.isArray(parsed.data.sessions) ||
    !Array.isArray(parsed.data.discoveries) ||
    !Array.isArray(parsed.data.saved)
  ) {
    throw new Error("请选择新版 ExBeam 导出的 JSON 备份。原有记录不会被覆盖。");
  }
  return normalizeExplorerStore(parsed.data);
}

export function getRecentExperiences(store: ExplorerStore) {
  return [...new Set(store.sessions.map((item) => item.moduleId))].filter(
    validId,
  );
}
export function formatDuration(seconds: number) {
  if (seconds < 60) return seconds > 0 ? "不到 1 分钟" : "0 分钟";
  const minutes = Math.floor(seconds / 60);
  return minutes < 60
    ? `${minutes} 分钟`
    : `${Math.floor(minutes / 60)} 小时${minutes % 60 ? ` ${minutes % 60} 分钟` : ""}`;
}

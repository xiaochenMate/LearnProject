import { COSMIC_BY_ID, UniverseScale } from './universeData';

const STORAGE_KEY = 'exbeam.universe.progress.v1';
export interface UniverseProgress {
  selectedId: string;
  visited: string[];
  observed: string[];
  notes: Record<string, string>;
  quizzes: UniverseScale[];
}

export const readUniverseProgress = (): UniverseProgress => {
  const fallback: UniverseProgress = {
    selectedId: 'solar-system',
    visited: [],
    observed: [],
    notes: {},
    quizzes: [],
  };
  try {
    const parse = (key: string) => {
      try {
        return JSON.parse(localStorage.getItem(key) || 'null');
      } catch {
        return null;
      }
    };
    const stored = parse(STORAGE_KEY);
    const hasSavedProgress =
      stored && typeof stored === 'object' && !Array.isArray(stored);
    const legacy = (key: string): string[] => {
      const ids = parse(key);
      return Array.isArray(ids) ? ids.filter((id) => COSMIC_BY_ID.has(id)) : [];
    };
    const ids = (value: unknown): string[] =>
      Array.isArray(value)
        ? [
            ...new Set(
              value.filter(
                (id): id is string =>
                  typeof id === 'string' && COSMIC_BY_ID.has(id),
              ),
            ),
          ]
        : [];
    return {
      selectedId: COSMIC_BY_ID.has(stored?.selectedId)
        ? stored.selectedId
        : fallback.selectedId,
      visited: ids(
        hasSavedProgress ? stored.visited : legacy('exbeam.solar.visited.v1'),
      ),
      observed: ids(
        hasSavedProgress ? stored.observed : legacy('exbeam.solar.observed.v1'),
      ),
      notes:
        stored?.notes &&
        typeof stored.notes === 'object' &&
        !Array.isArray(stored.notes)
          ? Object.fromEntries(
              Object.entries(stored.notes)
                .filter(
                  ([id, note]) =>
                    COSMIC_BY_ID.has(id) && typeof note === 'string',
                )
                .map(([id, note]) => [id, (note as string).slice(0, 500)]),
            )
          : {},
      quizzes: Array.isArray(stored?.quizzes)
        ? [
            ...new Set<UniverseScale>(
              stored.quizzes.filter((id: string) =>
                ['solar', 'galaxy', 'galaxies', 'cosmos'].includes(id),
              ),
            ),
          ]
        : [],
    };
  } catch {
    return fallback;
  }
};

export const saveUniverseProgress = (progress: UniverseProgress): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
};

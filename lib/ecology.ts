export const ORGANISMS = [
  { id: "grass", name: "草", icon: "🌱", role: "生产者" },
  { id: "locust", name: "蝗虫", icon: "🦗", role: "初级消费者" },
  { id: "rabbit", name: "兔", icon: "🐇", role: "初级消费者" },
  { id: "frog", name: "蛙", icon: "🐸", role: "次级消费者" },
  { id: "snake", name: "蛇", icon: "🐍", role: "消费者" },
  { id: "eagle", name: "鹰", icon: "🦅", role: "捕食者" },
  { id: "wolf", name: "狼", icon: "🐺", role: "捕食者" },
] as const;
export const ORGANISM_BY_ID = new Map<string, (typeof ORGANISMS)[number]>(
  ORGANISMS.map((item) => [item.id, item]),
);
const PREDATORS: Record<string, string[]> = {
  grass: ["locust", "rabbit"],
  locust: ["frog"],
  frog: ["snake", "eagle"],
  rabbit: ["snake", "eagle", "wolf"],
  snake: ["eagle"],
  eagle: [],
  wolf: [],
};
export function validateFoodChain(ids: string[]) {
  if (ids.some((id) => !ORGANISM_BY_ID.has(id)))
    return { valid: false, message: "这条链中有无法识别的生物。" };
  if (ids.length < 3)
    return {
      valid: false,
      message: "连接至少三个生物，再观察它们的捕食关系。",
    };
  if (ids.length > 6 || new Set(ids).size !== ids.length)
    return {
      valid: false,
      message: "同一个生物在这条捕食链中只出现一次，最多连接六个生物。",
    };
  if (ids[0] !== "grass")
    return {
      valid: false,
      message: "先从生产者开始，植物把太阳能转化为有机物中的化学能。",
    };
  for (let index = 0; index < ids.length - 1; index++) {
    if (!PREDATORS[ids[index]]?.includes(ids[index + 1]))
      return {
        valid: false,
        message: `${ORGANISM_BY_ID.get(ids[index + 1])!.name}不以${ORGANISM_BY_ID.get(ids[index])!.name}为这条示例链中的食物，请调整顺序。`,
      };
  }
  return {
    valid: true,
    message: "捕食关系成立。箭头从食物指向捕食者，表示有机物与能量传递的方向。",
  };
}
export function normalizeFoodChain(value: unknown) {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (id): id is string =>
              typeof id === "string" && ORGANISM_BY_ID.has(id),
          ),
        ),
      ].slice(0, 6)
    : [];
}

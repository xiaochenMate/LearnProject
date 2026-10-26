import { COSMIC_BY_ID, COSMIC_OBJECTS, UniverseScale } from './universeData';
import { SATELLITE_SYSTEMS } from './solarSystemModel';

export interface UniverseLocation {
  contextId: string;
  selectedId: string;
  overview: boolean;
}
export interface UniverseContext {
  id: string;
  name: string;
  english: string;
  scale: UniverseScale;
  mode: 'map' | 'galactic' | 'solar' | 'system' | 'detail';
  parentId?: string;
  portalId?: string;
  centerId?: string;
  objectIds: string[];
  defaultId: string;
  extent: string;
  note: string;
}
const schematic =
  '位置、间距、大小与速度经教学重排，不是实时星图，也不能用画面像素测量真实距离。';
const contexts: UniverseContext[] = [
  {
    id: 'universe',
    name: '可观测宇宙',
    english: 'OBSERVABLE UNIVERSE',
    scale: 'cosmos',
    mode: 'map',
    objectIds: ['cosmic-web', 'cmb', 'observable'],
    defaultId: 'cosmic-web',
    extent: '约 920 亿光年 · 今天的直径',
    note:
      '可观测范围取决于观察者；球面不是宇宙的墙。宇宙网与微波背景并非同一时代的结构。' +
      schematic,
  },
  {
    id: 'cosmic-web',
    name: '宇宙网',
    english: 'COSMIC WEB',
    scale: 'cosmos',
    mode: 'map',
    parentId: 'universe',
    portalId: 'cosmic-web',
    objectIds: ['local-group', 'virgo-cluster', 'whirlpool'],
    defaultId: 'local-group',
    extent: '从大尺度结构到近邻星系',
    note:
      '本星系群与室女座星系团是不同结构；银河系不属于室女座星系团。此处展示近邻实例，不是完整宇宙巡天。' +
      schematic,
  },
  {
    id: 'local-group',
    name: '本星系群',
    english: 'LOCAL GROUP',
    scale: 'galaxies',
    mode: 'map',
    parentId: 'cosmic-web',
    portalId: 'local-group',
    objectIds: ['milky-way', 'andromeda', 'triangulum', 'lmc'],
    defaultId: 'milky-way',
    extent: '银河系与它的近邻',
    note: '本场景只列出部分代表成员；涡状星系不属于本星系群。' + schematic,
  },
  {
    id: 'virgo-cluster',
    name: '室女座星系团',
    english: 'VIRGO CLUSTER',
    scale: 'galaxies',
    mode: 'map',
    parentId: 'cosmic-web',
    portalId: 'virgo-cluster',
    objectIds: ['m87'],
    defaultId: 'm87',
    extent: '距我们约 5,400 万光年',
    note: '这里只展示代表成员 M87，不代表整个星系团只有一个星系。' + schematic,
  },
  {
    id: 'milky-way',
    name: '银河系',
    english: 'MILKY WAY',
    scale: 'galaxy',
    mode: 'galactic',
    parentId: 'local-group',
    portalId: 'milky-way',
    objectIds: [
      'solar-system',
      'proxima',
      'sirius',
      'orion',
      'crab',
      'sagittarius',
    ],
    defaultId: 'solar-system',
    extent: '恒星盘直径超过 10 万光年',
    note:
      '银河系外观为观测约束下的结构示意，并非外部实拍；近邻恒星、星云和银心被重排到同一导航图。' +
      schematic,
  },
  {
    id: 'andromeda',
    name: '仙女座星系',
    english: 'ANDROMEDA · M31',
    scale: 'galaxy',
    mode: 'galactic',
    parentId: 'local-group',
    portalId: 'andromeda',
    objectIds: ['andromeda-core'],
    defaultId: 'andromeda-core',
    extent: '距我们约 250 万光年',
    note:
      '展示 M31 已观测的星系核；背景为形态示意，未把银河系或太阳系的天体移植到这个星系。' +
      schematic,
  },
  {
    id: 'triangulum',
    name: '三角座星系',
    english: 'TRIANGULUM · M33',
    scale: 'galaxy',
    mode: 'galactic',
    parentId: 'local-group',
    portalId: 'triangulum',
    objectIds: ['ngc604'],
    defaultId: 'ngc604',
    extent: '旋臂中的恒星形成区',
    note:
      '以 NGC 604 为代表探索 M33；未建模的恒星系统并不表示不存在。' + schematic,
  },
  {
    id: 'lmc',
    name: '大麦哲伦云',
    english: 'LARGE MAGELLANIC CLOUD',
    scale: 'galaxy',
    mode: 'galactic',
    parentId: 'local-group',
    portalId: 'lmc',
    objectIds: ['tarantula'],
    defaultId: 'tarantula',
    extent: '银河系的卫星星系',
    note: '不规则星系的恒星密度背景与蜘蛛星云均为结构示意。' + schematic,
  },
  {
    id: 'whirlpool',
    name: '涡状星系对',
    english: 'M51 / NGC 5195',
    scale: 'galaxies',
    mode: 'map',
    parentId: 'cosmic-web',
    portalId: 'whirlpool',
    objectIds: ['whirlpool', 'ngc5195'],
    defaultId: 'ngc5195',
    extent: '约 3,100 万光年外',
    note: '这是相互作用的星系对，不属于本星系群。' + schematic,
  },
  {
    id: 'm87',
    name: 'M87 中央区域',
    english: 'MESSIER 87 · NUCLEUS',
    scale: 'galaxy',
    mode: 'map',
    parentId: 'virgo-cluster',
    portalId: 'm87',
    objectIds: ['m87-blackhole'],
    defaultId: 'm87-blackhole',
    extent: '巨椭圆星系的中央黑洞',
    note:
      'M87 是椭圆星系，没有银河系式旋臂背景；黑洞吸积流与光线弯曲为近似演示。' +
      schematic,
  },
  {
    id: 'solar-system',
    name: '太阳系',
    english: 'SOLAR SYSTEM',
    scale: 'solar',
    mode: 'solar',
    parentId: 'milky-way',
    portalId: 'solar-system',
    objectIds: [
      'sun',
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ],
    defaultId: 'earth',
    extent: '8 颗行星 · 以 AU 衡量轨道',
    note:
      '行星、月球和木星四大卫星采用 Astronomy Engine 星历，从当前日期开始加速播放；其他卫星采用平均圆轨道。背景恒星为非定位星空。天体大小与轨道距离分别压缩，卫星适度放大，不可按像素测距。',
  },
  {
    id: 'proxima',
    name: '比邻星系统',
    english: 'PROXIMA CENTAURI SYSTEM',
    scale: 'solar',
    mode: 'system',
    parentId: 'milky-way',
    portalId: 'proxima',
    centerId: 'proxima',
    objectIds: ['proxima', 'proxima-b'],
    defaultId: 'proxima-b',
    extent: '距地球约 4.25 光年',
    note:
      '仅展示已确认的代表行星比邻星 b；行星外观、大气与地表尚不清楚，材质为示意。' +
      schematic,
  },
  {
    id: 'sirius',
    name: '天狼星双星',
    english: 'SIRIUS BINARY',
    scale: 'solar',
    mode: 'system',
    parentId: 'milky-way',
    portalId: 'sirius',
    centerId: 'sirius',
    objectIds: ['sirius', 'sirius-b'],
    defaultId: 'sirius-b',
    extent: '主序星与白矮星',
    note:
      '两颗恒星绕共同质心运动；这里为便于比较显示相对轨道，不是精密双星星历。' +
      schematic,
  },
];

Object.entries(SATELLITE_SYSTEMS).forEach(([id, moons]) => {
  const object = COSMIC_BY_ID.get(id)!;
  contexts.push({
    id,
    name: `${object.name}系统`,
    english: `${object.english} SYSTEM`,
    scale: 'solar',
    mode: 'system',
    parentId: 'solar-system',
    portalId: id,
    centerId: id,
    objectIds: [id, ...moons],
    defaultId: id,
    extent: id === 'earth' ? '地球与月球' : '行星与代表卫星',
    note: `${id === 'earth' ? '月球采用地心星历。' : id === 'jupiter' ? '四大伽利略卫星采用木心星历。' : '卫星按平均周期在倾斜圆轨道上演示，初始相位非当前观测。'}仅列出代表卫星；轨道间距压缩，卫星适度放大。拼接影像不等于完整实测地形，部分区域有数据缺口；土卫六显示云霾。`,
  });
});

export const UNIVERSE_CONTEXTS = new Map(
  contexts.map((context) => [context.id, context]),
);
export const OBJECT_HOME = new Map<string, string>();
// A portal appears in its parent map and may reappear as the central body inside.
contexts.forEach((context) =>
  context.objectIds.forEach((id) => {
    if (!OBJECT_HOME.has(id)) OBJECT_HOME.set(id, context.id);
  }),
);
// The Moon used to live directly in the solar map; its canonical home is now Earth.
COSMIC_OBJECTS.forEach((object) => {
  if (!OBJECT_HOME.has(object.id))
    throw new Error(`Missing universe address: ${object.id}`);
});

COSMIC_OBJECTS.forEach((object) => {
  const ownContext = UNIVERSE_CONTEXTS.get(object.id);
  if (ownContext && !ownContext.objectIds.includes(object.id)) return;
  contexts.push({
    id: `detail:${object.id}`,
    name: object.name,
    english: object.english,
    scale:
      ownContext?.scale ||
      UNIVERSE_CONTEXTS.get(OBJECT_HOME.get(object.id)!)!.scale,
    mode: 'detail',
    parentId: ownContext?.id || OBJECT_HOME.get(object.id),
    portalId: object.id,
    centerId: object.id,
    objectIds: [object.id],
    defaultId: object.id,
    extent: object.type,
    note: `${object.shape === 'blackhole' ? '仅观察事件视界外部的近似吸积流；不模拟黑洞内部。' : object.texture ? '表面使用探测器影像拼接图，部分区域低分辨率或填补；土卫六显示云霾。光照和旋转为计算模型，不是实时直播。' : object.surface ? '材质为教学示意，并非实测地形。' : '近距离模型用于比较可见形态，不是实时观测。'}${schematic}`,
  });
});
contexts.forEach((context) => UNIVERSE_CONTEXTS.set(context.id, context));

export const locationForObject = (id: string): UniverseLocation => ({
  contextId: OBJECT_HOME.get(id) || 'universe',
  selectedId: COSMIC_BY_ID.has(id) ? id : 'cosmic-web',
  overview: false,
});
export const contextLocation = (contextId: string): UniverseLocation => {
  const context =
    UNIVERSE_CONTEXTS.get(contextId) || UNIVERSE_CONTEXTS.get('universe')!;
  return {
    contextId: context.id,
    selectedId: context.defaultId,
    overview: context.mode !== 'detail',
  };
};
export const sanitizeLocation = (
  value: unknown,
  fallback = contextLocation('universe'),
): UniverseLocation => {
  if (!value || typeof value !== 'object') return fallback;
  const raw = value as Partial<UniverseLocation>;
  const context = UNIVERSE_CONTEXTS.get(raw.contextId || '');
  if (!context || !context.objectIds.includes(raw.selectedId || ''))
    return fallback;
  return {
    contextId: context.id,
    selectedId: raw.selectedId!,
    overview: raw.overview === true && context.mode !== 'detail',
  };
};

export const locationFromSearch = (search: string): UniverseLocation | null => {
  const params = new URLSearchParams(search);
  const id = params.get('object');
  const space = params.get('space');
  if (!space && !id) return null;
  if (space) {
    const context = UNIVERSE_CONTEXTS.get(space);
    return context
      ? sanitizeLocation({
          contextId: space,
          selectedId: id || context.defaultId,
          overview: params.get('overview') === '1',
        })
      : null;
  }
  return id && COSMIC_BY_ID.has(id) ? locationForObject(id) : null;
};
export const enterLocation = (
  location: UniverseLocation,
): UniverseLocation | null => {
  const context = UNIVERSE_CONTEXTS.get(location.contextId)!;
  if (context.mode === 'detail') return null;
  const destination =
    (context.id !== location.selectedId
      ? UNIVERSE_CONTEXTS.get(location.selectedId)
      : undefined) || UNIVERSE_CONTEXTS.get(`detail:${location.selectedId}`);
  if (!destination || destination.parentId !== context.id) return null;
  return contextLocation(destination.id);
};
export const leaveLocation = (
  location: UniverseLocation,
): UniverseLocation | null => {
  const context = UNIVERSE_CONTEXTS.get(location.contextId)!;
  return context.parentId
    ? {
        contextId: context.parentId,
        selectedId: context.portalId!,
        overview: false,
      }
    : null;
};
export const universeAddress = (contextId: string): UniverseContext[] => {
  const path: UniverseContext[] = [];
  let context = UNIVERSE_CONTEXTS.get(contextId);
  while (context && !path.some((item) => item.id === context!.id)) {
    path.unshift(context);
    context = context.parentId
      ? UNIVERSE_CONTEXTS.get(context.parentId)
      : undefined;
  }
  return path;
};
export const SCALE_CONTEXT: Record<UniverseScale, string> = {
  cosmos: 'universe',
  galaxies: 'local-group',
  galaxy: 'milky-way',
  solar: 'solar-system',
};

export type ZoomIntent = 'in' | 'out';
export interface ZoomBoundary {
  direction: ZoomIntent;
  distance: number;
  focusDistance: number;
  overviewDistance: number;
  focused: boolean;
  canEnter: boolean;
  canLeave: boolean;
}
// Boundaries are evaluated only during deliberate zoom gestures, never camera animation.
export const zoomDestination = (boundary: ZoomBoundary): ZoomIntent | null => {
  if (
    boundary.direction === 'in' &&
    boundary.canEnter &&
    boundary.focused &&
    boundary.distance <= boundary.focusDistance * 0.58
  )
    return 'in';
  if (
    boundary.direction === 'out' &&
    boundary.canLeave &&
    boundary.distance >= boundary.overviewDistance * 1.24
  )
    return 'out';
  return null;
};

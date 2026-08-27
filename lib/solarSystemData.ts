export type PlanetId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'moon'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export interface PlanetRecord {
  id: PlanetId;
  name: string;
  english: string;
  type: string;
  description: string;
  fact: string;
  observation: string;
  texture: string;
  color: string;
  size: number;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  initialAngle: number;
  radius: string;
  distance: string;
  day: string;
  year: string;
  temperature: string;
  moons: string;
  isSun?: boolean;
  isMoon?: boolean;
  hasRing?: boolean;
}

const ASSET_PATH = '/images/solar-system';

export const PLANETS: PlanetRecord[] = [
  {
    id: 'sun', name: '太阳', english: 'SUN', type: '恒星', texture: `${ASSET_PATH}/sun.jpg`,
    description: '太阳是太阳系的中心恒星，持续通过核聚变释放光和热。它的引力维系着八颗行星的轨道。',
    fact: '太阳约占太阳系总质量的 99.86%，内部大约可以装下 130 万个地球。',
    observation: '观察太阳表面的亮暗纹理，再比较太阳与地球在教学模型中的大小差异。',
    color: '#F9B44C', size: 19, orbitRadius: 0, orbitSpeed: 0, spinSpeed: 0.04, initialAngle: 0,
    radius: '696,340 km', distance: '太阳系中心', day: '约 27 天', year: '约 2.3 亿年',
    temperature: '约 5,500°C', moons: '—', isSun: true,
  },
  {
    id: 'mercury', name: '水星', english: 'MERCURY', type: '岩质行星', texture: `${ASSET_PATH}/mercury.jpg`,
    description: '水星是最靠近太阳、也是太阳系最小的行星。它几乎没有大气保温，昼夜温差非常大。',
    fact: '水星的一年只有 88 个地球日，但一个太阳日却约等于 176 个地球日。',
    observation: '寻找表面的环形山，并想一想：为什么水星表面看起来有些像月球？',
    color: '#B7AEA4', size: 2.8, orbitRadius: 52, orbitSpeed: 0.18, spinSpeed: 0.012, initialAngle: 0.35,
    radius: '2,440 km', distance: '5,790 万 km', day: '58.6 天', year: '88 天',
    temperature: '-180～430°C', moons: '0',
  },
  {
    id: 'venus', name: '金星', english: 'VENUS', type: '岩质行星', texture: `${ASSET_PATH}/venus.jpg`,
    description: '金星大小与地球接近，却被浓厚的二氧化碳大气包围，强烈的温室效应使它成为最热的行星。',
    fact: '金星自转方向与大多数行星相反，而且自转一圈比绕太阳一圈还慢。',
    observation: '观察金星明亮的表面色彩，找出它与地球大小最接近的地方。',
    color: '#D8AA63', size: 4.7, orbitRadius: 76, orbitSpeed: 0.14, spinSpeed: -0.006, initialAngle: 1.15,
    radius: '6,052 km', distance: '1.082 亿 km', day: '243 天', year: '225 天',
    temperature: '约 465°C', moons: '0',
  },
  {
    id: 'earth', name: '地球', english: 'EARTH', type: '岩质行星', texture: `${ASSET_PATH}/earth.jpg`,
    description: '地球拥有液态水、含氧大气和适宜的温度，是目前已知唯一存在生命的星球。',
    fact: '海洋覆盖了地球表面约 71%，从太空看，地球因此呈现鲜明的蓝色。',
    observation: '辨认蓝色海洋、陆地与云层，并尝试找到面积最大的太平洋。',
    color: '#4FA8FF', size: 5, orbitRadius: 104, orbitSpeed: 0.115, spinSpeed: 0.08, initialAngle: 2.15,
    radius: '6,371 km', distance: '1.496 亿 km', day: '23时56分', year: '365.25 天',
    temperature: '平均 15°C', moons: '1',
  },
  {
    id: 'moon', name: '月球', english: 'MOON', type: '天然卫星', texture: `${ASSET_PATH}/moon.jpg`,
    description: '月球是地球唯一的天然卫星，它的引力参与形成潮汐，也帮助稳定地球的自转轴。',
    fact: '月球总以同一面朝向地球，这种现象叫作潮汐锁定。',
    observation: '观察月海与高地的明暗差异，想一想月球为什么不会自己发光。',
    color: '#D4D7DB', size: 1.7, orbitRadius: 0, orbitSpeed: 0.48, spinSpeed: 0.025, initialAngle: 0.6,
    radius: '1,737 km', distance: '距地球 38.4 万 km', day: '27.3 天', year: '27.3 天',
    temperature: '-173～127°C', moons: '0', isMoon: true,
  },
  {
    id: 'mars', name: '火星', english: 'MARS', type: '岩质行星', texture: `${ASSET_PATH}/mars.jpg`,
    description: '火星因表面富含氧化铁而呈红色。它拥有太阳系最高的火山和规模巨大的峡谷。',
    fact: '火星的一天约为 24 小时 37 分钟，与地球的一天非常接近。',
    observation: '寻找红色与深色区域的边界，推测尘土如何改变火星表面的颜色。',
    color: '#E36A4C', size: 3.7, orbitRadius: 140, orbitSpeed: 0.092, spinSpeed: 0.075, initialAngle: 3.35,
    radius: '3,390 km', distance: '2.279 亿 km', day: '24时37分', year: '687 天',
    temperature: '平均 -63°C', moons: '2',
  },
  {
    id: 'jupiter', name: '木星', english: 'JUPITER', type: '气态巨行星', texture: `${ASSET_PATH}/jupiter.jpg`,
    description: '木星是太阳系最大的行星，主要由氢和氦组成。它的大红斑是一场持续了数百年的巨型风暴。',
    fact: '木星自转一圈只需约 10 小时，是太阳系自转最快的行星。',
    observation: '找到木星表面的条纹和大红斑，比较不同纬度云带的方向。',
    color: '#D9A878', size: 11.5, orbitRadius: 196, orbitSpeed: 0.054, spinSpeed: 0.16, initialAngle: 4.05,
    radius: '69,911 km', distance: '7.786 亿 km', day: '9时56分', year: '11.86 年',
    temperature: '约 -110°C', moons: '95+',
  },
  {
    id: 'saturn', name: '土星', english: 'SATURN', type: '气态巨行星', texture: `${ASSET_PATH}/saturn.jpg`,
    description: '土星拥有太阳系最醒目的行星环。环系主要由冰粒、岩石碎片和尘埃组成。',
    fact: '土星平均密度比水低，如果有足够大的海洋，它理论上能够浮起来。',
    observation: '观察土星环的内外边缘，并比较行星环直径与土星本体直径。',
    color: '#E8CD8E', size: 9.8, orbitRadius: 248, orbitSpeed: 0.041, spinSpeed: 0.145, initialAngle: 5.2,
    radius: '58,232 km', distance: '14.34 亿 km', day: '10时42分', year: '29.45 年',
    temperature: '约 -140°C', moons: '140+', hasRing: true,
  },
  {
    id: 'uranus', name: '天王星', english: 'URANUS', type: '冰巨行星', texture: `${ASSET_PATH}/uranus.jpg`,
    description: '天王星富含水、氨和甲烷等冰物质。它几乎横躺着自转，季节变化十分极端。',
    fact: '天王星的自转轴倾角约 98°，像一颗沿轨道滚动的球。',
    observation: '观察天王星均匀的蓝绿色，思考为什么它不像木星那样有明显云带。',
    color: '#75D4D9', size: 7.1, orbitRadius: 300, orbitSpeed: 0.03, spinSpeed: -0.09, initialAngle: 0.75,
    radius: '25,362 km', distance: '28.71 亿 km', day: '17时14分', year: '84 年',
    temperature: '约 -195°C', moons: '27',
  },
  {
    id: 'neptune', name: '海王星', english: 'NEPTUNE', type: '冰巨行星', texture: `${ASSET_PATH}/neptune.jpg`,
    description: '海王星是距离太阳最远的行星，甲烷让它呈现蓝色，大气中的风速可超过每小时 2,000 千米。',
    fact: '海王星绕太阳一周需要约 165 个地球年，自发现以来只完成了一次完整公转。',
    observation: '比较海王星和天王星的蓝色深浅，寻找表面可能出现的风暴结构。',
    color: '#5475E8', size: 7, orbitRadius: 352, orbitSpeed: 0.024, spinSpeed: 0.1, initialAngle: 2.7,
    radius: '24,622 km', distance: '44.95 亿 km', day: '16时6分', year: '164.8 年',
    temperature: '约 -200°C', moons: '14',
  },
];

export const CORE_PLANET_IDS = PLANETS.filter(planet => !planet.isMoon).map(planet => planet.id);

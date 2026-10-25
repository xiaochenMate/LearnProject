import { PLANETS } from './solarSystemData';

export type UniverseScale = 'solar' | 'galaxy' | 'galaxies' | 'cosmos';
export type CosmicShape =
  | 'planet'
  | 'star'
  | 'nebula'
  | 'blackhole'
  | 'galaxy'
  | 'cluster'
  | 'web'
  | 'shell';

export interface CosmicObject {
  id: string;
  name: string;
  english: string;
  type: string;
  scale: UniverseScale;
  shape: CosmicShape;
  color: string;
  position: [number, number, number];
  size: number;
  description: string;
  fact: string;
  observation: string;
  stats: [string, string][];
  source: string;
  image?: string;
  imageCredit?: string;
  imageCaption?: string;
  enterScale?: UniverseScale;
}

export const UNIVERSE_SCALES: {
  id: UniverseScale;
  name: string;
  english: string;
  extent: string;
  defaultId: string;
  note: string;
}[] = [
  {
    id: 'solar',
    name: '太阳系',
    english: 'SOLAR SYSTEM',
    extent: '行星与卫星',
    defaultId: 'earth',
    note: '轨道与大小已压缩，公转速度为演示速度。',
  },
  {
    id: 'galaxy',
    name: '银河系',
    english: 'MILKY WAY',
    extent: '约 10 万光年',
    defaultId: 'solar-system',
    note: '银河系结构示意；天体位置与大小经重排放大，并非星图。',
  },
  {
    id: 'galaxies',
    name: '星系世界',
    english: 'GALAXIES',
    extent: '数千万光年',
    defaultId: 'milky-way',
    note: '星系形态与相邻关系示意，间距和朝向不按真实比例。',
  },
  {
    id: 'cosmos',
    name: '宇宙结构',
    english: 'COSMIC STRUCTURES',
    extent: '可观测宇宙',
    defaultId: 'cosmic-web',
    note: '不同尺度的结构概念图；不表示天体坐标或宇宙边界。',
  },
];

const nasa = 'https://science.nasa.gov';
const catalog = `${nasa}/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog`;

const solarObjects: CosmicObject[] = PLANETS.map((planet) => ({
  id: planet.id,
  name: planet.name,
  english: planet.english,
  type: planet.type,
  scale: 'solar',
  shape: planet.isSun ? 'star' : 'planet',
  color: planet.color,
  position: [0, 0, 0],
  size: planet.size,
  description: planet.description,
  fact: planet.fact,
  observation: planet.observation,
  stats: [
    ['平均半径', planet.radius],
    ['距离', planet.distance],
    ['自转周期', planet.day],
    [
      planet.isSun
        ? '绕银河系一周'
        : planet.isMoon
          ? '绕地球一周'
          : '绕太阳一周',
      planet.year,
    ],
    ['温度（约）', planet.temperature],
  ],
  source: planet.isSun ? `${nasa}/sun/` : `${nasa}/solar-system/`,
}));

export const COSMIC_OBJECTS: CosmicObject[] = [
  ...solarObjects,
  {
    id: 'solar-system',
    name: '太阳系',
    english: 'SOLAR SYSTEM',
    type: '我们的家园',
    scale: 'galaxy',
    shape: 'star',
    color: '#F4CA7F',
    position: [94, 1, 51],
    size: 3,
    description:
      '太阳和围绕它运行的行星、卫星、小行星与彗星，组成了我们的太阳系。它位于银河系的一条旋臂支臂上。',
    fact: '太阳系不是银河系的中心。太阳也在绕银河系中心运行，走完一圈需要大约 2.4 亿年。',
    observation:
      '在银河系全景中找到太阳系，再进入太阳系，看看地球在这个大家庭中的位置。',
    stats: [
      ['所属星系', '银河系'],
      ['所在区域', '猎户座支臂'],
      ['主要行星', '8 颗'],
      ['绕银心一周', '约 2.4 亿年'],
    ],
    source: `${nasa}/universe/galaxies/`,
    enterScale: 'solar',
  },
  {
    id: 'proxima',
    name: '比邻星',
    english: 'PROXIMA CENTAURI',
    type: '红矮星',
    scale: 'galaxy',
    shape: 'star',
    color: '#F49D82',
    position: [123, 9, 35],
    size: 2.1,
    description:
      '比邻星是太阳以外离我们最近的恒星。它是一颗暗淡的小型红矮星，即使距离很近，也无法用肉眼直接看见。',
    fact: '“最近”依然很远：比邻星发出的光，要经过大约 4.25 年才能到达地球。',
    observation: '比较比邻星与太阳的颜色。恒星表面温度较低时，通常更偏红。',
    stats: [
      ['距地球', '约 4.25 光年'],
      ['恒星类别', '红矮星'],
      ['所在星座', '半人马座'],
      ['肉眼可见', '不可见'],
    ],
    source: `${nasa}/exoplanets/other-stars-other-worlds/our-nearest-celestial-neighbor-an-exotic-3-star-system/`,
  },
  {
    id: 'sirius',
    name: '天狼星',
    english: 'SIRIUS',
    type: '双星系统',
    scale: 'galaxy',
    shape: 'star',
    color: '#B6DDFF',
    position: [72, 16, 89],
    size: 4,
    description:
      '天狼星是地球夜空中最明亮的恒星。我们看到的亮星天狼星 A，身边还有一颗暗弱的白矮星伴星天狼星 B。',
    fact: '看起来是一颗星，也可能是两颗恒星相互绕行。夜空中的亮度同时受恒星本身和距离影响。',
    observation: '辨认蓝白色的主星和小伴星，想一想为什么较暗的伴星更难被发现。',
    stats: [
      ['距地球', '约 8.6 光年'],
      ['系统成员', '2 颗恒星'],
      ['所在星座', '大犬座'],
      ['伴星类型', '白矮星'],
    ],
    source: `${nasa}/asset/hubble/the-dog-star-sirius-and-its-tiny-companion/`,
  },
  {
    id: 'orion',
    name: '猎户座星云',
    english: 'ORION NEBULA · M42',
    type: '恒星诞生地',
    scale: 'galaxy',
    shape: 'nebula',
    color: '#EBA1BA',
    position: [38, 4, 116],
    size: 14,
    description:
      '猎户座星云是一大片气体和尘埃构成的云。它内部正在孕育年轻恒星，是研究恒星如何诞生的天然实验室。',
    fact: '星云不是一颗星。“星云”中的云，是稀薄的气体和尘埃，而不是地球上的水滴云。',
    observation: '查看哈勃影像，寻找明亮的新生恒星与遮挡星光的深色尘埃。',
    stats: [
      ['距地球', '约 1,500 光年'],
      ['天体类别', '发射星云'],
      ['梅西耶编号', 'M42'],
      ['所在星座', '猎户座'],
    ],
    source: `${catalog}/messier-42/`,
    image: '/images/universe/orion.jpg',
    imageCredit:
      'NASA / ESA / M. Robberto / Hubble Orion Treasury Project Team',
    imageCaption: '哈勃空间望远镜合成影像',
  },
  {
    id: 'crab',
    name: '蟹状星云',
    english: 'CRAB NEBULA · M1',
    type: '超新星遗迹',
    scale: 'galaxy',
    shape: 'nebula',
    color: '#80D7DA',
    position: [-76, 15, 83],
    size: 13,
    description:
      '蟹状星云是恒星爆炸后留下的遗迹。1054 年，中国天文学家记录的“客星”，就是这次超新星爆发。',
    fact: '星云中心有一颗快速旋转的中子星。恒星生命的终点，也会把物质送回星际空间。',
    observation:
      '对比蟹状星云和猎户座星云：一个记录恒星的终点，一个见证恒星的诞生。',
    stats: [
      ['距地球', '约 6,500 光年'],
      ['爆发记录', '公元 1054 年'],
      ['中心天体', '脉冲星'],
      ['梅西耶编号', 'M1'],
    ],
    source: `${catalog}/messier-1/`,
    image: '/images/universe/crab.jpg',
    imageCredit: 'NASA / ESA / J. Hester / A. Loll (ASU)',
    imageCaption: '哈勃合成影像；颜色用于呈现气体成分',
  },
  {
    id: 'sagittarius',
    name: '人马座 A*',
    english: 'SAGITTARIUS A*',
    type: '超大质量黑洞',
    scale: 'galaxy',
    shape: 'blackhole',
    color: '#F1BA7B',
    position: [0, 2, 0],
    size: 8,
    description:
      '在银河系的中心，藏着一个质量约为太阳 400 万倍的黑洞：人马座 A*。天文学家通过周围恒星的运动和观测影像研究它。',
    fact: '黑洞本身不发光。我们能研究的是附近高温物质的辐射，以及黑洞对周围环境的影响。',
    observation:
      '观察暗色中心与周围亮环。这里是概念模型，亮环不代表黑洞的实体表面。',
    stats: [
      ['距地球', '约 2.6 万光年'],
      ['质量', '约 400 万个太阳'],
      ['位置', '银河系中心'],
      ['模型类型', '概念示意'],
    ],
    source:
      'https://chandra.si.edu/graphics/resources/handouts/lithos/saga_lithos.pdf',
  },
  {
    id: 'milky-way',
    name: '银河系',
    english: 'MILKY WAY',
    type: '棒旋星系',
    scale: 'galaxies',
    shape: 'galaxy',
    color: '#CFDDF5',
    position: [-65, 0, 46],
    size: 34,
    description:
      '银河系是我们的家园星系。恒星、气体和尘埃组成巨大的盘面，旋臂从中央延伸出去；太阳只是其中一颗普通恒星。',
    fact: '我们身处银河系内部，无法拍摄它的完整外部照片。这里的俯瞰形态是依据观测建立的结构示意。',
    observation:
      '旋转场景，从正面和侧面比较银河系的形态，再进入内部寻找太阳系。',
    stats: [
      ['恒星盘直径', '超过 10 万光年'],
      ['星系类别', '棒旋星系'],
      ['所属星系群', '本星系群'],
      ['我们的所在地', '猎户座支臂'],
    ],
    source: `${nasa}/universe/galaxies/`,
    enterScale: 'galaxy',
  },
  {
    id: 'andromeda',
    name: '仙女座星系',
    english: 'ANDROMEDA · M31',
    type: '旋涡星系',
    scale: 'galaxies',
    shape: 'galaxy',
    color: '#E5CDA6',
    position: [86, 16, -54],
    size: 42,
    description:
      '仙女座星系是距离银河系最近的大型星系。它和银河系、三角座星系一起，是本星系群的重要成员。',
    fact: '你现在看到的仙女座星系之光，约在 250 万年前就出发了。远望太空，也是在回望过去。',
    observation: '查看观测影像，寻找明亮的中央区域和围绕它的暗色尘埃带。',
    stats: [
      ['距地球', '约 250 万光年'],
      ['梅西耶编号', 'M31'],
      ['所属星系群', '本星系群'],
      ['所在星座', '仙女座'],
    ],
    source: `${nasa}/missions/hubble/nasas-hubble-traces-hidden-history-of-andromeda-galaxy/`,
    image: '/images/universe/andromeda.jpg',
    imageCredit: 'NASA / ESA / B. Williams (University of Washington)',
    imageCaption: '哈勃仙女座星系全景拼接影像',
  },
  {
    id: 'triangulum',
    name: '三角座星系',
    english: 'TRIANGULUM · M33',
    type: '旋涡星系',
    scale: 'galaxies',
    shape: 'galaxy',
    color: '#AACEDF',
    position: [33, -12, -118],
    size: 24,
    description:
      '三角座星系是本星系群中第三大的星系。它拥有舒展的旋臂，其中有许多恒星形成区域。',
    fact: '星系之间的空间并非绝对隔绝。引力让相邻星系相互影响，构成更大的星系群。',
    observation: '比较三角座和仙女座星系的结构，找到它们共同拥有的旋臂。',
    stats: [
      ['距地球', '约 300 万光年'],
      ['梅西耶编号', 'M33'],
      ['所属星系群', '本星系群'],
      ['类别', '旋涡星系'],
    ],
    source: `${catalog}/messier-33/`,
  },
  {
    id: 'lmc',
    name: '大麦哲伦云',
    english: 'LARGE MAGELLANIC CLOUD',
    type: '不规则卫星星系',
    scale: 'galaxies',
    shape: 'galaxy',
    color: '#A4E2D8',
    position: [-111, -20, 2],
    size: 16,
    description:
      '大麦哲伦云是银河系附近的一个小型星系。从南半球的暗夜中看去，它像一块朦胧的云，却包含大量恒星。',
    fact: '名字里有“云”，它却是一个星系，而不是像猎户座星云那样的星际气体云。',
    observation: '比较它与旋涡星系的外形：不是每个星系都有整齐、对称的旋臂。',
    stats: [
      ['距地球', '约 16.3 万光年'],
      ['类别', '不规则星系'],
      ['邻近星系', '银河系'],
      ['较适合观测', '南半球'],
    ],
    source: 'https://imagine.gsfc.nasa.gov/news/11jun13.html',
  },
  {
    id: 'whirlpool',
    name: '涡状星系',
    english: 'WHIRLPOOL · M51',
    type: '相互作用星系',
    scale: 'galaxies',
    shape: 'galaxy',
    color: '#B7D8F4',
    position: [123, 28, 83],
    size: 31,
    description:
      '涡状星系拥有醒目的旋臂。附近的伴星系与它相互作用，让我们有机会研究引力如何塑造星系。',
    fact: '星系的碰撞不是两块坚硬物体相撞。恒星之间空隙很大，但引力能显著改变星系结构。',
    observation: '在哈勃影像中找到小伴星系，并沿着主星系的旋臂向外追踪。',
    stats: [
      ['距地球', '约 3,100 万光年'],
      ['梅西耶编号', 'M51'],
      ['所在星座', '猎犬座'],
      ['显著特征', '旋臂与伴星系'],
    ],
    source: `${catalog}/messier-51/`,
    image: '/images/universe/whirlpool.jpg',
    imageCredit: 'NASA / ESA / S. Beckwith (STScI) / Hubble Heritage Team',
    imageCaption: '哈勃空间望远镜可见光合成影像',
  },
  {
    id: 'local-group',
    name: '本星系群',
    english: 'LOCAL GROUP',
    type: '星系的邻里',
    scale: 'cosmos',
    shape: 'cluster',
    color: '#9DE4CC',
    position: [-96, -8, 65],
    size: 20,
    description:
      '银河系并不孤单。它与仙女座星系、三角座星系和许多矮星系组成了本星系群。',
    fact: '从行星到恒星系统，再到星系和星系群，我们的宇宙地址可以一层一层向外展开。',
    observation:
      '进入星系世界，找出本星系群的三个主要成员。涡状星系不属于这个群。',
    stats: [
      ['结构类型', '星系群'],
      ['主要成员', '银河系 / M31 / M33'],
      ['成员数量', '数十个星系'],
      ['我们的层级', '银河系的上一级'],
    ],
    source: `${nasa}/universe/galaxies/`,
    enterScale: 'galaxies',
  },
  {
    id: 'virgo-cluster',
    name: '室女座星系团',
    english: 'VIRGO CLUSTER',
    type: '星系团',
    scale: 'cosmos',
    shape: 'cluster',
    color: '#F0CEA4',
    position: [75, 24, -72],
    size: 29,
    description:
      '室女座星系团包含大量星系。星系之间还充满极热、能发出 X 射线的稀薄气体。',
    fact: '“星团”是恒星的集合；“星系团”则由许多星系组成。两个名字只差一个字，尺度却差得很远。',
    observation: '比较它与本星系群的成员密集程度，想象每个亮点都代表一个星系。',
    stats: [
      ['距地球', '约 5,400 万光年'],
      ['成员数量', '超过 2,000 个星系'],
      ['亮眼成员', 'M87'],
      ['团内气体', '可发出 X 射线'],
    ],
    source:
      'https://www.nasa.gov/universe/suzaku-finds-common-chemical-makeup-at-largest-cosmic-scales/',
  },
  {
    id: 'cosmic-web',
    name: '宇宙网',
    english: 'COSMIC WEB',
    type: '大尺度结构',
    scale: 'cosmos',
    shape: 'web',
    color: '#A3BEDF',
    position: [0, 0, 0],
    size: 55,
    description:
      '把视野拉得足够远，星系并不是均匀散布的。它们沿着纤维和片状结构聚集，之间留下广阔的空洞，形成宇宙网。',
    fact: '这里的线条表示大尺度结构联系，既不是星系轨道，也不是现实中发光的连接线。',
    observation: '旋转场景，找到纤维交汇的密集节点和节点之间的空洞。',
    stats: [
      ['结构组成', '纤维 / 节点 / 空洞'],
      ['构成物质', '星系、气体与暗物质'],
      ['形成机制', '引力作用'],
      ['场景性质', '结构示意'],
    ],
    source: `${nasa}/universe/galaxies/`,
  },
  {
    id: 'cmb',
    name: '宇宙微波背景',
    english: 'COSMIC MICROWAVE BACKGROUND',
    type: '早期宇宙的余晖',
    scale: 'cosmos',
    shape: 'shell',
    color: '#E2B67A',
    position: [7, -35, -136],
    size: 26,
    description:
      '宇宙微波背景是早期宇宙留下的辐射。当宇宙诞生约 38 万年后逐渐冷却，光终于能更自由地传播。',
    fact: '它来自天空的各个方向。此处球面仅用于表达“遍布全天”的概念，并不是一颗远处的星球。',
    observation:
      '把它与星系模型对比：微波背景描述的是早期宇宙的辐射，不是某个恒星或星系。',
    stats: [
      ['释放时期', '大爆炸后约 38 万年'],
      ['今天主要波段', '微波'],
      ['观测方向', '全天'],
      ['模型性质', '概念球面'],
    ],
    source: `${nasa}/astrophysics/programs/physics-of-the-cosmos/big-bang-and-the-evolution-of-the-universe/`,
  },
  {
    id: 'observable',
    name: '可观测宇宙',
    english: 'OBSERVABLE UNIVERSE',
    type: '我们能看见的范围',
    scale: 'cosmos',
    shape: 'shell',
    color: '#9CB9EE',
    position: [113, 0, 94],
    size: 34,
    description:
      '可观测宇宙指光有时间到达我们的那部分宇宙。宇宙在膨胀，因此它今天的直径远大于宇宙年龄对应的光行距离。',
    fact: '可观测宇宙不等于整个宇宙。整个宇宙究竟有多大、是否无限，目前还没有可靠答案。',
    observation:
      '查看韦布深场影像，区分有衍射尖刺的前景恒星与形状各异的遥远星系。',
    stats: [
      ['宇宙年龄', '约 138 亿年'],
      ['可观测直径', '约 920 亿光年'],
      ['整个宇宙大小', '尚不确定'],
      ['光年是', '距离单位'],
    ],
    source:
      'https://www.nasa.gov/science-research/astrophysics/how-big-is-space-we-asked-a-nasa-expert-episode-61/',
    image: '/images/universe/deepfield.png',
    imageCredit: 'NASA / ESA / CSA / STScI',
    imageCaption: '韦布首张深场 SMACS 0723；只代表天空中的极小区域',
  },
];

export const COSMIC_BY_ID = new Map(
  COSMIC_OBJECTS.map((object) => [object.id, object]),
);

export const EXPLORATION_ROUTE = [
  'earth',
  'sun',
  'solar-system',
  'proxima',
  'orion',
  'sagittarius',
  'milky-way',
  'andromeda',
  'local-group',
  'cosmic-web',
  'cmb',
  'observable',
];

export const SCALE_QUESTIONS: Record<
  UniverseScale,
  { question: string; options: string[]; answer: number; explanation: string }
> = {
  solar: {
    question: '地球、月球和太阳中，哪一个会自己发光？',
    options: ['地球', '月球', '太阳'],
    answer: 2,
    explanation: '太阳是恒星，持续释放光和热；地球与月球主要反射太阳光。',
  },
  galaxy: {
    question: '太阳系在银河系的什么位置？',
    options: ['银河系的中心', '一条旋臂的支臂上', '银河系之外'],
    answer: 1,
    explanation: '太阳系位于猎户座支臂。银河系中心的超大质量黑洞是人马座 A*。',
  },
  galaxies: {
    question: '仙女座星系的光走了约 250 万年才到达地球。我们看到的是？',
    options: ['它此刻的样子', '它约 250 万年前的样子', '它未来的样子'],
    answer: 1,
    explanation: '光的传播需要时间。看得越远，通常也就看到了越久以前的宇宙。',
  },
  cosmos: {
    question: '“可观测宇宙”就是整个宇宙吗？',
    options: [
      '是，宇宙到这里就结束了',
      '不是，整个宇宙可能更大',
      '是，它是一颗巨大的球形天体',
    ],
    answer: 1,
    explanation:
      '它表示光有时间到达我们的范围，并不是宇宙的实体边界；整个宇宙的大小尚不确定。',
  },
};

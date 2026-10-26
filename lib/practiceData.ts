import { GRAND_CHRONICLES } from './historyData';

export interface PracticeCharacter {
  radical: string; name: string; candidate: string; result: string;
  pinyin: string; meaning: string; examples: string[]; level: '启蒙' | '进阶';
}
const group = (radical: string, name: string, level: PracticeCharacter['level'], rows: string[][]): PracticeCharacter[] =>
  rows.map(([candidate, result, pinyin, meaning, ...examples]) => ({ radical, name, level, candidate, result, pinyin, meaning, examples }));
export const PRACTICE_CHARACTERS = [
  ...group('氵', '三点水', '启蒙', [
    ['工', '江', 'jiāng', '大河的通称。', '长江', '江水'], ['羊', '洋', 'yáng', '广大的海域。', '海洋', '远洋'],
    ['青', '清', 'qīng', '纯净透明，没有杂质。', '清水', '清晨'], ['可', '河', 'hé', '天然的水道。', '河边', '小河'],
    ['每', '海', 'hǎi', '靠近陆地的广阔水域。', '大海', '海边'], ['去', '法', 'fǎ', '规则或方法。', '法律', '方法'],
    ['也', '池', 'chí', '蓄水的坑。', '池塘', '水池'], ['台', '治', 'zhì', '管理、处理。', '治理', '治病'],
  ]),
  ...group('亻', '单人旁', '启蒙', [
    ['主', '住', 'zhù', '长期居留。', '居住', '住房'], ['言', '信', 'xìn', '诚实，也指书信。', '相信', '写信'],
    ['也', '他', 'tā', '称男性或第三方。', '他们', '他的'], ['尔', '你', 'nǐ', '称对方。', '你好', '你们'],
    ['可', '何', 'hé', '疑问词，什么。', '为何', '如何'], ['乍', '作', 'zuò', '进行工作或活动。', '作业', '作为'],
    ['本', '体', 'tǐ', '人或动物的全身。', '身体', '体育'], ['门', '们', 'men', '表示人的复数。', '我们', '同学们'],
  ]),
  ...group('艹', '草字头', '启蒙', [
    ['化', '花', 'huā', '植物的繁殖器官。', '鲜花', '花园'], ['早', '草', 'cǎo', '草本植物的总称。', '小草', '草坪'],
    ['约', '药', 'yào', '治病用的物品。', '吃药', '中药'], ['卩', '节', 'jié', '段落、时令。', '节日', '季节'],
    ['田', '苗', 'miáo', '初生的植物。', '树苗', '禾苗'], ['央', '英', 'yīng', '杰出的人，也有花的意思。', '英雄', '英才'],
    ['古', '苦', 'kǔ', '像胆汁的味道。', '辛苦', '苦瓜'],
  ]),
  ...group('木', '木部', '启蒙', [
    ['子', '李', 'lǐ', '一种果树，也作姓氏；木在上、子在下。', '李子', '李树'],
    ['寸', '村', 'cūn', '乡下的聚落。', '乡村', '村庄'], ['几', '机', 'jī', '机器，也指机会。', '手机', '飞机'],
    ['对', '树', 'shù', '木本植物的总称。', '大树', '树林'], ['支', '枝', 'zhī', '树木的分支。', '树枝', '柳枝'],
    ['反', '板', 'bǎn', '片状的木材。', '木板', '板凳'],
  ]),
  ...group('扌', '提手旁', '进阶', [
    ['丁', '打', 'dǎ', '击、敲击。', '打球', '打字'], ['戈', '找', 'zhǎo', '寻找。', '寻找', '找到'],
    ['白', '拍', 'pāi', '用手掌打。', '拍手', '拍照'], ['立', '拉', 'lā', '牵引。', '拉车', '拉链'],
    ['合', '拾', 'shí', '捡起、整理。', '拾起', '收拾'], ['巴', '把', 'bǎ', '抓握，也作量词。', '把握', '火把'],
  ]),
  ...group('讠', '言字旁', '进阶', [
    ['吾', '语', 'yǔ', '说话、言辞。', '语言', '语文'], ['兑', '说', 'shuō', '用话表达。', '说话', '说明'],
    ['卖', '读', 'dú', '看书、诵读。', '读书', '朗读'], ['成', '诚', 'chéng', '真心，不虚假。', '诚实', '诚心'],
    ['果', '课', 'kè', '教学的内容。', '上课', '课本'], ['射', '谢', 'xiè', '表示感激。', '谢谢', '致谢'],
  ]),
  ...group('口', '口字旁', '启蒙', [
    ['乞', '吃', 'chī', '把食物咽下去。', '吃饭', '吃苦'], ['可', '呵', 'hē', '呵气，也形容笑声。', '呵气', '呵护'],
    ['马', '吗', 'ma', '疑问语气词。', '好吗', '是吗'], ['昌', '唱', 'chàng', '发出歌声。', '唱歌', '合唱'],
    ['那', '哪', 'nǎ', '疑问词。', '哪里', '哪个'],
  ]),
];

// Keep legacy event IDs while distinguishing founding dates from unification.
export const PRACTICE_HISTORY = GRAND_CHRONICLES.map(event => {
  if (event.id === 'xia') return { ...event, approximate: true, description: '传统年代约为公元前2070年；夏代早期年代仍有研究与讨论。', significance: '夏是中国传统史书中记载的早期王朝。' };
  if (event.id === 'shang') return { ...event, approximate: true };
  if (event.id === 'three_kings') return { ...event, name: '曹魏建立', description: '220年曹丕称帝，东汉结束。刘备于221年称帝，孙权于229年称帝。', significance: '220年是三国时期的常用起点，不能把这一年当作三国均已称帝的年份。', approximate: false };
  if (event.id === 'sui') return { ...event, name: '隋朝建立', description: '581年杨坚代北周建立隋朝；589年灭陈，完成南北统一。', significance: '建国与统一相隔八年，排序时注意事件的具体名称。', approximate: false };
  if (event.id === 'opium') return { ...event, name: '第一次鸦片战争爆发', description: '1840年战争爆发，1842年清政府签订《南京条约》。', approximate: false };
  if (event.id === 'xinhai') return { ...event, description: '1911年武昌起义推动辛亥革命；1912年清帝退位。', significance: '结束了中国延续两千多年的君主专制制度。', approximate: false };
  return { ...event, approximate: false };
});
export const HISTORY_ERAS = { Ancient: '先秦', Imperial: '秦汉至明清', Modern: '近现代', mixed: '跨时代' } as const;
export const HISTORY_SOURCES = [
  { title: '中国国家博物馆 · 古代中国', url: 'https://www.chnmuseum.cn/portals/0/web/zt/gudai/default.html?d=123' },
  { title: '南京地方志 · 孙权229年称帝', url: 'https://dfz.nanjing.gov.cn/gzdt/202403/t20240315_4186987.html' },
  { title: '赛努奇博物馆 · 隋唐', url: 'https://www.cernuschi.paris.fr/zh-hans/collections/zhong-guo-guan-cang/sui-tang' },
];

export interface PracticePuzzle {
  id: string; question: string; answer: string; options: string[]; explanation: string; hints: string[];
  category: 'LOGIC' | 'WORDPLAY' | 'HUMOR' | 'PARADOX'; difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}
const puzzle = (id: string, category: PracticePuzzle['category'], difficulty: PracticePuzzle['difficulty'], question: string, answer: string, others: string[], explanation: string, hints: string[]): PracticePuzzle =>
  ({ id, category, difficulty, question, answer, options: [answer, ...others], explanation, hints });
export const PRACTICE_PUZZLES = [
  puzzle('BT_001', 'LOGIC', 'MEDIUM', '早晨四条腿，中午两条腿，晚上三条腿，指的是什么？', '人', ['桌子', '时钟', '一匹马'], '早中晚比喻人生：婴儿爬行、成人站立、老人拄拐。不是一天中真的变换腿数。', ['把一天换成人的一生。', '第三条“腿”是一件工具。']),
  puzzle('BT_002', 'WORDPLAY', 'EASY', '什么东西有两条腿，却不能自己走路？', '裤子', ['小鸟', '人', '袋鼠'], '“裤腿”借用了腿的名称，却不是能活动的肢体。', ['它穿在身上。', '这里的腿是衣物的一部分。']),
  puzzle('BT_003', 'LOGIC', 'EASY', '什么东西属于你，却往往是别人用得更多？', '你的名字', ['你的牙刷', '你的鞋', '你的眼睛'], '别人称呼你时会用你的名字，你自己反而较少用名字称呼自己。', ['它是一种称呼。', '想想别人如何叫你。']),
  puzzle('BT_004', 'LOGIC', 'MEDIUM', '海上漂浮的冰山，为什么通常由淡水冰组成？', '它来自陆地冰川', ['海水本来就是淡的', '海水的盐全部蒸发了', '鱼把盐吃掉了'], '冰山主要是陆地冰川或冰架崩裂形成的，冰川由积雪压实而来。冰山与海水冻结形成的海冰不是同一个概念。', ['先分清冰山和海冰。', '想想冰川的水来自哪里。']),
  puzzle('BT_005', 'WORDPLAY', 'EASY', '谜面“什么路最窄”，哪一个成语最贴切？', '冤家路窄', ['四通八达', '一路平安', '路不拾遗'], '这是成语文字游戏。“冤家路窄”形容不愿相见的人偏偏碰见，并不是在比较道路宽度。', ['答案中有“路”。', '不想遇见的人又见面了。']),
  puzzle('BT_006', 'HUMOR', 'EASY', '冬瓜、黄瓜、西瓜、南瓜，哪一个“瓜”不是食物？', '傻瓜', ['冬瓜', '西瓜', '黄瓜'], '“傻瓜”是对人的称呼，不是植物的果实。这样的称呼可能伤人，不要用来嘲笑同学。', ['注意词语的不同含义。', '它是一个称呼。']),
  puzzle('BT_007', 'LOGIC', 'EASY', '走过湿沙滩后，一阵海浪涌来，脚印为什么不见了？', '海浪冲平了沙面', ['脚印飞走了', '沙子变成了石头', '脚印只在夜晚出现'], '水流搬运沙粒，重新铺平沙面，脚印便被抹去。这里需要物理原因，不是文字陷阱。', ['注意脚印消失前发生了什么。', '沙粒会随水流移动。']),
  puzzle('BT_008', 'WORDPLAY', 'HARD', '十进制的2，用哪一种进制写成10？', '二进制', ['十进制', '八进制', '十六进制'], '二进制每一位逢二进一，因此10表示1个二加0个一，也就是十进制的2。', ['改变记数的规则。', '每一位只有0和1。']),
  puzzle('BT_009', 'LOGIC', 'MEDIUM', '赛跑时超过了第二名，你现在排第几？', '第二名', ['第一名', '第三名', '无法确定'], '超过第二名后，你占据原来第二名的位置；第一名仍在前面。', ['你替代的是谁的位置？']),
  puzzle('BT_010', 'LOGIC', 'MEDIUM', '抽屉里只有红袜和蓝袜，摸黑至少拿几只，保证有两只同色？', '3只', ['2只', '4只', '5只'], '最坏情况下前两只一红一蓝，第三只无论什么颜色，都会和其中一只配成同色。', ['先考虑最不走运的情况。', '只有两种颜色。']),
  puzzle('BT_011', 'LOGIC', 'HARD', '3台相同机器3分钟生产3件产品，9台机器生产9件需要多久？', '3分钟', ['1分钟', '9分钟', '27分钟'], '一台机器3分钟生产1件，9台同时工作，3分钟即可生产9件。机器数量和产品数量同时扩大三倍。', ['先算一台机器生产一件的时间。']),
  puzzle('BT_012', 'WORDPLAY', 'EASY', '“一口咬掉牛尾巴”打一汉字。', '告', ['午', '生', '先'], '“牛”去掉向下的尾笔，下面加“口”，合起来是“告”。这是拆字谜。', ['“口”也是组成字的部件。']),
  puzzle('BT_013', 'HUMOR', 'EASY', '什么门永远关不上？（文字游戏）', '球门', ['房门', '柜门', '车门'], '球门里的“门”指运动场上的目标框，不是装了门扇的出入口。', ['去运动场找。']),
  puzzle('BT_014', 'PARADOX', 'HARD', '有人只说：“我现在说的这句话是假的。”这句话有什么问题？', '真假判断会产生矛盾', ['一定为真', '一定为假', '没有任何矛盾'], '若它为真，它说自己是假的；若它为假，则它声称的“为假”不成立。这是自指的说谎者悖论。', ['分别假设它是真的、假的。', '这句话正在评价它自己。']),
  puzzle('BT_015', 'PARADOX', 'MEDIUM', '一艘木船的所有木板逐块换新后，“还是原来那艘船吗？”最合理的理解是？', '取决于怎样定义同一性', ['一定不是船', '一定没有发生变化', '只能按木板颜色判断'], '这是忒修斯之船问题。材料连续性、结构、功能和历史连续性可导向不同判断，不能只用一个事实作唯一答案。', ['“同一艘”可以有不同标准。']),
  puzzle('BT_016', 'LOGIC', 'MEDIUM', '一张纸连续对折3次，展开后共有多少个等面积区域？', '8个', ['3个', '6个', '9个'], '每次对折都使层数加倍：2、4、8。假设每次都对半折且折痕把区域分开。', ['每次都乘以2。']),
];
export const PUZZLE_CATEGORIES = { all: '全部', LOGIC: '逻辑推理', WORDPLAY: '文字谜语', HUMOR: '趣味转弯', PARADOX: '思辨悖论' } as const;

export interface PracticeWord { id: number; word: string; phonetic: string; definition: string; example: string; translation: string; category: 'primary' | 'cosmos' | 'ielts'; }
const words = (category: PracticeWord['category'], rows: [number, string, string, string, string, string][]): PracticeWord[] =>
  rows.map(([id, word, phonetic, definition, example, translation]) => ({ id, word, phonetic, definition, example, translation, category }));
export const PRACTICE_WORDS = [
  ...words('primary', [
    [101, 'Apple', '/ˈæp.əl/', '苹果', 'I like eating apples.', '我喜欢吃苹果。'],
    [102, 'School', '/skuːl/', '学校', 'The kids are at school.', '孩子们在学校。'],
    [103, 'Water', '/ˈwɔːtə/', '水', 'Plants need water.', '植物需要水。'],
    [104, 'Garden', '/ˈɡɑːdən/', '花园', 'We grow flowers in the garden.', '我们在花园里种花。'],
    [105, 'Cloud', '/klaʊd/', '云', 'A white cloud moves across the sky.', '一朵白云飘过天空。'],
    [106, 'River', '/ˈrɪvə/', '河流', 'The river flows through the town.', '这条河流经小镇。'],
    [107, 'Light', '/laɪt/', '光；光线', 'Light comes through the window.', '光从窗户照进来。'],
    [108, 'Shape', '/ʃeɪp/', '形状', 'What shape is the moon tonight?', '今晚月亮是什么形状？'],
    [109, 'Color', '/ˈkʌlə/', '颜色', 'Blue is my favorite color.', '蓝色是我最喜欢的颜色。'],
    [110, 'Picture', '/ˈpɪktʃə/', '图片；图画', 'Draw a picture of your home.', '画一幅你家的图画。'],
    [111, 'Friend', '/frend/', '朋友', 'My friend helps me read.', '我的朋友帮助我阅读。'],
    [112, 'Family', '/ˈfæməli/', '家庭；家人', 'My family eats together.', '我的家人一起吃饭。'],
    [113, 'Listen', '/ˈlɪsən/', '听；倾听', 'Listen to the birds.', '听鸟儿的声音。'],
    [114, 'Build', '/bɪld/', '建造', 'We build a small house.', '我们建造一座小房子。'],
  ]),
  ...words('cosmos', [
    [201, 'Earth', '/ɜːθ/', '地球', 'Earth is our home planet.', '地球是我们的家园星球。'],
    [202, 'Moon', '/muːn/', '月球', 'The Moon travels around Earth.', '月球绕地球运行。'],
    [203, 'Sun', '/sʌn/', '太阳', 'The Sun is a star.', '太阳是一颗恒星。'],
    [204, 'Star', '/stɑː/', '恒星；星', 'We can see many stars at night.', '夜晚我们能看到许多星星。'],
    [205, 'Planet', '/ˈplænɪt/', '行星', 'Mars is a planet.', '火星是一颗行星。'],
    [206, 'Space', '/speɪs/', '太空', 'Astronauts travel into space.', '宇航员进入太空。'],
    [207, 'Orbit', '/ˈɔːbɪt/', '轨道；绕轨道运行', 'Earth moves in an orbit around the Sun.', '地球沿轨道绕太阳运行。'],
    [208, 'Galaxy', '/ˈɡæləksi/', '星系', 'Our solar system is in the Milky Way galaxy.', '我们的太阳系位于银河系中。'],
    [209, 'Telescope', '/ˈtelɪskəʊp/', '望远镜', 'A telescope helps us observe distant stars.', '望远镜帮助我们观测遥远的恒星。'],
    [210, 'Gravity', '/ˈɡrævəti/', '重力；引力', 'Gravity keeps the Moon in orbit around Earth.', '引力使月球沿轨道绕地球运行。'],
    [211, 'Comet', '/ˈkɒmɪt/', '彗星', 'A comet may develop a bright tail near the Sun.', '彗星靠近太阳时可能形成明亮的尾巴。'],
    [212, 'Satellite', '/ˈsætəlaɪt/', '卫星', 'The Moon is a natural satellite.', '月球是一颗天然卫星。'],
    [213, 'Crater', '/ˈkreɪtə/', '陨石坑；火山口', 'We can see many craters on the Moon.', '我们能在月球上看到许多陨石坑。'],
    [214, 'Astronaut', '/ˈæstrənɔːt/', '宇航员', 'The astronaut works on the space station.', '宇航员在空间站工作。'],
  ]),
  ...words('ielts', [
    [901, 'Envisage', '/ɪnˈvɪzɪdʒ/', '想象；设想', "It is hard to envisage how it might happen.", '很难想象这件事会如何发生。'],
    [902, 'Pragmatic', '/præɡˈmætɪk/', '务实的', 'We need a pragmatic approach to the problem.', '我们需要用务实的方法解决问题。'],
    [903, 'Mitigate', '/ˈmɪtɪɡeɪt/', '缓和；减轻', 'Trees help mitigate the effects of urban heat.', '树木有助于减轻城市高温的影响。'],
    [904, 'Evidence', '/ˈevɪdəns/', '证据', 'The evidence supports her conclusion.', '证据支持她的结论。'],
    [905, 'Sustain', '/səˈsteɪn/', '维持；支持', 'Clean water helps sustain life.', '清洁的水有助于维持生命。'],
    [906, 'Diverse', '/daɪˈvɜːs/', '多种多样的', 'The forest is home to diverse species.', '森林是多种多样物种的家园。'],
    [907, 'Allocate', '/ˈæləkeɪt/', '分配', 'We allocate time for reading every day.', '我们每天分配时间阅读。'],
    [908, 'Coherent', '/kəʊˈhɪərənt/', '连贯的；条理清楚的', 'She gave a coherent explanation.', '她作出了条理清楚的解释。'],
    [909, 'Evaluate', '/ɪˈvæljueɪt/', '评估', 'We evaluate the results carefully.', '我们仔细评估这些结果。'],
    [910, 'Resilient', '/rɪˈzɪliənt/', '有韧性的；能复原的', 'The community became more resilient.', '这个社区变得更有韧性。'],
  ]),
];
export const WORD_CATEGORIES = { primary: '日常词汇', cosmos: '宇宙词汇', ielts: '进阶词汇' } as const;

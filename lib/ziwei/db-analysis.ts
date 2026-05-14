export type TopicKey =
  | 'overview'
  | 'personality'
  | 'love'
  | 'career'
  | 'wealth'
  | 'health'
  | 'family'
  | 'children'
  | 'move'
  | 'friends'
  | 'home'
  | 'spirit'
  | 'parents';

export const TOPIC_LABEL: Record<TopicKey, string> = {
  overview: '命格总览',
  personality: '性格',
  love: '夫妻',
  career: '官禄',
  wealth: '财帛',
  health: '疾厄',
  family: '兄弟',
  children: '子女',
  move: '迁移',
  friends: '交友',
  home: '田宅',
  spirit: '福德',
  parents: '父母',
};

export const TOPIC_PALACE_NAME: Record<TopicKey, string> = {
  overview: '命',
  personality: '命',
  love: '夫妻',
  career: '官禄',
  wealth: '财帛',
  health: '疾厄',
  family: '兄弟',
  children: '子女',
  move: '迁移',
  friends: '交友',
  home: '田宅',
  spirit: '福德',
  parents: '父母',
};

interface StarAnalysis {
  mingGong: string;
  personality: string;
  xiongDi: string;
  fuQi: string;
  ziNv: string;
  caiBo: string;
  jiE: string;
  qianYi: string;
  jiaoYou: string;
  guanLu: string;
  tianZhai: string;
  fuDe: string;
  fuMu: string;
}

const STAR_BRIEF: Record<string, string> = {
  '紫微': '紫微为帝星，主尊贵、统御与承担。',
  '天机': '天机为智慧星，主机变、策划与思辨。',
  '太阳': '太阳为光明星，主名誉、外放与照拂。',
  '武曲': '武曲为财星，主执行、纪律与财务。',
  '天同': '天同为福星，主温和、享受与人缘。',
  '廉贞': '廉贞主规矩、才艺、感情与边界。',
  '天府': '天府为库星，主稳重、守成与资源。',
  '太阴': '太阴主细腻、田宅、积累与照顾。',
  '贪狼': '贪狼主欲望、才艺、社交与变化。',
  '巨门': '巨门主口才、疑虑、辨析与是非。',
  '天相': '天相主辅佐、制度、协调与印信。',
  '天梁': '天梁主荫护、原则、长辈与解厄。',
  '七杀': '七杀主决断、压力、开创与孤勇。',
  '破军': '破军主破旧、变革、消耗与重建。',
};

function section(star: string, palace: string, angle: string): string {
  const brief = STAR_BRIEF[star] ?? `${star}为紫微斗数十四主星之一。`;
  return `**【一句话定调】**
${star}入${palace}宫，重点看${angle}，再合参三方四正、四化与煞曜。

**【核心论断】**
${brief}落在${palace}宫时，不可只按单星下断，应看同宫主星、辅曜、煞曜和生年四化。若逢化禄、化权、化科，主该宫领域更容易显出机会；若逢化忌或重煞，则该宫领域多有压力、执念或反复。

**【命盘依据】**
判断顺序以本宫星曜为体，三方四正为用，对宫为空宫时需借对宫主星。大限、流年只作为时间触发，不改变本命盘的基础结构。

**【经典出处】**
本条为站内知识库基础条目，供排盘结果页和 SEO 页面使用；具体断语仍以完整命盘为准。`;
}

function buildStar(star: string): StarAnalysis {
  return {
    mingGong: section(star, '命', '命主性格、格局和人生主轴'),
    personality: section(star, '命', '性情气质、行为方式和人生选择'),
    xiongDi: section(star, '兄弟', '手足、同辈、合伙与竞争关系'),
    fuQi: section(star, '夫妻', '伴侣关系、婚姻模式与感情压力'),
    ziNv: section(star, '子女', '子女缘、下属缘与创造力表达'),
    caiBo: section(star, '财帛', '赚钱方式、现金流与财务习惯'),
    jiE: section(star, '疾厄', '身体倾向、压力出口与调养重点'),
    qianYi: section(star, '迁移', '外出发展、环境变化与社会机会'),
    jiaoYou: section(star, '交友', '朋友、团队、客户与协作关系'),
    guanLu: section(star, '官禄', '事业路径、职业角色与成就方式'),
    tianZhai: section(star, '田宅', '家庭、不动产、资产沉淀与安全感'),
    fuDe: section(star, '福德', '精神状态、享受方式与内在福分'),
    fuMu: section(star, '父母', '父母缘、文书契约与长辈助力'),
  };
}

export const STAR_DB: Record<string, StarAnalysis> = Object.fromEntries(
  Object.keys(STAR_BRIEF).map(star => [star, buildStar(star)]),
) as Record<string, StarAnalysis>;

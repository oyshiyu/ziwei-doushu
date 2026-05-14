import { detectPatterns, type Pattern } from './patterns';
import type { Palace, Star, ZiweiChart } from './types';

export type InsightKind = 'summary' | 'focus' | 'expanded';

export interface EvidenceItem {
  label: string;
  value: string;
}

export interface InsightEvidence {
  title: string;
  tags: string[];
  items: EvidenceItem[];
}

export interface InsightStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SavedInsightEntry {
  id: string;
  chartId: string;
  kind: InsightKind;
  title: string;
  content: string;
  evidence: InsightEvidence;
  focusKey?: string;
  createdAt: string;
}

export interface CreateSavedInsightEntryInput {
  chartId: string;
  kind: InsightKind;
  title: string;
  content: string;
  evidence: InsightEvidence;
  focusKey?: string;
}

export interface FocusEvidenceInput {
  kind: 'topic' | 'star' | 'palace' | 'sihua';
  key: string;
  label: string;
  palace?: Palace;
  star?: Star;
  starName?: string;
  siHua?: string;
}

export interface SafeSharePayload {
  title: string;
  summary: string;
  highlights: string[];
  tags: string[];
  siteUrl: string;
  focusLabel?: string;
}

const BRANCH_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const SAVED_PREFIX = 'ziwei:insight:saved:v2';
const CACHE_PREFIX = 'ziwei:insight:cache:v2';
const SITE_URL = 'wdyziweidoushu666.com';

const TOPIC_TO_PALACE: Record<string, string[]> = {
  overview: ['命宫', '财帛', '官禄', '迁移'],
  love: ['夫妻', '福德'],
  career: ['官禄', '财帛', '迁移'],
  wealth: ['财帛', '田宅'],
  health: ['疾厄', '福德'],
  personality: ['命宫', '福德'],
};

export function getChartInsightId(chart: ZiweiChart): string {
  return stableHash(JSON.stringify(buildChartSignature(chart)));
}

export function getInsightCacheKey(chart: ZiweiChart, target: InsightKind | 'chat', focusKey: string): string {
  return `${CACHE_PREFIX}:${getChartInsightId(chart)}:${target}:${stableHash(focusKey)}`;
}

export function getSavedInsightStorageKey(chartId: string): string {
  return `${SAVED_PREFIX}:${chartId}`;
}

export function buildSummaryEvidence(chart: ZiweiChart): InsightEvidence {
  const ming = getPalaceByBranch(chart, chart.mingGongBranch);
  const shen = getPalaceByBranch(chart, chart.shenGongBranch);
  const patterns = safePatterns(chart);
  const siHua = collectSiHua(chart);
  const currentDaXian = chart.daXians?.[chart.currentDaXianIndex];
  const items = compactItems([
    { label: '命宫', value: describePalaceName(ming) },
    { label: '身宫', value: describePalaceName(shen) },
    { label: '命宫主星', value: describeMajorStars(ming) },
    { label: '四化', value: siHua.length ? siHua.slice(0, 4).join('、') : '未见明显四化标记' },
    { label: '格局', value: describePatterns(patterns) },
    currentDaXian
      ? { label: '当前大限', value: `${currentDaXian.startAge}-${currentDaXian.endAge}岁 · ${currentDaXian.palaceName}` }
      : null,
  ]);

  return {
    title: '命盘依据',
    tags: buildPublicTags(chart, patterns, undefined),
    items,
  };
}

export function buildFocusEvidence(chart: ZiweiChart, focus: FocusEvidenceInput): InsightEvidence {
  const patterns = safePatterns(chart);
  const topicPalaces = focus.kind === 'topic' ? getTopicPalaces(chart, focus.key) : [];
  const palace = focus.palace ?? topicPalaces[0] ?? findStarPalace(chart, focus.starName ?? focus.star?.name ?? '');
  const items = compactItems([
    { label: '当前焦点', value: focus.label },
    focus.kind === 'star' && focus.star
      ? { label: '星曜', value: `${focus.star.name}${focus.star.siHua ? `化${focus.star.siHua}` : ''}` }
      : null,
    focus.kind === 'sihua' && focus.starName && focus.siHua
      ? { label: '四化', value: `${focus.starName}化${focus.siHua}` }
      : null,
    palace ? { label: '所在宫位', value: describePalaceName(palace) } : null,
    palace ? { label: '主星', value: describeMajorStars(palace) } : null,
    focus.kind === 'topic' && topicPalaces.length > 1
      ? { label: '相关宫位', value: topicPalaces.map(item => item.name).join('、') }
      : null,
    { label: '格局', value: describePatterns(patterns) },
  ]);

  return {
    title: '命盘依据',
    tags: buildPublicTags(chart, patterns, focus.label),
    items,
  };
}

export function createSavedInsightEntry(input: CreateSavedInsightEntryInput): SavedInsightEntry {
  return {
    ...input,
    id: `insight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
}

export function loadSavedInsightEntries(storage: InsightStorageLike, chartId: string): SavedInsightEntry[] {
  let raw: string | null = null;
  try {
    raw = storage.getItem(getSavedInsightStorageKey(chartId));
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedInsightEntry);
  } catch {
    return [];
  }
}

export function saveInsightEntry(storage: InsightStorageLike, entry: SavedInsightEntry): SavedInsightEntry[] {
  const current = loadSavedInsightEntries(storage, entry.chartId);
  const withoutSame = current.filter(item => !(item.kind === entry.kind && item.focusKey === entry.focusKey));
  const next = [entry, ...withoutSame].slice(0, 12);
  try {
    storage.setItem(getSavedInsightStorageKey(entry.chartId), JSON.stringify(next));
  } catch {
    return current;
  }
  return next;
}

export function deleteSavedInsightEntry(storage: InsightStorageLike, chartId: string, entryId: string): SavedInsightEntry[] {
  const next = loadSavedInsightEntries(storage, chartId).filter(item => item.id !== entryId);
  try {
    storage.setItem(getSavedInsightStorageKey(chartId), JSON.stringify(next));
  } catch {
    return loadSavedInsightEntries(storage, chartId);
  }
  return next;
}

export function sanitizeShareText(value: string, sensitiveTerms: string[] = []): string {
  let next = value;
  for (const term of sensitiveTerms.filter(Boolean)) {
    next = next.replaceAll(term, '[已脱敏]');
  }
  return next
    .replace(/https?:\/\/[^\s?]+\/chart\?[^\s，。；、)）]+/g, '[已脱敏链接]')
    .replace(/\/chart\?[^\s，。；、)）]+/g, '[已脱敏链接]')
    .replace(/\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日?/g, '[已脱敏日期]')
    .replace(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/g, '[已脱敏日期]')
    .replace(/\d{1,2}\s*:\s*\d{2}/g, '[已脱敏时间]')
    .replace(/(?:经度|纬度|longitude|latitude|lng|lat)[:：]?\s*-?\d+(?:\.\d+)?/gi, '[已脱敏坐标]')
    .replace(/-?\d{2,3}\.\d{2,}/g, '[已脱敏坐标]')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildSafeSharePayload(input: {
  chart: ZiweiChart;
  summary: string;
  focusLabel?: string;
  focusInsight?: string;
}): SafeSharePayload {
  const patterns = safePatterns(input.chart);
  const sensitiveTerms = [
    input.chart.birthInfo.city,
    input.chart.birthInfo.province,
    input.chart.birthInfo.name,
  ].filter((value): value is string => Boolean(value));
  const summary = sanitizeShareText(input.summary, sensitiveTerms);
  const focusLines = sanitizeShareText(input.focusInsight ?? '', sensitiveTerms)
    .split(/\r?\n/)
    .map(line => line.replace(/^(\d+[.、]|[-•])\s*/, '').trim())
    .filter(Boolean)
    .filter(line => !/^【.+】$/.test(line));

  return {
    title: '紫微命盘摘要',
    summary,
    highlights: focusLines.slice(0, 3),
    tags: buildPublicTags(input.chart, patterns, input.focusLabel).slice(0, 5),
    siteUrl: SITE_URL,
    focusLabel: input.focusLabel,
  };
}

function buildChartSignature(chart: ZiweiChart) {
  return {
    mingGongBranch: chart.mingGongBranch,
    shenGongBranch: chart.shenGongBranch,
    wuxingJu: chart.wuxingJu,
    palaces: chart.palaces
      .slice()
      .sort((a, b) => a.branch - b.branch)
      .map(palace => ({
        branch: palace.branch,
        stem: palace.stem,
        name: palace.name,
        isMingGong: palace.isMingGong,
        isShenGong: palace.isShenGong,
        borrowedStars: palace.borrowedStars ?? [],
        stars: palace.stars.map(star => ({
          name: star.name,
          type: star.type,
          siHua: star.siHua,
          brightness: star.brightness,
        })),
        selfSihua: palace.selfSihua ?? [],
      })),
  };
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

function getPalaceByBranch(chart: ZiweiChart, branch: number): Palace | undefined {
  return chart.palaces.find(palace => palace.branch === branch);
}

function findStarPalace(chart: ZiweiChart, starName: string): Palace | undefined {
  if (!starName) return undefined;
  return chart.palaces.find(palace => palace.stars.some(star => star.name === starName));
}

function getTopicPalaces(chart: ZiweiChart, focusKey: string): Palace[] {
  const topicKey = focusKey.replace(/^topic:/, '');
  const names = TOPIC_TO_PALACE[topicKey] ?? [];
  return names
    .map(name => chart.palaces.find(palace => normalizePalaceName(palace.name) === normalizePalaceName(name)))
    .filter((palace): palace is Palace => Boolean(palace));
}

function describePalaceName(palace?: Palace): string {
  if (!palace) return '未识别';
  const branch = BRANCH_NAMES[palace.branch] ?? '';
  const flags = [palace.isMingGong ? '命宫' : '', palace.isShenGong ? '身宫' : ''].filter(Boolean);
  return `${palace.name}${branch ? `（${branch}）` : ''}${flags.length ? ` · ${flags.join('、')}` : ''}`;
}

function describeMajorStars(palace?: Palace): string {
  if (!palace) return '未识别';
  const stars = palace.stars
    .filter(star => star.type === 'major')
    .map(star => `${star.name}${star.siHua ? `化${star.siHua}` : ''}`);
  if (stars.length) return stars.join('、');
  if (palace.borrowedStars?.length) return `空宫，借${palace.borrowedFromName ?? '对宫'}：${palace.borrowedStars.join('、')}`;
  return '空宫';
}

function collectSiHua(chart: ZiweiChart): string[] {
  return chart.palaces.flatMap(palace =>
    palace.stars
      .filter(star => star.siHua)
      .map(star => `${star.name}化${star.siHua}（${palace.name}）`)
  );
}

function safePatterns(chart: ZiweiChart): Pattern[] {
  try {
    return detectPatterns(chart);
  } catch {
    return [];
  }
}

function describePatterns(patterns: Pattern[]): string {
  return patterns.length
    ? patterns.slice(0, 3).map(pattern => pattern.name).join('、')
    : '未触发显著格局';
}

function buildPublicTags(chart: ZiweiChart, patterns: Pattern[], focusLabel?: string): string[] {
  const ming = getPalaceByBranch(chart, chart.mingGongBranch);
  return [
    `命宫：${describeMajorStars(ming)}`,
    `身宫：${BRANCH_NAMES[chart.shenGongBranch] ?? ''}`,
    chart.wuxingJuName,
    patterns[0] ? `格局：${patterns[0].name}` : '',
    focusLabel ? `焦点：${focusLabel}` : '',
  ].filter(Boolean);
}

function compactItems(items: Array<EvidenceItem | null>): EvidenceItem[] {
  return items
    .filter((item): item is EvidenceItem => Boolean(item))
    .filter(item => item.value.trim().length > 0);
}

function normalizePalaceName(value: string): string {
  return value.endsWith('宫') && value !== '命宫' ? value.slice(0, -1) : value;
}

function isSavedInsightEntry(value: unknown): value is SavedInsightEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as SavedInsightEntry;
  return typeof entry.id === 'string'
    && typeof entry.chartId === 'string'
    && typeof entry.title === 'string'
    && typeof entry.content === 'string'
    && typeof entry.createdAt === 'string'
    && (entry.kind === 'summary' || entry.kind === 'focus' || entry.kind === 'expanded');
}

import assert from 'node:assert/strict';
import { generateChart } from '../lib/ziwei/algorithm';
import {
  buildFocusEvidence,
  buildSafeSharePayload,
  buildSummaryEvidence,
  createSavedInsightEntry,
  deleteSavedInsightEntry,
  getChartInsightId,
  getInsightCacheKey,
  loadSavedInsightEntries,
  saveInsightEntry,
  sanitizeShareText,
  type InsightStorageLike,
} from '../lib/ziwei/insight-workbench';

function memoryStorage(): InsightStorageLike {
  const state = new Map<string, string>();
  return {
    getItem: key => state.get(key) ?? null,
    setItem: (key, value) => { state.set(key, value); },
    removeItem: key => { state.delete(key); },
  };
}

const chartA = generateChart({
  year: 2000,
  month: 8,
  day: 16,
  hour: 2,
  gender: 'female',
  city: '北京',
  longitude: 116.4,
});

const chartB = generateChart({
  year: 2001,
  month: 3,
  day: 26,
  hour: 7,
  gender: 'male',
  city: '上海',
  longitude: 121.47,
});

const idA = getChartInsightId(chartA);
const idARepeat = getChartInsightId(chartA);
const idAOtherBirth = getChartInsightId({ ...chartA, birthInfo: { ...chartA.birthInfo, city: '广州', year: 1999 } });
const idB = getChartInsightId(chartB);

assert.equal(idA, idARepeat, 'chart id should be stable for the same chart');
assert.equal(idA, idAOtherBirth, 'chart id should derive from chart structure, not raw birth fields');
assert.notEqual(idA, idB, 'different chart structures should get different ids');
assert.doesNotMatch(idA, /2000年8月16日|2000-8-16|北京|116\.4/, 'chart id must not expose raw birth information');
assert.doesNotMatch(getInsightCacheKey(chartA, 'summary', 'root'), /2000年8月16日|2000-8-16|北京|116\.4/, 'cache key must stay privacy-safe');

const summaryEvidence = buildSummaryEvidence(chartA);
assert.equal(summaryEvidence.title, '命盘依据');
assert.ok(summaryEvidence.items.some(item => item.label === '命宫'), 'summary evidence should include 命宫');
assert.ok(summaryEvidence.items.some(item => item.label === '身宫'), 'summary evidence should include 身宫');
assert.ok(summaryEvidence.items.some(item => item.label === '命宫主星'), 'summary evidence should include 命宫主星');

const palace = chartA.palaces.find(item => item.name === '夫妻');
assert.ok(palace);
const focusEvidence = buildFocusEvidence(chartA, {
  kind: 'palace',
  label: palace.name,
  key: `palace:${palace.branch}`,
  palace,
});
assert.ok(focusEvidence.items.some(item => item.label === '当前焦点' && item.value.includes('夫妻')));
assert.ok(focusEvidence.items.some(item => item.label === '主星'), 'palace focus evidence should include palace stars');

const loveTopicEvidence = buildFocusEvidence(chartA, {
  kind: 'topic',
  key: 'topic:love',
  label: '感情',
});
assert.ok(
  loveTopicEvidence.items.some(item => item.label === '当前焦点' && item.value === '感情'),
  'love topic evidence should preserve the active topic label'
);
assert.ok(
  loveTopicEvidence.items.some(item => item.label === '所在宫位' && item.value.includes('夫妻')),
  'love topic evidence should start from the spouse palace'
);
assert.ok(
  loveTopicEvidence.items.some(item => item.label === '相关宫位' && item.value.includes('夫妻') && item.value.includes('福德')),
  'love topic evidence should show the related spouse and fortune palaces'
);
assert.ok(
  loveTopicEvidence.tags.some(tag => tag === '焦点：感情'),
  'love topic evidence should expose a public focus tag'
);

const wealthTopicEvidence = buildFocusEvidence(chartA, {
  kind: 'topic',
  key: 'topic:wealth',
  label: '财运',
});
assert.ok(
  wealthTopicEvidence.items.some(item => item.label === '当前焦点' && item.value === '财运'),
  'wealth topic evidence should preserve the active topic label'
);
assert.ok(
  wealthTopicEvidence.items.some(item => item.label === '所在宫位' && item.value.includes('财帛')),
  'wealth topic evidence should start from the wealth palace'
);
assert.ok(
  wealthTopicEvidence.items.some(item => item.label === '相关宫位' && item.value.includes('财帛') && item.value.includes('田宅')),
  'wealth topic evidence should show the related wealth and property palaces'
);
assert.ok(
  wealthTopicEvidence.tags.some(tag => tag === '焦点：财运'),
  'wealth topic evidence should expose a public focus tag'
);

const storage = memoryStorage();
const savedA = createSavedInsightEntry({
  chartId: idA,
  kind: 'summary',
  title: '核心摘要',
  content: '这是 A 命盘摘要',
  evidence: summaryEvidence,
});
const savedB = createSavedInsightEntry({
  chartId: idB,
  kind: 'summary',
  title: '核心摘要',
  content: '这是 B 命盘摘要',
  evidence: buildSummaryEvidence(chartB),
});

saveInsightEntry(storage, savedA);
saveInsightEntry(storage, savedB);
assert.deepEqual(loadSavedInsightEntries(storage, idA).map(entry => entry.content), ['这是 A 命盘摘要']);
assert.deepEqual(loadSavedInsightEntries(storage, idB).map(entry => entry.content), ['这是 B 命盘摘要']);
deleteSavedInsightEntry(storage, idA, savedA.id);
assert.equal(loadSavedInsightEntries(storage, idA).length, 0);
assert.equal(loadSavedInsightEntries(storage, idB).length, 1);

const unsafeText = '2000年8月16日生于北京，经度116.4，另记 2000-8-16，链接 /chart?y=2000&m=8&d=16&c=北京。核心观察保留。';
const sanitized = sanitizeShareText(unsafeText, ['北京', '上海']);
assert.doesNotMatch(sanitized, /2000年8月16日|2000-8-16|北京|116\.4|\/chart\?y=/);
assert.match(sanitized, /核心观察保留/);

const sharePayload = buildSafeSharePayload({
  chart: chartA,
  summary: unsafeText,
  focusLabel: '夫妻宫',
  focusInsight: '重点一\n重点二\n重点三\n重点四',
});
const shareText = [
  sharePayload.title,
  sharePayload.summary,
  sharePayload.highlights.join('\n'),
  sharePayload.tags.join('\n'),
  sharePayload.siteUrl,
].join('\n');
assert.doesNotMatch(shareText, /2000年8月16日|2000-8-16|北京|116\.4|\/chart\?y=/);
assert.ok(sharePayload.highlights.length <= 3, 'share payload should expose at most three highlights');
assert.ok(sharePayload.tags.some(tag => tag.includes('命宫')), 'share tags should include public chart labels');

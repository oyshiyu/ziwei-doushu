'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ZiweiChart, Palace, Star } from '@/lib/ziwei/types';
import type { TimeView } from './TimeNav';
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
  type FocusEvidenceInput,
  type InsightKind,
  type InsightEvidence,
  type SafeSharePayload,
  type SavedInsightEntry,
} from '@/lib/ziwei/insight-workbench';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type LoadingTarget = 'summary' | 'focus' | 'expanded' | 'chat' | null;
type RequestTarget = Exclude<LoadingTarget, null>;
type LoadingState = Record<RequestTarget, boolean>;
type ErrorState = Partial<Record<RequestTarget, string>>;

interface SelectedStar {
  star: Star;
  palace: Palace;
  label: string;
}

interface SelectedSiHua {
  starName: string;
  siHua: string;
  view: TimeView;
  year?: number;
  month?: number;
}

interface InsightPanelProps {
  chart: ZiweiChart;
  selectedStar?: SelectedStar | null;
  selectedPalace?: Palace | null;
  selectedSiHua?: SelectedSiHua | null;
  onSharePayloadChange?: (payload: SafeSharePayload) => void;
}

interface FocusState {
  key: string;
  label: string;
  kind: 'topic' | 'star' | 'palace' | 'sihua';
  briefPrompt: string;
  deepPrompt: string;
  evidenceInput: FocusEvidenceInput;
}

const TOPICS = [
  { key: 'overview', label: '命格' },
  { key: 'love', label: '感情' },
  { key: 'career', label: '事业' },
  { key: 'wealth', label: '财运' },
  { key: 'health', label: '健康' },
  { key: 'personality', label: '性格' },
] as const;

const TOPIC_LABELS = Object.fromEntries(TOPICS.map(topic => [topic.key, topic.label])) as Record<string, string>;

const TOPIC_DEEP_PROMPTS: Record<string, string> = {
  overview: `请生成命格总览，按以下结构输出：

**【命格定性】**
用一句话概括这个命盘的核心格局与命主气质。

**【主星解读】**
命宫主星的核心特质，引用倪海夏原话或观点。

**【三方四正】**
财、官、迁三宫的联动分析及整体格局。

**【当前大限】**
当下大限运势方向与最值得关注的事项。

**【优势与注意】**
命盘天赋优势，以及需要注意的风险或功课。`,

  love: `请深度分析感情婚姻运，按以下结构输出：

**【感情格局】**
一句话定性感情命格。

**【夫妻宫分析】**
夫妻宫主星、四化，以及倪海夏体系的具体解读。

**【三方联动】**
相关宫位对感情的影响。

**【当前大限感情运】**
当下10年感情走向与关键节点。

**【实际建议】**
具体可行的感情建议。`,

  career: `请深度分析事业运，按以下结构输出：

**【事业格局】**
一句话定性事业命格，宜任职或宜创业。

**【官禄宫分析】**
官禄宫主星、四化，以及倪师对这种配置的判断。

**【财帛宫联动】**
财运与事业的关系，财路来源分析。

**【当前大限事业运】**
当下10年事业走向。

**【实际建议】**
适合的方向、行业与策略。`,

  wealth: `请深度分析财运，按以下结构输出：

**【财运格局】**
一句话定性财运模式，是主动财还是被动财。

**【财帛宫分析】**
财帛宫主星、四化，财富来源与流动模式。

**【田宅宫（财库）】**
积蓄能力与不动产运势分析。

**【当前大限财运】**
当下财运走向与注意事项。

**【理财建议】**
具体的财务建议。`,

  health: `请分析健康运势，按以下结构输出：

**【疾厄宫主星】**
疾厄宫星曜与健康含义。

**【主要风险】**
结合倪海夏子午流注理论，分析主要健康隐患与需关注的部位。

**【大限健康走势】**
当下健康趋势与关键时间段。

**【预防建议】**
具体注意事项与养生方向。`,

  personality: `请深度解析性格特质，按以下结构输出：

**【命宫主星性格】**
命宫主星的核心性格特质，引用倪师原话。

**【三方性格综合】**
财、官、迁三宫对性格的影响，全貌描绘。

**【人际关系模式】**
与他人互动方式、待人处世风格。

**【优势与人生课题】**
天赋优势，以及需要面对的人生功课。`,
};

const PALACE_ROLES: Record<string, string> = {
  '命宫': '自我、性格、先天格局',
  '兄弟宫': '兄弟关系、合伙人',
  '夫妻宫': '感情关系、婚姻状态',
  '子女宫': '子女缘分、下属关系',
  '财帛宫': '财运来源、收入方式',
  '疾厄宫': '身体健康、意外',
  '迁移宫': '外出机遇、人际格局',
  '交友宫': '朋友圈、贵人、小人',
  '官禄宫': '事业成就、社会地位',
  '田宅宫': '不动产、家庭环境',
  '福德宫': '精神享受、内心福分',
  '父母宫': '父母关系、文书契约',
};

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildSummaryPrompt() {
  return `请只生成命盘核心摘要，不要输出长文，不要展开理论。

格式必须严格如下：
【一句话】
不超过28个中文字符

【三条重点】
1. 不超过24个中文字符
2. 不超过24个中文字符
3. 不超过24个中文字符

【建议先看】
主题或宫位名称 + 一句话理由

总长度控制在120个中文字符左右，语气温和，不做确定性预测。`;
}

function buildFocusBriefPrompt(label: string, basis: string) {
  return `请围绕【${label}】生成当前焦点短解读，不要输出长文。

已知焦点：${basis}

格式必须严格如下：
【短结论】
一句话

【关键点】
1. ...
2. ...
3. ...

【提醒】
温和、非恐吓、可行动

每条尽量短，优先给结论，不要追加历史聊天。`;
}

function buildTopicFocus(topicKey: string): FocusState {
  const label = TOPIC_LABELS[topicKey] ?? '命格';
  return {
    key: `topic:${topicKey}`,
    label,
    kind: 'topic',
    briefPrompt: buildFocusBriefPrompt(label, `用户选择了「${label}」主题，请从该主题给出短版判断。`),
    deepPrompt: TOPIC_DEEP_PROMPTS[topicKey] ?? TOPIC_DEEP_PROMPTS.overview,
    evidenceInput: { kind: 'topic', key: `topic:${topicKey}`, label },
  };
}

function describePalace(palace: Palace) {
  const majorStars = palace.stars.filter(star => star.type === 'major');
  const starDesc = majorStars.length > 0
    ? majorStars.map(star => `${star.name}${star.siHua ? `化${star.siHua}` : ''}`).join('、')
    : '空宫（借对宫）';
  const role = PALACE_ROLES[palace.name] ?? '命盘事项';
  return { starDesc, role };
}

function buildStarFocus(selectedStar: SelectedStar): FocusState {
  const label = `${selectedStar.star.name} · ${selectedStar.palace.name}`;
  const basis = `${selectedStar.star.name}落在${selectedStar.palace.name}，请结合星曜性质、宫位事项、庙旺陷或四化给短版判断。`;

  return {
    key: `star:${selectedStar.star.name}:${selectedStar.palace.branch}`,
    label,
    kind: 'star',
    briefPrompt: buildFocusBriefPrompt(label, basis),
    evidenceInput: {
      kind: 'star',
      key: `star:${selectedStar.star.name}:${selectedStar.palace.branch}`,
      label,
      star: selectedStar.star,
      palace: selectedStar.palace,
    },
    deepPrompt: `请重点分析【${selectedStar.star.name}】在【${selectedStar.palace.name}】的含义，按以下结构输出：

**【星曜定性】**
${selectedStar.star.name}的核心性质，以及落在${selectedStar.palace.name}后的整体判断。

**【宫位影响】**
此星对${selectedStar.palace.name}主管事项的具体影响，结合庙旺陷、四化或空宫借对宫情况说明。

**【三方四正联动】**
结合该宫三方四正，说明它如何影响命主现实中的选择、机会与风险。

**【实际建议】**
给出具体、可执行的建议。`,
  };
}

function buildPalaceFocus(palace: Palace): FocusState {
  const { starDesc, role } = describePalace(palace);
  const basis = `${palace.name}主管${role}，主星为${starDesc}。`;

  return {
    key: `palace:${palace.branch}`,
    label: palace.name,
    kind: 'palace',
    briefPrompt: buildFocusBriefPrompt(palace.name, basis),
    evidenceInput: { kind: 'palace', key: `palace:${palace.branch}`, label: palace.name, palace },
    deepPrompt: `请重点分析【${palace.name}】（主管：${role}），该宫主星为${starDesc}，按以下结构输出：

**【宫位定性】**
${palace.name}在命盘中的意义，以及这种星曜配置的整体判断。

**【主星解读】**
主星在此宫的倪海夏体系解读，引用具体观点。

**【三方四正联动】**
三方四正宫位对此宫的影响。

**【实际建议】**
基于此宫的具体建议。`,
  };
}

function buildSiHuaFocus(chart: ZiweiChart, selectedSiHua: SelectedSiHua): FocusState {
  const palaceOfStar = chart.palaces.find(palace =>
    palace.stars.some(star => star.name === selectedSiHua.starName)
  );
  const palaceName = palaceOfStar?.name ?? '未知宫位';
  const viewLabel =
    selectedSiHua.view === 'daxian'
      ? '大限'
      : selectedSiHua.view === 'liuyue'
        ? `流月${selectedSiHua.month ?? ''}`
        : `流年${selectedSiHua.year ?? ''}`;
  const label = `${viewLabel}${selectedSiHua.starName}化${selectedSiHua.siHua}`;
  const basis = `${label}落在${palaceName}，请说明当前时间视角下的短版影响。`;

  return {
    key: `sihua:${selectedSiHua.starName}:${selectedSiHua.siHua}:${selectedSiHua.view}:${selectedSiHua.year ?? ''}:${selectedSiHua.month ?? ''}`,
    label,
    kind: 'sihua',
    briefPrompt: buildFocusBriefPrompt(label, basis),
    evidenceInput: {
      kind: 'sihua',
      key: `sihua:${selectedSiHua.starName}:${selectedSiHua.siHua}:${selectedSiHua.view}:${selectedSiHua.year ?? ''}:${selectedSiHua.month ?? ''}`,
      label,
      palace: palaceOfStar,
      starName: selectedSiHua.starName,
      siHua: selectedSiHua.siHua,
    },
    deepPrompt: `请分析【${label}】的飞化影响，按以下结构输出：

**【化${selectedSiHua.siHua}基本含义】**
化${selectedSiHua.siHua}在倪海夏体系中的核心含义，以及${selectedSiHua.starName}化${selectedSiHua.siHua}的特殊含义。

**【落宫影响】**
${selectedSiHua.starName}化${selectedSiHua.siHua}落在【${palaceName}】，该宫主管的领域受到何种影响，倪师如何解读。

**【三方四正飞化路径】**
化${selectedSiHua.siHua}入${palaceName}后，对其三方四正（对宫、两个三合宫）的联动影响。

**【当前运势影响】**
在${viewLabel}时间维度下，此化${selectedSiHua.siHua}对命主近期运势的具体影响。

**【实际建议】**
基于此四化的具体可操作建议。`,
  };
}

/** Render AI markdown into compact reading blocks for chart insights. */
function AiContent({ text, streaming }: { text: string; streaming?: boolean }) {
  const lines = text.split('\n');

  const renderInline = (value: string) => {
    const parts = value.split(/\*\*(.+?)\*\*/);
    return parts.map((part, index) =>
      index % 2 === 0
        ? part
        : (
          <strong key={index} className="font-semibold" style={{ color: 'var(--t-text)' }}>
            {part}
          </strong>
        )
    );
  };

  return (
    <div className="space-y-2.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const sectionMatch = trimmed.match(/^(?:\*\*)?【(.+?)】(?:\*\*)?$/);
        const numberedMatch = trimmed.match(/^(\d+)[.、]\s*(.+)$/);
        const bulletMatch = trimmed.match(/^[-•]\s*(.+)$/);

        if (sectionMatch) {
          return (
            <div key={i} className="flex items-center gap-2 pt-3 first:pt-0">
              <span
                className="h-3.5 w-0.5 rounded-full"
                style={{ background: 'var(--t-gold)', opacity: 0.82 }}
              />
              <span className="text-[13px] font-semibold tracking-wide" style={{ color: 'var(--t-gold)' }}>
                【{sectionMatch[1]}】
              </span>
            </div>
          );
        }

        if (!trimmed) return <div key={i} className="h-0.5" />;

        if (numberedMatch) {
          return (
            <div key={i} className="grid grid-cols-[22px_1fr] gap-2.5 text-[14px] leading-7">
              <span
                className="mt-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-semibold"
                style={{
                  background: 'rgba(212,168,67,0.10)',
                  border: '1px solid rgba(212,168,67,0.22)',
                  color: 'var(--t-gold)',
                }}
              >
                {numberedMatch[1]}
              </span>
              <span style={{ color: 'var(--t-text2)' }}>
                {renderInline(numberedMatch[2])}
              </span>
            </div>
          );
        }

        if (bulletMatch) {
          return (
            <div key={i} className="grid grid-cols-[10px_1fr] gap-2.5 text-[14px] leading-7">
              <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--t-gold)', opacity: 0.62 }} />
              <span style={{ color: 'var(--t-text2)' }}>
                {renderInline(bulletMatch[1])}
              </span>
            </div>
          );
        }

        return (
          <div key={i} className="text-[14px] leading-7" style={{ color: 'var(--t-text2)' }}>
            {renderInline(trimmed)}
          </div>
        );
      })}
      {streaming && (
        <span
          className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm align-middle"
          style={{ background: 'var(--t-gold)', opacity: 0.6 }}
        />
      )}
    </div>
  );
}

function PanelSection({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-xl px-4 py-3.5"
      style={{
        background: 'color-mix(in srgb, var(--t-card) 76%, transparent)',
        border: '1px solid var(--t-border)',
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <div className="text-[10px] tracking-widest" style={{ color: 'var(--t-faint)' }}>
              {eyebrow}
            </div>
          )}
          <h3 className="truncate text-[13px] font-semibold" style={{ color: 'var(--t-text)' }}>
            {title}
          </h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function EvidenceBlock({ evidence }: { evidence: InsightEvidence }) {
  return (
    <div
      className="mt-3 rounded-lg px-3 py-2.5"
      style={{
        background: 'rgba(212,168,67,0.045)',
        border: '1px solid rgba(212,168,67,0.14)',
      }}
    >
      <div className="mb-2 text-[10px] font-semibold tracking-widest" style={{ color: 'var(--t-gold)' }}>
        {evidence.title}
      </div>
      <div className="space-y-1.5">
        {evidence.items.map(item => (
          <div key={`${item.label}-${item.value}`} className="grid grid-cols-[64px_1fr] gap-2 text-[12px] leading-5">
            <span style={{ color: 'var(--t-faint)' }}>{item.label}</span>
            <span style={{ color: 'var(--t-text2)' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = 'plain',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'plain' | 'gold';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-35"
      style={{
        background: variant === 'gold' ? 'rgba(212,168,67,0.12)' : 'var(--t-card)',
        border: variant === 'gold' ? '1px solid rgba(212,168,67,0.25)' : '1px solid var(--t-border)',
        color: variant === 'gold' ? 'var(--t-gold)' : 'var(--t-text2)',
      }}
    >
      {children}
    </button>
  );
}

export default function InsightPanel({ chart, selectedStar, selectedPalace, selectedSiHua, onSharePayloadChange }: InsightPanelProps) {
  const [summary, setSummary] = useState('');
  const [activeTopic, setActiveTopic] = useState<string>('overview');
  const [focus, setFocus] = useState<FocusState>(() => buildTopicFocus('overview'));
  const [focusInsight, setFocusInsight] = useState('');
  const [expandedInsight, setExpandedInsight] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState<LoadingState>({ summary: false, focus: false, expanded: false, chat: false });
  const [errors, setErrors] = useState<ErrorState>({});
  const [expandedInsightKey, setExpandedInsightKey] = useState('');
  const [savedEntries, setSavedEntries] = useState<SavedInsightEntry[]>([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const chartId = useMemo(() => getChartInsightId(chart), [chart]);
  const summaryEvidence = useMemo(() => buildSummaryEvidence(chart), [chart]);
  const focusEvidence = useMemo(() => buildFocusEvidence(chart, focus.evidenceInput), [chart, focus]);
  const sharePayload = useMemo(() => buildSafeSharePayload({
    chart,
    summary,
    focusLabel: focus.label,
    focusInsight,
  }), [chart, focus.label, focusInsight, summary]);

  const abortRefs = useRef<Partial<Record<RequestTarget, AbortController>>>({});
  const requestIdRefs = useRef<Record<RequestTarget, number>>({ summary: 0, focus: 0, expanded: 0, chat: 0 });
  const focusRef = useRef<FocusState>(focus);
  const summaryRef = useRef('');
  const focusInsightRef = useRef('');
  const chatMessagesRef = useRef<ChatMessage[]>([]);
  const lastStarKey = useRef<string | undefined>(undefined);
  const lastPalaceBranch = useRef<number | undefined>(undefined);
  const lastSiHuaKey = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { focusRef.current = focus; }, [focus]);
  useEffect(() => { summaryRef.current = summary; }, [summary]);
  useEffect(() => { focusInsightRef.current = focusInsight; }, [focusInsight]);
  useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);

  useEffect(() => {
    return () => abortAll();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSavedEntries(loadSavedInsightEntries(window.localStorage, chartId));
  }, [chartId]);

  useEffect(() => {
    onSharePayloadChange?.(sharePayload);
  }, [onSharePayloadChange, sharePayload]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, summary, focusInsight, expandedInsight]);

  const abortAll = () => {
    Object.values(abortRefs.current).forEach(controller => controller?.abort());
    abortRefs.current = {};
  };

  const readCache = (cacheKey: string) => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(cacheKey) ?? '';
    } catch {
      return '';
    }
  };

  const writeCache = (cacheKey: string, value: string) => {
    if (typeof window === 'undefined' || !value.trim()) return;
    try {
      window.localStorage.setItem(cacheKey, sanitizeForChart(value));
    } catch {
      // Local caching is opportunistic; the streamed result is already visible.
    }
  };

  const sanitizeForChart = (value: string) => sanitizeShareText(value, [
    chart.birthInfo.name,
    chart.birthInfo.province,
    chart.birthInfo.city,
    chart.birthInfo.longitude === undefined ? undefined : String(chart.birthInfo.longitude),
  ].filter((item): item is string => Boolean(item)));

  const streamInsight = async (
    target: RequestTarget,
    apiMessages: { role: 'user' | 'assistant'; content: string }[],
    onDelta: (text: string) => void,
    onDone?: (text: string) => void,
  ) => {
    abortRefs.current[target]?.abort();
    const requestId = requestIdRefs.current[target] + 1;
    requestIdRefs.current[target] = requestId;
    const abortController = new AbortController();
    abortRefs.current[target] = abortController;
    setLoading(prev => ({ ...prev, [target]: true }));
    setErrors(prev => ({ ...prev, [target]: undefined }));

    let assistantText = '';
    try {
      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart, messages: apiMessages }),
        signal: abortController.signal,
      });
      if (!res.ok) throw new Error('请求失败');
      if (!res.body) throw new Error('无响应流');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (abortController.signal.aborted || requestId !== requestIdRefs.current[target]) break;
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const delta = JSON.parse(data).delta?.text ?? '';
            assistantText += delta;
            onDelta(assistantText);
          } catch {
            // Ignore keep-alive or malformed stream fragments.
          }
        }
      }
      if (pending && !abortController.signal.aborted && requestId === requestIdRefs.current[target]) {
        const data = pending.startsWith('data: ') ? pending.slice(6) : '';
        if (data && data !== '[DONE]') {
          try {
            const delta = JSON.parse(data).delta?.text ?? '';
            assistantText += delta;
            onDelta(assistantText);
          } catch {
            // Ignore incomplete trailing data.
          }
        }
      }
      if (!abortController.signal.aborted && requestId === requestIdRefs.current[target]) {
        onDone?.(assistantText);
      }
    } catch (streamError) {
      if (abortController.signal.aborted || (streamError instanceof DOMException && streamError.name === 'AbortError')) {
        return;
      }
      setErrors(prev => ({ ...prev, [target]: '解读失败，请稍后重试。' }));
    } finally {
      if (requestId === requestIdRefs.current[target]) {
        setLoading(prev => ({ ...prev, [target]: false }));
        delete abortRefs.current[target];
      }
    }
  };

  const requestSummary = () => {
    const cacheKey = getInsightCacheKey(chart, 'summary', 'root');
    const cached = readCache(cacheKey);
    if (cached) {
      setSummary(cached);
      return;
    }
    setSummary('');
    streamInsight(
      'summary',
      [{ role: 'user', content: buildSummaryPrompt() }],
      setSummary,
      text => writeCache(cacheKey, text),
    );
  };

  const requestFocusInsight = (nextFocus: FocusState) => {
    const cacheKey = getInsightCacheKey(chart, 'focus', nextFocus.key);
    const cached = readCache(cacheKey);
    setFocus(nextFocus);
    setFocusInsight(cached);
    setExpandedInsight('');
    setExpandedInsightKey('');
    if (cached) return;
    streamInsight(
      'focus',
      [
        { role: 'user', content: buildSummaryPrompt() },
        { role: 'assistant', content: summaryRef.current || '摘要生成中。' },
        { role: 'user', content: nextFocus.briefPrompt },
      ],
      setFocusInsight,
      text => writeCache(cacheKey, text),
    );
  };

  useEffect(() => {
    abortAll();
    setSummary('');
    setActiveTopic('overview');
    setFocus(buildTopicFocus('overview'));
    setFocusInsight('');
    setExpandedInsight('');
    setExpandedInsightKey('');
    setChatMessages([]);
    setInput('');
    setErrors({});
    lastStarKey.current = undefined;
    lastPalaceBranch.current = undefined;
    lastSiHuaKey.current = undefined;
    requestSummary();
  }, [chart]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedStar) return;
    const nextFocus = buildStarFocus(selectedStar);
    if (nextFocus.key === lastStarKey.current) return;
    lastStarKey.current = nextFocus.key;
    setActiveTopic('focus');
    requestFocusInsight(nextFocus);
  }, [selectedStar]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedPalace) return;
    const nextFocus = buildPalaceFocus(selectedPalace);
    if (selectedPalace.branch === lastPalaceBranch.current) return;
    lastPalaceBranch.current = selectedPalace.branch;
    setActiveTopic('focus');
    requestFocusInsight(nextFocus);
  }, [selectedPalace]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedSiHua) return;
    const nextFocus = buildSiHuaFocus(chart, selectedSiHua);
    if (nextFocus.key === lastSiHuaKey.current) return;
    lastSiHuaKey.current = nextFocus.key;
    setActiveTopic('focus');
    requestFocusInsight(nextFocus);
  }, [selectedSiHua]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTopicClick = (topicKey: string) => {
    if (loading.focus) return;
    setActiveTopic(topicKey);
    requestFocusInsight(buildTopicFocus(topicKey));
  };

  const handleExpand = () => {
    const currentFocus = focusRef.current;
    if (loading.expanded) return;
    if (expandedInsight && expandedInsightKey === currentFocus.key) return;

    const cacheKey = getInsightCacheKey(chart, 'expanded', currentFocus.key);
    const cached = readCache(cacheKey);
    setExpandedInsight('');
    if (cached) {
      setExpandedInsight(cached);
      setExpandedInsightKey(currentFocus.key);
      return;
    }
    streamInsight(
      'expanded',
      [
        { role: 'user', content: buildSummaryPrompt() },
        { role: 'assistant', content: summaryRef.current || '摘要生成中。' },
        { role: 'user', content: currentFocus.briefPrompt },
        { role: 'assistant', content: focusInsightRef.current || '当前焦点短解读生成中。' },
        {
          role: 'user',
          content: `${currentFocus.deepPrompt}

请使用深度模式：每个小节展开到 2-3 段，明确写出命盘依据、三方四正联动、可验证的现实表现，以及可以马上执行的建议。`,
        },
      ],
      setExpandedInsight,
      text => {
        if (text.trim()) setExpandedInsightKey(currentFocus.key);
        writeCache(cacheKey, text);
      },
    );
  };

  const handleSend = () => {
    const question = input.trim();
    if (!question || loading.chat) return;

    const userMessage: ChatMessage = { id: nextId('user'), role: 'user', content: question };
    const assistantMessage: ChatMessage = { id: nextId('assistant'), role: 'assistant', content: '' };
    const contextPrompt = `当前命盘摘要：
${summaryRef.current || '暂无摘要'}

当前焦点：${focusRef.current.label}
${focusInsightRef.current || '暂无焦点短解读'}

请结合以上上下文回答用户追问，必要时说明不确定性，避免制造确定性预测。`;

    const apiMessages = [
      { role: 'user' as const, content: contextPrompt },
      ...chatMessagesRef.current.map(message => ({ role: message.role, content: message.content })),
      { role: 'user' as const, content: question },
    ];

    setChatMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    streamInsight(
      'chat',
      apiMessages,
      text => {
        setChatMessages(prev => prev.map(message =>
          message.id === assistantMessage.id ? { ...message, content: text } : message
        ));
      },
    );
  };

  const handleRetry = (target: RequestTarget) => {
    if (target === 'summary') requestSummary();
    if (target === 'focus') requestFocusInsight(focusRef.current);
    if (target === 'expanded') handleExpand();
    if (target === 'chat') setErrors(prev => ({ ...prev, chat: undefined }));
  };

  const saveCurrentInsight = (kind: InsightKind) => {
    if (typeof window === 'undefined') return;
    const content =
      kind === 'summary'
        ? summary
        : kind === 'focus'
          ? focusInsight
          : expandedInsight;
    const safeContent = sanitizeForChart(content);
    if (!safeContent.trim()) return;
    const entry = createSavedInsightEntry({
      chartId,
      kind,
      title: kind === 'summary' ? '核心摘要' : kind === 'focus' ? focus.label : `${focus.label} · 深度解读`,
      content: safeContent,
      evidence: kind === 'summary' ? summaryEvidence : focusEvidence,
      focusKey: kind === 'summary' ? undefined : focus.key,
    });
    setSavedEntries(saveInsightEntry(window.localStorage, entry));
    setSavedOpen(true);
  };

  const removeSavedInsight = (entryId: string) => {
    if (typeof window === 'undefined') return;
    setSavedEntries(deleteSavedInsightEntry(window.localStorage, chartId, entryId));
  };

  const copyShareSummary = async () => {
    const text = [
      sharePayload.title,
      sharePayload.summary,
      sharePayload.highlights.length ? `重点：\n${sharePayload.highlights.map(item => `- ${item}`).join('\n')}` : '',
      `标签：${sharePayload.tags.join(' / ')}`,
      sharePayload.siteUrl,
    ].filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 1800);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 1800);
    }
  };

  const summaryLoading = loading.summary && !summary;
  const focusLoading = loading.focus && !focusInsight;
  const expandedLoading = loading.expanded;
  const chatLoading = loading.chat;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl card-glass">
      <div className="flex-shrink-0 px-2 pt-2.5 pb-2" style={{ borderBottom: '1px solid var(--t-border)' }}>
        <div className="grid grid-cols-6 gap-1">
          {TOPICS.map(topic => {
            const isActive = activeTopic === topic.key;
            return (
              <button
                key={topic.key}
                onClick={() => handleTopicClick(topic.key)}
                disabled={loading.focus}
                className="py-1.5 text-[11px] font-medium rounded-lg transition-all duration-150 disabled:opacity-40"
                style={{
                  background: isActive ? 'rgba(212,168,67,0.12)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(212,168,67,0.3)' : 'var(--t-border)'}`,
                  color: isActive ? 'var(--t-gold)' : 'var(--t-faint)',
                }}
              >
                {topic.label}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <PanelSection title="核心摘要" eyebrow="SUMMARY">
          {summaryLoading ? (
            <p className="text-[13px] leading-6 animate-pulse" style={{ color: 'var(--t-faint)' }}>
              正在生成短摘要…
            </p>
          ) : summary ? (
            <AiContent text={summary} streaming={loading.summary} />
          ) : (
            <p className="text-[13px] leading-6" style={{ color: 'var(--t-faint)' }}>
              暂无摘要。
            </p>
          )}
          <EvidenceBlock evidence={summaryEvidence} />
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton onClick={() => saveCurrentInsight('summary')} disabled={!summary.trim()}>保存摘要</ActionButton>
            <ActionButton onClick={copyShareSummary} disabled={!summary.trim()} variant="gold">
              {copiedShare ? '已复制' : '复制脱敏摘要'}
            </ActionButton>
          </div>
          {errors.summary && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-[12px]" style={{ color: 'var(--ji)' }}>{errors.summary}</p>
              <ActionButton onClick={() => handleRetry('summary')}>重试摘要</ActionButton>
            </div>
          )}
        </PanelSection>

        <PanelSection title={focus.label} eyebrow="当前焦点">
          {focusLoading ? (
            <p className="text-[13px] leading-6 animate-pulse" style={{ color: 'var(--t-faint)' }}>
              正在更新焦点解读…
            </p>
          ) : focusInsight ? (
            <AiContent text={focusInsight} streaming={loading.focus} />
          ) : (
            <p className="text-[13px] leading-6" style={{ color: 'var(--t-faint)' }}>
              点击上方主题、宫位、星曜或四化查看当前焦点。
            </p>
          )}

          <EvidenceBlock evidence={focusEvidence} />

          {errors.focus && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-[12px]" style={{ color: 'var(--ji)' }}>{errors.focus}</p>
              <ActionButton onClick={() => handleRetry('focus')}>重试焦点</ActionButton>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton onClick={() => saveCurrentInsight('focus')} disabled={!focusInsight.trim()}>
              保存短解读
            </ActionButton>
            <button
              type="button"
              onClick={handleExpand}
              disabled={loading.expanded || !focusInsight || (!!expandedInsight && expandedInsightKey === focus.key)}
              className="rounded-lg px-3 py-2 text-[13px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-35"
              style={{
                background: 'rgba(212,168,67,0.12)',
                border: '1px solid rgba(212,168,67,0.25)',
                color: 'var(--t-gold)',
              }}
            >
              {expandedInsight && expandedInsightKey === focus.key ? '深度解读已展开' : '展开深度解读'}
            </button>
          </div>

          {(expandedInsight || expandedLoading || errors.expanded) && (
            <div
              className="mt-3 rounded-xl px-3 py-3"
              style={{
                background: 'rgba(212,168,67,0.055)',
                border: '1px solid rgba(212,168,67,0.16)',
              }}
            >
              {expandedInsight ? (
                <AiContent text={expandedInsight} streaming={expandedLoading} />
              ) : expandedLoading ? (
                <p className="text-[13px] leading-6 animate-pulse" style={{ color: 'var(--t-faint)' }}>
                  正在展开深度解读…
                </p>
              ) : null}
              {errors.expanded && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-[12px]" style={{ color: 'var(--ji)' }}>{errors.expanded}</p>
                  <ActionButton onClick={() => handleRetry('expanded')}>重试深度</ActionButton>
                </div>
              )}
              {expandedInsight && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton onClick={() => saveCurrentInsight('expanded')}>保存深度解读</ActionButton>
                </div>
              )}
            </div>
          )}
        </PanelSection>

        <PanelSection title="已保存" eyebrow="SAVED">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] leading-6" style={{ color: 'var(--t-faint)' }}>
              {savedEntries.length ? `当前命盘已保存 ${savedEntries.length} 条解读。` : '当前命盘还没有保存内容。'}
            </p>
            <ActionButton onClick={() => setSavedOpen(prev => !prev)} disabled={savedEntries.length === 0}>
              {savedOpen ? '收起保存' : '查看保存'}
            </ActionButton>
          </div>
          {savedOpen && savedEntries.length > 0 && (
            <div className="mt-3 space-y-2">
              {savedEntries.map(entry => (
                <div
                  key={entry.id}
                  className="rounded-lg px-3 py-2.5"
                  style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-[12px] font-semibold" style={{ color: 'var(--t-text)' }}>
                      {entry.title}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSavedInsight(entry.id)}
                      className="text-[12px]"
                      style={{ color: 'var(--t-faint)' }}
                    >
                      删除
                    </button>
                  </div>
                  <p className="whitespace-pre-line text-[12px] leading-5" style={{ color: 'var(--t-text2)', maxHeight: '60px', overflow: 'hidden' }}>
                    {entry.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </PanelSection>

        <PanelSection title="自由追问" eyebrow="CHAT">
          {chatMessages.length === 0 ? (
            <p className="text-[13px] leading-6" style={{ color: 'var(--t-faint)' }}>
              输入你的具体问题，AI 会结合当前摘要与焦点回答。
            </p>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {chatMessages.map((message, index) => {
                  const isUser = message.role === 'user';
                  const isStreaming = chatLoading && index === chatMessages.length - 1;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={isUser ? 'flex justify-end' : undefined}
                    >
                      {isUser ? (
                        <div
                          className="max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-6"
                          style={{
                            background: 'rgba(212,168,67,0.08)',
                            border: '1px solid rgba(212,168,67,0.18)',
                            color: 'var(--t-gold)',
                          }}
                        >
                          {message.content}
                        </div>
                      ) : (
                        <AiContent text={message.content} streaming={isStreaming} />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
          {errors.chat && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-[12px]" style={{ color: 'var(--ji)' }}>{errors.chat}</p>
              <ActionButton onClick={() => handleRetry('chat')}>知道了</ActionButton>
            </div>
          )}
        </PanelSection>
      </div>

      <div className="flex-shrink-0 px-3 pb-3 pt-2" style={{ borderTop: '1px solid var(--t-border)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && !event.shiftKey && handleSend()}
            placeholder="继续追问，如：今年适合换工作吗？"
            disabled={loading.chat}
            className="flex-1 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none transition-colors"
            style={{
              background: 'var(--t-card)',
              border: '1px solid var(--t-border)',
              color: 'var(--t-text)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading.chat || !input.trim()}
            className="px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(212,168,67,0.15)',
              border: '1px solid rgba(212,168,67,0.25)',
              color: 'var(--t-gold)',
            }}
          >
            {chatLoading ? '…' : '追问'}
          </button>
        </div>
      </div>
    </div>
  );
}

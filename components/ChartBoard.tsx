'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ZiweiChart, Palace, Star } from '@/lib/ziwei/types';
import { BRANCHES, STEMS } from '@/lib/ziwei/constants';
import { getAstrolabeFacts, getPalaceDisplayData } from '@/lib/ziwei/display';
import PalaceCell from './PalaceCell';
import TimeNav, { type TimeView, getYearStemIndex, buildSiHuaOverlay } from './TimeNav';

interface ChartBoardProps {
  chart: ZiweiChart;
  mode?: 'compact' | 'full';
  view?: TimeView;
  liunianYear?: number;
  liuyueMonth?: number;
  onTimeViewChange?: (view: TimeView) => void;
  onYearChange?: (year: number) => void;
  onMonthChange?: (month: number) => void;
  onStarSelect?: (star: Star, palace: Palace) => void;
  onPalaceSelect?: (palace: Palace) => void;
  onSiHuaClick?: (starName: string, siHua: string, view: TimeView) => void;
}

const BRANCH_GRID_POS: Record<number, [number, number]> = {
  5: [1, 1], 6: [1, 2], 7: [1, 3], 8: [1, 4],
  4: [2, 1], 9: [2, 4],
  3: [3, 1], 10: [3, 4],
  2: [4, 1], 1: [4, 2], 0: [4, 3], 11: [4, 4],
};

// 每个地支宫位在网格中的中心坐标（百分比）
const BRANCH_SVG_POS: Record<number, [number, number]> = {
  5: [12.5, 12.5], 6: [37.5, 12.5], 7: [62.5, 12.5], 8: [87.5, 12.5],
  4: [12.5, 37.5],                                      9: [87.5, 37.5],
  3: [12.5, 62.5],                                     10: [87.5, 62.5],
  2: [12.5, 87.5], 1: [37.5, 87.5], 0: [62.5, 87.5], 11: [87.5, 87.5],
};

// 绕盘面顺时针排列（用于三方四正四边形排序）
const CLOCKWISE_INDEX: Record<number, number> = {
  5: 0, 6: 1, 7: 2, 8: 3,
  9: 4, 10: 5,
  11: 6, 0: 7, 1: 8, 2: 9,
  3: 10, 4: 11,
};

function sortClockwise(branches: number[]): number[] {
  return [...branches].sort((a, b) => CLOCKWISE_INDEX[a] - CLOCKWISE_INDEX[b]);
}

/** 三方四正：本宫 + 对宫 + 两个三合宫 */
function getSanFangSiZheng(branch: number): [number, number, number, number] {
  return [
    branch,
    (branch + 6) % 12,   // 对宫
    (branch + 4) % 12,   // 三合1
    (branch + 8) % 12,   // 三合2
  ];
}

const ANIMATION_ORDER = [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4];

export default function ChartBoard({
  chart,
  mode = 'compact',
  view,
  liunianYear,
  liuyueMonth,
  onTimeViewChange,
  onYearChange,
  onMonthChange,
  onStarSelect,
  onPalaceSelect,
  onSiHuaClick,
}: ChartBoardProps) {
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [internalTimeView, setInternalTimeView] = useState<TimeView>('mingpan');
  const [internalLiunianYear, setInternalLiunianYear] = useState<number>(new Date().getFullYear());
  const [internalLiuyueMonth, setInternalLiuyueMonth] = useState<number>(new Date().getMonth() + 1);
  const timeView = view ?? internalTimeView;
  const activeLiunianYear = liunianYear ?? internalLiunianYear;
  const activeLiuyueMonth = liuyueMonth ?? internalLiuyueMonth;

  const palaceMap: Record<number, Palace> = {};
  chart.palaces.forEach(p => { palaceMap[p.branch] = p; });
  const astrolabeFacts = getAstrolabeFacts(chart);
  const centerFactMap = new Map(astrolabeFacts.map(fact => [fact.label, fact.value]));
  const chineseDate = chart.iztro.astrolabe.rawDates.chineseDate;
  const pillarColumns = [
    { label: '年', stem: chineseDate.yearly[0], branch: chineseDate.yearly[1] },
    { label: '月', stem: chineseDate.monthly[0], branch: chineseDate.monthly[1] },
    { label: '日', stem: chineseDate.daily[0], branch: chineseDate.daily[1] },
    { label: '时', stem: chineseDate.hourly[0], branch: chineseDate.hourly[1] },
  ];
  const isFullMode = mode === 'full';

  // 计算当前叠加四化数据（大限或流年）
  const currentDx = chart.daXians[chart.currentDaXianIndex];
  const overlayData: Record<string, string> = (() => {
    if (timeView === 'daxian' && currentDx) {
      const dxPalace = chart.palaces.find(p => p.branch === currentDx.palaceBranch);
      if (dxPalace) return buildSiHuaOverlay(dxPalace.stem);
    }
    if (timeView === 'liunian') {
      return buildSiHuaOverlay(getYearStemIndex(activeLiunianYear));
    }
    if (timeView === 'liuyue') {
      const mutagen = chart.iztro.horoscope.monthly.mutagen;
      if (!mutagen || mutagen.length < 4) return {};
      return {
        [mutagen[0]]: '禄',
        [mutagen[1]]: '权',
        [mutagen[2]]: '科',
        [mutagen[3]]: '忌',
      };
    }
    return {};
  })();
  const overlayLabel = timeView === 'daxian' ? '限' : timeView === 'liunian' ? '年' : timeView === 'liuyue' ? '月' : undefined;

  const handleTimeViewChange = (nextView: TimeView) => {
    setInternalTimeView(nextView);
    onTimeViewChange?.(nextView);
  };

  const handleYearChange = (year: number) => {
    setInternalLiunianYear(year);
    onYearChange?.(year);
  };

  const handleMonthChange = (month: number) => {
    setInternalLiuyueMonth(month);
    onMonthChange?.(month);
  };

  const handlePalaceClick = (branch: number) => {
    const isDeselecting = selectedBranch === branch;
    setSelectedBranch(prev => prev === branch ? null : branch);
    if (!isDeselecting) {
      const palace = palaceMap[branch];
      if (palace) onPalaceSelect?.(palace);
    }
  };

  const selectBranch = (branch: number) => {
    setSelectedBranch(branch);
  };

  // 三方四正
  const sanFangBranches = selectedBranch !== null ? getSanFangSiZheng(selectedBranch) : null;
  const sanFangSet = sanFangBranches ? new Set(sanFangBranches) : null;

  return (
    <div className={`chart-board-shell chart-board-shell--${mode} w-full select-none`}>
      {/* 时间导航轴 */}
      <TimeNav
        chart={chart}
        view={timeView}
        liunianYear={activeLiunianYear}
        liuyueMonth={activeLiuyueMonth}
        onViewChange={handleTimeViewChange}
        onYearChange={handleYearChange}
        onMonthChange={handleMonthChange}
      />

      {/* 命盘标题 */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-3"
      >
        <div className="text-[10px] tracking-[0.5em] uppercase mb-1" style={{ color: 'var(--t-faint)' }}>
          Zi Wei Dou Shu
        </div>
        <h2 className="text-sm tracking-[0.25em] font-medium" style={{ color: 'var(--t-gold)' }}>
          {chart.birthInfo.name ? `${chart.birthInfo.name} · ` : ''}紫微斗数命盘
        </h2>
      </motion.div>

      {/* 4x4 命盘网格（含 SVG 叠加层） */}
      <div
        className="chart-palace-grid grid rounded-xl overflow-hidden relative"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(4, minmax(0, 1fr))',
          gap: '1px',
          background: 'var(--chart-grid-line)',
          border: '1px solid var(--chart-grid-outer)',
          boxShadow: 'var(--chart-grid-shadow)',
        }}
      >
        {ANIMATION_ORDER.map((branch, i) => {
          const [row, col] = BRANCH_GRID_POS[branch];
          const palace = palaceMap[branch];
          if (!palace) return null;
          return (
            <div key={branch} style={{ gridRow: row, gridColumn: col, background: 'var(--chart-palace-bg)' }}>
              <PalaceCell
                palace={palace}
                displayData={getPalaceDisplayData(chart, palace)}
                showDetails={isFullMode}
                onClick={() => handlePalaceClick(branch)}
                onStarClick={(star) => {
                  selectBranch(branch);
                  onStarSelect?.(star, palace);
                }}
                isSelected={selectedBranch === branch}
                isSanFang={!!(sanFangSet?.has(branch) && selectedBranch !== branch)}
                delay={i * 0.04}
                overlayStarSiHua={Object.keys(overlayData).length > 0 ? overlayData : undefined}
                overlayLabel={overlayLabel}
                onSiHuaClick={(starName, siHua) => {
                  selectBranch(branch);
                  onSiHuaClick?.(starName, siHua, timeView);
                }}
              />
            </div>
          );
        })}

        {/* 中央信息区 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="palace-center-tile flex flex-col items-center justify-center p-3 gap-2"
          style={{ gridRow: '2 / 4', gridColumn: '2 / 4', background: 'var(--chart-center-bg)' }}
        >
          <div className="chart-center-inscription">
            <div className="chart-center-title">紫微斗数</div>

            <div className="chart-center-meta">
              <span className="chart-center-meta-line">
                <span>阳历 {centerFactMap.get('阳历')}</span>
                <span>农历 {centerFactMap.get('农历')}</span>
                <span>{centerFactMap.get('时辰')}</span>
              </span>
              <span className="chart-center-ju">五行局 · {chart.wuxingJuName}</span>
            </div>

            <div className="chart-center-life-axis">
              <div className="chart-center-life-item">
                <span>命宫</span>
                <strong>{BRANCHES[chart.mingGongBranch]}</strong>
              </div>
              <div className="chart-center-life-item">
                <span>身宫</span>
                <strong>{BRANCHES[chart.shenGongBranch]}</strong>
              </div>
            </div>

            <div className="chart-center-pillars">
              <div className="chart-center-pillars-title">四柱干支</div>
              <div className="chart-center-pillars-grid" aria-label={`四柱：${centerFactMap.get('四柱') ?? ''}`}>
                <span />
                {pillarColumns.map(pillar => <span key={pillar.label}>{pillar.label}</span>)}
                <span>干</span>
                {pillarColumns.map(pillar => <strong key={`${pillar.label}-stem`} className="stem">{pillar.stem}</strong>)}
                <span>支</span>
                {pillarColumns.map(pillar => <strong key={`${pillar.label}-branch`} className="branch">{pillar.branch}</strong>)}
              </div>
            </div>

            {chart.currentDaXianIndex >= 0 && (() => {
              const dx = chart.daXians[chart.currentDaXianIndex];
              return (
                <div className="chart-center-daxian">
                  <span>当前大限</span>
                  <strong>{dx.startAge}–{dx.endAge}岁 · {dx.palaceName}</strong>
                </div>
              );
            })()}
          </div>
        </motion.div>

        {/* ── 三方四正 SVG 连线（绝对定位在 grid 内部，受 overflow:hidden 裁切） ── */}
        <AnimatePresence>
          {sanFangBranches !== null && (
            <motion.div
              key={`sf-${selectedBranch}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none"
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 20,
              }}
            >
              <svg
                width="100%"
                height="100%"
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block' }}
              >
                {(() => {
                  // 三角形（三方）+ 一条直线（对宫）
                  const p0 = BRANCH_SVG_POS[sanFangBranches[0]]; // 本宫
                  const p1 = BRANCH_SVG_POS[sanFangBranches[1]]; // 对宫
                  const p2 = BRANCH_SVG_POS[sanFangBranches[2]]; // 三合1
                  const p3 = BRANCH_SVG_POS[sanFangBranches[3]]; // 三合2
                  const dash = "6,5";
                  const stroke = "rgba(37,99,235,0.55)";
                  const sw = "1.5";
                  return (
                    <>
                      {/* 对宫直线：本宫 ↔ 对宫（穿过中心） */}
                      <line
                        x1={`${p0[0]}%`} y1={`${p0[1]}%`}
                        x2={`${p1[0]}%`} y2={`${p1[1]}%`}
                        stroke={stroke} strokeWidth={sw}
                        strokeDasharray={dash} strokeLinecap="round"
                      />
                      {/* 三合三角形：本宫 → 三合1 → 三合2 → 本宫 */}
                      <line
                        x1={`${p0[0]}%`} y1={`${p0[1]}%`}
                        x2={`${p2[0]}%`} y2={`${p2[1]}%`}
                        stroke={stroke} strokeWidth={sw}
                        strokeDasharray={dash} strokeLinecap="round"
                      />
                      <line
                        x1={`${p2[0]}%`} y1={`${p2[1]}%`}
                        x2={`${p3[0]}%`} y2={`${p3[1]}%`}
                        stroke={stroke} strokeWidth={sw}
                        strokeDasharray={dash} strokeLinecap="round"
                      />
                      <line
                        x1={`${p3[0]}%`} y1={`${p3[1]}%`}
                        x2={`${p0[0]}%`} y2={`${p0[1]}%`}
                        stroke={stroke} strokeWidth={sw}
                        strokeDasharray={dash} strokeLinecap="round"
                      />
                      {/* 四个宫位中心标记点 */}
                      {[p0, p1, p2, p3].map((p, i) => (
                        <circle
                          key={i}
                          cx={`${p[0]}%`} cy={`${p[1]}%`}
                          r="3"
                          fill={i === 0 ? 'rgba(37,99,235,0.8)' : 'rgba(37,99,235,0.45)'}
                        />
                      ))}
                    </>
                  );
                })()}
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 图例 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-3 flex items-center justify-center gap-2 text-[9px] flex-wrap"
      >
        {[
          { h: '化禄', c: 'text-emerald-500 border-emerald-500/30' },
          { h: '化权', c: 'text-blue-500 border-blue-500/30' },
          { h: '化科', c: 'text-yellow-500 border-yellow-500/30' },
          { h: '化忌', c: 'text-red-500 border-red-500/30' },
        ].map(({ h, c }) => (
          <span key={h} className={`border px-1.5 py-0.5 rounded-full font-medium ${c}`}>{h}</span>
        ))}
        <span className="px-1.5 py-0.5 rounded-full" style={{ color: 'var(--t-faint)', border: '1px solid var(--t-border)' }}>
          点击宫位看三方四正
        </span>
      </motion.div>
    </div>
  );
}

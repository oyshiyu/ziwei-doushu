'use client';

import ThemeToggle from '@/components/ThemeToggle';
import type { ZiweiChart } from '@/lib/ziwei/types';

export type TimeView = 'mingpan' | 'daxian' | 'liunian' | 'liuyue';

interface TopBarProps {
  chart: ZiweiChart;
  view: TimeView;
  liunianYear: number;
  liuyueMonth: number;
  onViewChange: (view: TimeView) => void;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onShare?: () => void;
  onExport?: () => void;
  copied?: boolean;
}

export default function TopBar({
  chart,
  view,
  liunianYear,
  liuyueMonth,
  onViewChange,
  onYearChange,
  onMonthChange,
  onShare,
  onExport,
  copied,
}: TopBarProps) {
  const currentDx = chart.daXians[chart.currentDaXianIndex];

  return (
    <header
      className="chart-topbar"
    >
      <div className="text-[11px] tracking-[0.25em]" style={{ color: 'var(--ac)' }}>
        紫微命盘
      </div>
      <div className="chart-topbar-back-sep" />
      <div className="chart-topbar-tabs">
        <button className="chart-topbar-button" onClick={() => onViewChange('mingpan')} data-active={view === 'mingpan'}>
          本命
        </button>
        <button className="chart-topbar-button" onClick={() => onViewChange('daxian')} data-active={view === 'daxian'}>
          {currentDx ? `大限 ${currentDx.startAge}–${currentDx.endAge}` : '大限'}
        </button>
        <div className="flex items-center rounded-full" style={{ border: '1px solid var(--bdr)' }}>
          <button className="chart-topbar-step" onClick={() => { onYearChange(liunianYear - 1); onViewChange('liunian'); }}>‹</button>
          <button className="chart-topbar-button" onClick={() => onViewChange('liunian')} data-active={view === 'liunian'}>
            流年 {liunianYear}
          </button>
          <button className="chart-topbar-step" onClick={() => { onYearChange(liunianYear + 1); onViewChange('liunian'); }}>›</button>
        </div>
        <div className="flex items-center rounded-full" style={{ border: '1px solid var(--bdr)' }}>
          <button className="chart-topbar-step" onClick={() => { onMonthChange(Math.max(1, liuyueMonth - 1)); onViewChange('liuyue'); }}>‹</button>
          <button className="chart-topbar-button" onClick={() => onViewChange('liuyue')} data-active={view === 'liuyue'}>
            流月 {liuyueMonth}
          </button>
          <button className="chart-topbar-step" onClick={() => { onMonthChange(Math.min(12, liuyueMonth + 1)); onViewChange('liuyue'); }}>›</button>
        </div>
      </div>
      {onShare && (
        <button className="chart-topbar-button" onClick={onShare}>
          {copied ? '已复制' : '分享'}
        </button>
      )}
      {onExport && (
        <button className="chart-topbar-button" onClick={onExport}>
          打印
        </button>
      )}
      <div className="chart-topbar-theme">
        <ThemeToggle />
      </div>
    </header>
  );
}

'use client';

import BaseChartBoard from '@/components/ChartBoard';
import type { Palace, Star, ZiweiChart } from '@/lib/ziwei/types';
import type { TimeView } from './TopBar';

export type ChartMode = 'compact' | 'full';

interface ChartBoardProps {
  chart: ZiweiChart;
  mode?: ChartMode;
  view?: TimeView;
  liunianYear?: number;
  liuyueMonth?: number;
  onStarClick?: (star: Star, palace: Palace) => void;
  onPalaceClick?: (palace: Palace) => void;
  onSiHuaBadgeClick?: (starName: string, siHua: string) => void;
  onTimeViewChange?: (view: TimeView) => void;
  onYearChange?: (year: number) => void;
  onMonthChange?: (month: number) => void;
}

export default function ChartBoard({
  chart,
  mode = 'compact',
  view,
  liunianYear,
  liuyueMonth,
  onStarClick,
  onPalaceClick,
  onSiHuaBadgeClick,
  onTimeViewChange,
  onYearChange,
  onMonthChange,
}: ChartBoardProps) {
  return (
    <BaseChartBoard
      chart={chart}
      mode={mode}
      view={view}
      liunianYear={liunianYear}
      liuyueMonth={liuyueMonth}
      onTimeViewChange={onTimeViewChange}
      onYearChange={onYearChange}
      onMonthChange={onMonthChange}
      onStarSelect={onStarClick}
      onPalaceSelect={onPalaceClick}
      onSiHuaClick={(starName, siHua) => onSiHuaBadgeClick?.(starName, siHua)}
    />
  );
}

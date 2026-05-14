'use client';

import BaseInsightPanel from '@/components/InsightPanel';
import type { Palace, Star, ZiweiChart } from '@/lib/ziwei/types';
import type { TimeView } from '@/components/chart/TopBar';
import type { SafeSharePayload } from '@/lib/ziwei/insight-workbench';

export type FocusState =
  | { type: 'star'; label: string; star: Star; palace: Palace }
  | { type: 'palace'; label: string; palace: Palace }
  | { type: 'sihua'; label: string; starName: string; siHua: string };

interface InsightPanelProps {
  chart: ZiweiChart;
  view: TimeView;
  liunianYear: number;
  liuyueMonth: number;
  focus: FocusState | null;
  onClearFocus?: () => void;
  onSharePayloadChange?: (payload: SafeSharePayload) => void;
}

export default function InsightPanel({ chart, view, liunianYear, liuyueMonth, focus, onSharePayloadChange }: InsightPanelProps) {
  const selectedPalace =
    focus?.type === 'palace'
      ? focus.palace
      : null;

  const selectedStar =
    focus?.type === 'star'
      ? { star: focus.star, palace: focus.palace, label: focus.label }
      : null;

  const selectedSiHua =
    focus?.type === 'sihua'
      ? {
          starName: focus.starName,
          siHua: focus.siHua,
          view,
          year: liunianYear,
          month: liuyueMonth,
        }
      : null;

  return (
    <BaseInsightPanel
      chart={chart}
      selectedStar={selectedStar}
      selectedPalace={selectedPalace}
      selectedSiHua={selectedSiHua}
      onSharePayloadChange={onSharePayloadChange}
    />
  );
}

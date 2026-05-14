'use client';
import { motion } from 'framer-motion';
import type { Palace, Star } from '@/lib/ziwei/types';
import type { IztroStar } from '@/lib/ziwei/types';
import type { PalaceDisplayData } from '@/lib/ziwei/display';
import { STEMS, BRANCHES } from '@/lib/ziwei/constants';
import clsx from 'clsx';

interface PalaceCellProps {
  palace: Palace;
  onClick?: () => void;
  onStarClick?: (star: Star) => void;
  isSelected?: boolean;
  isSanFang?: boolean;
  delay?: number;
  /** 叠加四化：星名 → 四化类型（'禄'/'权'/'科'/'忌'） */
  overlayStarSiHua?: Record<string, string>;
  /** 叠加标签：'年'（流年）或 '限'（大限） */
  overlayLabel?: string;
  /** 点击叠加四化 badge 回调 */
  onSiHuaClick?: (starName: string, siHua: string) => void;
  /** iztro 原始宫位数据，用于显示完整排盘字段 */
  displayData?: PalaceDisplayData;
  /** 是否显示完整盘附加字段 */
  showDetails?: boolean;
}

const SIHUA_STYLES: Record<string, string> = {
  '禄': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  '权': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  '科': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  '忌': 'text-red-400 bg-red-500/10 border-red-500/30',
};

const SiHuaBadge = ({
  siHua,
  overlay,
  label,
  onClick,
}: {
  siHua: string;
  overlay?: boolean;
  label?: string;
  onClick?: (e: React.MouseEvent) => void;
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center text-[8px] px-1 rounded-full border leading-none py-px font-bold ml-1 flex-shrink-0',
        SIHUA_STYLES[siHua],
        overlay && 'border-dashed opacity-80',
        onClick && 'cursor-pointer hover:opacity-100',
      )}
      onClick={onClick}
    >
      {overlay && label && <span className="mr-px opacity-70">{label}</span>}
      {siHua}
    </span>
  );
};

const MINOR_TYPE_STYLE: Record<string, string> = {
  soft: 'text-sky-500/75',
  tough: 'text-red-500/70',
  lucun: 'text-emerald-500/75',
  tianma: 'text-cyan-500/75',
  flower: 'text-pink-500/75',
  helper: 'text-indigo-500/75',
};

function starMutagen(star: IztroStar): string | undefined {
  return star.mutagen === '禄' || star.mutagen === '权' || star.mutagen === '科' || star.mutagen === '忌'
    ? star.mutagen
    : undefined;
}

function brightnessLabel(star: IztroStar): string {
  const labelMap: Record<string, string> = {
    bright: '旺',
    normal: '',
    dim: '陷',
  };
  const label = star.brightness ? (labelMap[star.brightness] ?? star.brightness) : '';
  return label ? ` ${label}` : '';
}

export default function PalaceCell({
  palace, onClick, onStarClick, isSelected, isSanFang, delay = 0,
  overlayStarSiHua, overlayLabel, onSiHuaClick, displayData, showDetails = false,
}: PalaceCellProps) {
  const { branch, stem, name, stars, daXianAge, isCurrentDaXian, isMingGong, isShenGong } = palace;
  const ganzhi = `${STEMS[stem]}${BRANCHES[branch]}`;

  const majorStars = displayData?.majorStars ?? stars.filter(s => s.type === 'major').map(s => ({
    name: s.name,
    type: 'major',
    scope: 'origin',
    brightness: s.brightness,
    mutagen: s.siHua,
  }));
  const minorStars = displayData?.minorStars ?? stars.filter(s => s.type === 'lucky' || s.type === 'sha').map(s => ({
    name: s.name,
    type: s.type,
    scope: 'origin',
    brightness: s.brightness,
    mutagen: s.siHua,
  }));
  const adjectiveStars = displayData?.adjectiveStars ?? stars.filter(s => s.type === 'minor').map(s => ({
    name: s.name,
    type: 'adjective',
    scope: 'origin',
    brightness: s.brightness,
    mutagen: s.siHua,
  }));

  const toCompatStar = (star: IztroStar): Star => {
    const existing = stars.find(s => s.name === star.name);
    if (existing) return existing;
    return {
      name: star.name,
      type: star.type === 'tough' ? 'sha' : star.type === 'soft' || star.type === 'lucun' || star.type === 'tianma' ? 'lucky' : 'minor',
      brightness: star.brightness === '庙' || star.brightness === '旺' ? 'bright' : star.brightness === '陷' || star.brightness === '不' ? 'dim' : 'normal',
      siHua: starMutagen(star) as Star['siHua'],
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      onClick={onClick}
      className="palace-cell relative flex flex-col p-1.5 cursor-pointer transition-all duration-200 h-full"
      style={{
        minHeight: '90px',
        background: isCurrentDaXian
          ? 'rgba(147,51,234,0.08)'
          : isSelected
          ? 'rgba(37,99,235,0.18)'
          : isSanFang
          ? 'rgba(37,99,235,0.09)'
          : isMingGong
          ? 'rgba(212,168,67,0.04)'
          : 'var(--chart-palace-bg)',
        boxShadow: isCurrentDaXian
          ? 'inset 3px 0 0 rgba(147,51,234,0.5)'
          : isSelected
          ? 'inset 0 0 0 1.5px rgba(37,99,235,0.7)'
          : isSanFang
          ? 'inset 0 0 0 1px rgba(37,99,235,0.4)'
          : 'none',
      }}
    >
      {/* 大限年龄 */}
      {daXianAge && (
        <div className={clsx(
          'absolute top-1 right-1 text-[9px] font-mono tabular-nums',
          isCurrentDaXian ? 'text-purple-400' : ''
        )}
          style={!isCurrentDaXian ? { color: 'var(--t-faint)', opacity: 0.75 } : undefined}
        >
          {daXianAge[0]}–{daXianAge[1]}
        </div>
      )}

      {/* 宫名行 */}
      <div className="flex items-center gap-1 mb-0.5 pr-8">
        <span className={clsx('text-[10px] font-medium tracking-wide',
          isMingGong ? 'text-amber-500' : isShenGong ? 'text-sky-500' : ''
        )}
          style={!isMingGong && !isShenGong ? { color: 'var(--t-faint)' } : undefined}
        >
          {name}
        </span>
        {isMingGong && (
          <span className="text-[7px] text-amber-500/80 border border-amber-500/30 px-0.5 rounded leading-tight">命</span>
        )}
        {isShenGong && (
          <span className="text-[7px] text-sky-500/80 border border-sky-500/30 px-0.5 rounded leading-tight">身</span>
        )}
        {showDetails && displayData?.isOriginalPalace && (
          <span className="text-[7px] text-violet-500/80 border border-violet-500/30 px-0.5 rounded leading-tight">因</span>
        )}
      </div>

      {/* 干支 */}
      <div className="text-[9px] font-mono mb-1 flex items-center gap-1 flex-wrap" style={{ color: 'var(--t-faint)', opacity: 0.75 }}>
        <span>{ganzhi}</span>
        {showDetails && displayData?.runtimeStars.changsheng12 && <span>· {displayData.runtimeStars.changsheng12}</span>}
        {showDetails && displayData?.runtimeStars.boshi12 && <span>· {displayData.runtimeStars.boshi12}</span>}
      </div>

      {/* 主星 */}
      <div className="flex flex-col gap-0.5 flex-1">
        {majorStars.length === 0 && (
          <span className="text-[10px] italic" style={{ color: 'var(--t-faint)', opacity: 0.6 }}>空宫</span>
        )}
        {majorStars.map((star) => {
          const overlaySiHua = overlayStarSiHua?.[star.name];
          return (
            <div
              key={star.name}
              className="flex items-center"
              onClick={e => { e.stopPropagation(); onStarClick?.(toCompatStar(star)); }}
            >
              <span className={clsx(
                'text-[13px] leading-tight font-bold tracking-tight cursor-pointer hover:brightness-125 transition-all',
                star.brightness === '庙' || star.brightness === '旺' ? 'text-amber-300' : star.brightness === '陷' || star.brightness === '不' ? 'text-amber-700/80' : 'text-amber-500',
              )}>
                {star.name}<span className="text-[8px] font-normal opacity-70">{brightnessLabel(star)}</span>
              </span>
              {starMutagen(star) && <SiHuaBadge siHua={starMutagen(star)!} />}
              {overlaySiHua && (
                <SiHuaBadge
                  siHua={overlaySiHua}
                  overlay
                  label={overlayLabel}
                  onClick={e => {
                    e.stopPropagation();
                    onSiHuaClick?.(star.name, overlaySiHua);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 辅星 */}
      {minorStars.length > 0 && (
        <div className="flex flex-wrap gap-x-1 mt-0.5">
          {minorStars.map(s => {
            const overlaySiHua = overlayStarSiHua?.[s.name];
            return (
              <span
                key={s.name}
                className={clsx('inline-flex items-center text-[9px] leading-tight cursor-pointer', MINOR_TYPE_STYLE[s.type] ?? 'text-sky-500/70')}
                onClick={e => { e.stopPropagation(); onStarClick?.(toCompatStar(s)); }}
              >
                {s.name}<span className="text-[7px] opacity-60">{brightnessLabel(s)}</span>
                {starMutagen(s) && <SiHuaBadge siHua={starMutagen(s)!} />}
                {overlaySiHua && (
                  <SiHuaBadge
                    siHua={overlaySiHua}
                    overlay
                    label={overlayLabel}
                    onClick={e => {
                      e.stopPropagation();
                      onSiHuaClick?.(s.name, overlaySiHua);
                    }}
                  />
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* 杂曜 */}
      {adjectiveStars.length > 0 && (
        <div className="flex flex-wrap gap-x-1 mt-0.5">
          {adjectiveStars.map(s => (
            <span
              key={s.name}
              className={clsx('text-[8px] leading-tight cursor-pointer', MINOR_TYPE_STYLE[s.type] ?? 'text-[color:var(--t-faint)] opacity-75')}
              onClick={e => { e.stopPropagation(); onStarClick?.(toCompatStar(s)); }}
            >
              {s.name}{starMutagen(s) && <SiHuaBadge siHua={starMutagen(s)!} />}
            </span>
          ))}
        </div>
      )}

      {/* 岁前/将前/小限 */}
      {showDetails && displayData && (
        <div className="mt-1 pt-1 border-t text-[7px] leading-snug space-y-0.5" style={{ borderColor: 'var(--t-border)', color: 'var(--t-faint)', opacity: 0.78 }}>
          <div className="flex flex-wrap gap-x-1">
            {displayData.runtimeStars.jiangqian12 && <span>将前 {displayData.runtimeStars.jiangqian12}</span>}
            {displayData.runtimeStars.suiqian12 && <span>岁前 {displayData.runtimeStars.suiqian12}</span>}
          </div>
          {displayData.ages.length > 0 && (
            <div className="truncate" title={displayData.ages.join('、')}>小限 {displayData.ages.join('、')}</div>
          )}
        </div>
      )}
    </motion.div>
  );
}

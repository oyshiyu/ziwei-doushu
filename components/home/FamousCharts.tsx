'use client';

import { useRouter } from 'next/navigation';
import { FAMOUS_PERSONS } from '@/lib/ziwei/famous';
import { formToSearchParams } from '@/lib/ziwei/share';
import type { Theme } from '@/components/ThemeProvider';

interface FamousChartsProps {
  colors: Record<string, string>;
  theme: Theme;
}

export default function FamousCharts({ colors, theme }: FamousChartsProps) {
  const router = useRouter();
  const people = FAMOUS_PERSONS.slice(0, 6);

  return (
    <section className="relative z-10 px-6 md:px-10 lg:px-14 py-20">
      <div className="mx-auto" style={{ maxWidth: '1280px' }}>
        <div className="flex items-end justify-between gap-6 mb-8 flex-wrap">
          <div>
            <div className="text-[10px] tracking-[0.45em] uppercase mb-3" style={{ color: colors.tagText }}>
              Famous Charts
            </div>
            <h2 className="font-bold tracking-tight" style={{ color: colors.textPrimary, fontSize: 'clamp(26px, 3.5vw, 40px)' }}>
              名人命盘库
            </h2>
          </div>
          <p className="text-sm leading-relaxed max-w-md" style={{ color: colors.textSecond }}>
            选取公开生日资料作为学习样本，快速进入命盘页观察主星、四化、大限与格局。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {people.map(person => (
            <button
              key={person.id}
              onClick={() => {
                const params = formToSearchParams({
                  name: person.name,
                  year: String(person.year),
                  month: String(person.month),
                  day: String(person.day),
                  clockHour: '8',
                  clockMinute: '0',
                  unknownTime: false,
                  province: '',
                  city: '',
                  longitude: 120,
                  gender: person.gender,
                });
                router.push(`/chart?${params.toString()}`);
              }}
              className="text-left p-5 transition-all hover:-translate-y-0.5"
              style={{
                background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.82)',
                border: `1px solid ${colors.cardBorder ?? 'rgba(184,146,42,0.2)'}`,
                borderRadius: '14px',
                boxShadow: colors.cardShadow,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                  color: colors.goldSolid,
                  border: `1px solid ${colors.goldLine}`,
                  background: theme === 'dark' ? 'rgba(212,168,67,0.08)' : 'rgba(212,168,67,0.12)',
                }}>
                  {person.category}
                </span>
                <span className="text-[11px]" style={{ color: colors.textFaint }}>
                  {person.year}.{person.month}.{person.day}
                </span>
              </div>
              <div className="text-lg font-semibold mb-1" style={{ color: colors.textPrimary }}>
                {person.name}
              </div>
              <div className="text-xs mb-3" style={{ color: colors.textMuted }}>
                {person.description}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: colors.textSecond }}>
                {person.notable}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

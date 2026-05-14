import type { IztroPalace, IztroStar, Palace, ZiweiChart } from './types';
import { BRANCHES } from './constants';

export interface AstrolabeFact {
  label: string;
  value: string;
}

export interface PalaceDisplayData {
  palace: IztroPalace | undefined;
  majorStars: IztroStar[];
  minorStars: IztroStar[];
  adjectiveStars: IztroStar[];
  runtimeStars: {
    changsheng12: string;
    boshi12: string;
    jiangqian12: string;
    suiqian12: string;
  };
  ages: number[];
  isOriginalPalace: boolean;
}

export function getIztroPalace(chart: ZiweiChart, palace: Palace): IztroPalace | undefined {
  return chart.iztro.astrolabe.palaces.find(p => p.earthlyBranch === BRANCHES[palace.branch])
    ?? chart.iztro.astrolabe.palaces.find(p => p.name === palace.name);
}

export function getPalaceDisplayData(chart: ZiweiChart, palace: Palace): PalaceDisplayData {
  const iztroPalace = getIztroPalace(chart, palace);

  return {
    palace: iztroPalace,
    majorStars: iztroPalace?.majorStars ?? [],
    minorStars: iztroPalace?.minorStars ?? [],
    adjectiveStars: iztroPalace?.adjectiveStars ?? [],
    runtimeStars: {
      changsheng12: iztroPalace?.changsheng12 ?? '',
      boshi12: iztroPalace?.boshi12 ?? '',
      jiangqian12: iztroPalace?.jiangqian12 ?? '',
      suiqian12: iztroPalace?.suiqian12 ?? '',
    },
    ages: iztroPalace?.ages ?? [],
    isOriginalPalace: iztroPalace?.isOriginalPalace ?? false,
  };
}

export function getAstrolabeFacts(chart: ZiweiChart): AstrolabeFact[] {
  const astrolabe = chart.iztro.astrolabe;
  return [
    { label: '阳历', value: astrolabe.solarDate },
    { label: '农历', value: astrolabe.lunarDate },
    { label: '四柱', value: astrolabe.chineseDate },
    { label: '时辰', value: `${astrolabe.time} ${astrolabe.timeRange}` },
    { label: '生肖', value: astrolabe.zodiac },
    { label: '星座', value: astrolabe.sign },
    { label: '命主', value: astrolabe.soul },
    { label: '身主', value: astrolabe.body },
  ];
}

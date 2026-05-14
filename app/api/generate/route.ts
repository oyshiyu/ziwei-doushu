import { NextResponse } from 'next/server';
import { generateChart } from '@/lib/ziwei/algorithm';
import type { BirthInfo } from '@/lib/ziwei/types';

export const runtime = 'nodejs';

function parseBirthInfo(value: unknown): BirthInfo {
  if (!value || typeof value !== 'object') {
    throw new Error('出生信息不能为空');
  }

  const data = value as Partial<BirthInfo>;
  const year = Number(data.year);
  const month = Number(data.month);
  const day = Number(data.day);
  const hour = Number(data.hour);

  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error('年份范围必须在 1900–2100 之间');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('月份必须在 1–12 之间');
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error('日期必须在 1–31 之间');
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 12) {
    throw new Error('时辰必须是 0–12 的索引');
  }
  if (data.gender !== 'male' && data.gender !== 'female') {
    throw new Error('性别必须是 male 或 female');
  }

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error('出生日期不存在');
  }

  return {
    year,
    month,
    day,
    hour,
    gender: data.gender,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : undefined,
    province: typeof data.province === 'string' && data.province.trim() ? data.province.trim() : undefined,
    city: typeof data.city === 'string' && data.city.trim() ? data.city.trim() : undefined,
    longitude: typeof data.longitude === 'number' && Number.isFinite(data.longitude) ? data.longitude : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const birthInfo = parseBirthInfo(await request.json());
    return NextResponse.json(generateChart(birthInfo));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '命盘生成失败' },
      { status: 400 },
    );
  }
}

import { NextResponse } from 'next/server';
import {
  buildInterpretRequestBody,
  convertOpenAIStreamLine,
  getChatCompletionsUrl,
  resolveOpenAICompatibleConfig,
  type InterpretMessage,
} from '@/lib/ai/openai-compatible';
import type { ZiweiChart } from '@/lib/ziwei/types';

export const runtime = 'nodejs';

function parseInterpretRequest(value: unknown): { chart: ZiweiChart; messages: InterpretMessage[] } {
  if (!value || typeof value !== 'object') {
    throw new Error('请求体不能为空');
  }

  const data = value as { chart?: unknown; messages?: unknown };
  if (!data.chart || typeof data.chart !== 'object') {
    throw new Error('命盘数据不能为空');
  }
  if (!Array.isArray(data.messages)) {
    throw new Error('消息列表不能为空');
  }

  const messages = data.messages.map((message): InterpretMessage => {
    if (!message || typeof message !== 'object') {
      throw new Error('消息格式不正确');
    }
    const item = message as Partial<InterpretMessage>;
    if (item.role !== 'user' && item.role !== 'assistant') {
      throw new Error('消息角色必须是 user 或 assistant');
    }
    if (typeof item.content !== 'string' || !item.content.trim()) {
      throw new Error('消息内容不能为空');
    }
    return { role: item.role, content: item.content.trim() };
  });

  return { chart: data.chart as ZiweiChart, messages };
}

export async function POST(request: Request) {
  try {
    const { chart, messages } = parseInterpretRequest(await request.json());
    const config = resolveOpenAICompatibleConfig();

    const upstream = await fetch(getChatCompletionsUrl(config), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildInterpretRequestBody(config, chart, messages)),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '');
      return NextResponse.json(
        { error: detail || 'AI 解读服务请求失败' },
        { status: upstream.status || 502 },
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let pending = '';
    let sentDone = false;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = upstream.body!.getReader();
        let failed = false;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            pending += decoder.decode(value, { stream: true });
            const lines = pending.split(/\r?\n/);
            pending = lines.pop() ?? '';

            for (const line of lines) {
              const converted = convertOpenAIStreamLine(line);
              if (!converted) continue;
              sentDone = converted.includes('[DONE]');
              controller.enqueue(encoder.encode(converted));
            }
          }

          if (pending) {
            const converted = convertOpenAIStreamLine(pending);
            if (converted) {
              sentDone = converted.includes('[DONE]');
              controller.enqueue(encoder.encode(converted));
            }
          }
          if (!sentDone) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          }
        } catch (error) {
          failed = true;
          controller.error(error);
        } finally {
          reader.releaseLock();
          if (!failed) controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI 解读失败' },
      { status: 400 },
    );
  }
}

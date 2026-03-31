// SSE client for AI SDK v6 UI Message Stream protocol.
// Compatible event types: text-delta, tool-call, tool-result,
// tool-output-available, tool-input-available, finish, error, start.

import type { SSEEvent } from './types';

export async function parseSSEStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  // toolCallId → toolName (tool-output-available lacks toolName)
  const toolNameMap = new Map<string, string>();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === '[DONE]') continue;

        try {
          const evt = JSON.parse(raw);

          switch (evt.type) {
            case 'text-delta':
              onEvent({ type: 'text-delta', delta: evt.delta ?? '' });
              break;

            case 'tool-call':
            case 'tool-call-end':
            case 'tool-input-available': {
              const callId = evt.toolCallId ?? evt.id ?? '';
              const toolName = evt.toolName ?? '';
              if (callId && toolName) toolNameMap.set(callId, toolName);
              onEvent({ type: 'tool-call', toolCallId: callId, toolName, args: evt.args ?? evt.input });
              break;
            }

            case 'tool-result':
            case 'tool-output-available': {
              const callId = evt.toolCallId ?? evt.id ?? '';
              const toolName = evt.toolName ?? toolNameMap.get(callId) ?? '';
              onEvent({
                type: 'tool-result',
                toolCallId: callId,
                toolName,
                result: evt.result ?? evt.output,
              });
              break;
            }

            case 'error':
              onEvent({ type: 'error', error: evt.errorText ?? JSON.stringify(evt) });
              break;

            case 'finish':
              onEvent({ type: 'finish' });
              break;

            // Noise — intentionally ignored
            case 'text-start':
            case 'text-end':
            case 'tool-call-start':
            case 'tool-call-delta':
            case 'start-step':
            case 'finish-step':
            case 'reasoning-start':
            case 'reasoning-delta':
            case 'reasoning-end':
            case 'source':
              break;

            default:
              break;
          }
        } catch {
          // skip unparseable lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

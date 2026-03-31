export type TextPart = { type: 'text'; text: string };

export type ToolLoadingPart = {
  type: 'tool-loading';
  toolCallId: string;
  toolName: string;
};

export type ToolResultPart = {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: unknown;
};

export type MessagePart = TextPart | ToolLoadingPart | ToolResultPart;

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
};

// SSE events from the AI SDK v6 protocol
export type SSEEvent =
  | { type: 'text-delta'; delta: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: unknown }
  | { type: 'tool-result'; toolCallId: string; toolName: string; result: unknown }
  | { type: 'error'; error: string }
  | { type: 'finish' };

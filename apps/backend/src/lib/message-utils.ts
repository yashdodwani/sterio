/**
 * Extract text content from UIMessage parts array.
 * Parts are JSONB arrays with typed objects like { type: "text", text: "..." }.
 */
export function extractTextFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return JSON.stringify(parts)
  return parts
    .filter((p: any) => p.type === "text")
    .map((p: any) => p.text ?? "")
    .join(" ")
}

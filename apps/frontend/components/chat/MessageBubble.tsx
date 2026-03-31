import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { ProductCarousel } from '@/components/ui/ProductCarousel';
import type { ChatMessage } from '@/lib/chat/types';
import type { Product } from '@/lib/types';

// Remove lines that are just a bare URL — redundant when product cards are shown
function removeStandaloneUrls(text: string): string {
  return text
    .replace(/^[ \t]*https?:\/\/\S+\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

function parseSuggestions(text: string): { mainText: string; suggestions: string[] } {
  // Primary: **Suggestions:** or similar explicit bold header
  const strictMatch = text.match(/\*{0,2}Suggestions[^a-zA-Z\n]*\n((?:- .+\n?)+)\s*$/);
  if (strictMatch?.index !== undefined) {
    const suggestions = strictMatch[1]
      .split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim()).filter(Boolean);
    return { mainText: text.slice(0, strictMatch.index).trimEnd(), suggestions };
  }

  // Fallback: any "lead-in sentence ending with colon:\n- short bullets" at the end of the text
  const looseMatch = text.match(/\n\n([^\n]+:\n)((?:- .{1,60}\n?){2,})\s*$/);
  if (looseMatch?.index !== undefined) {
    const suggestions = looseMatch[2]
      .split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim()).filter(Boolean);
    if (suggestions.length >= 2) {
      return { mainText: text.slice(0, looseMatch.index).trimEnd(), suggestions };
    }
  }

  return { mainText: text, suggestions: [] };
}

// Tools whose results contain product listings
const PRODUCT_TOOLS = new Set([
  'searchProducts',
  'search_products',
  'showProducts',
  'show_products',
  'getProductDetails',
  'get_product_details',
]);

// Normalise varying backend product shapes → our Product type
function normalizeProduct(item: unknown): Product | null {
  if (!item || typeof item !== 'object') return null;
  const p = item as Record<string, unknown>;
  if (!p.id || !p.name) return null;
  console.log('[normalizeProduct] raw item:', p);

  const rawPrice = typeof p.price === 'number' ? p.price : 0;
  const currency = p.currency === 'USDC' ? 'USDC' : 'USD';

  return {
    id: String(p.id),
    name: String(p.name),
    price: rawPrice,
    currency,
    imageUrl: String(p.imageUrl ?? p.image ?? ''),
    marketplace: String(p.marketplace ?? p.retailer ?? p.brand ?? ''),
    productUrl: p.product_url ? String(p.product_url) : (p.productUrl ? String(p.productUrl) : undefined),
    asin: p.asin ? String(p.asin) : undefined,
    rating: typeof p.rating === 'number' ? p.rating : undefined,
    reviewCount: p.reviewCount != null ? String(p.reviewCount) : undefined,
  };
}

function extractProducts(result: unknown): Product[] | null {
  if (!result) return null;
  if (Array.isArray(result)) {
    const mapped = result.map(normalizeProduct).filter((p): p is Product => p !== null);
    return mapped.length > 0 ? mapped : null;
  }
  const r = result as Record<string, unknown>;
  for (const key of ['products', 'results', 'items', 'data']) {
    if (Array.isArray(r[key])) {
      const mapped = (r[key] as unknown[]).map(normalizeProduct).filter((p): p is Product => p !== null);
      if (mapped.length > 0) return mapped;
    }
  }
  // Single product result
  const single = normalizeProduct(result);
  return single ? [single] : null;
}

// Animated dots shown while the assistant hasn't produced any content yet
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: 'var(--primary-light)',
            opacity: 0.5,
            animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function MessageBubble({ message, onSuggestion }: { message: ChatMessage; onSuggestion?: (text: string) => void }) {
  const isUser = message.role === 'user';
  const isEmpty = message.parts.length === 0;

  return (
    <div className={`msg-enter ${isUser ? 'flex justify-end py-1.5' : 'flex gap-4 items-start py-3.5'}`}>
      {!isUser && (
        <div className="flex-none mt-[3px]">
          <Image src="/logo.jpg" alt="Sterio" width={20} height={20} className="rounded-md" />
        </div>
      )}

      <div className={isUser ? 'max-w-[62%]' : 'flex-1 min-w-0'}>
        {/* Thinking state — empty assistant message before first event */}
        {!isUser && isEmpty && <ThinkingDots />}

        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            return isUser ? (
              <div
                key={i}
                className="px-4 py-2.5 rounded-[18px] text-[13.5px] leading-relaxed"
                style={{
                  background:
                    'linear-gradient(var(--surface-elevated), var(--surface-elevated)) padding-box, linear-gradient(145deg, rgba(162,155,254,0.38) 0%, rgba(108,92,231,0.14) 100%) border-box',
                  border: '1px solid transparent',
                  color: 'var(--text-primary)',
                }}
              >
                {part.text}
              </div>
            ) : (() => {
              const { mainText, suggestions: fullSuggestions } = parseSuggestions(removeStandaloneUrls(part.text));

              return (
                <div key={i}>
                  <div className="prose-chat">
                    <ReactMarkdown>{mainText}</ReactMarkdown>
                  </div>
                  {fullSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {fullSuggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => onSuggestion?.(s)}
                          className="px-3.5 py-1.5 rounded-full text-[11.5px] transition-all duration-150 flex items-center gap-1.5"
                          style={{
                            background: 'rgba(162,155,254,0.06)',
                            border: '1px solid rgba(162,155,254,0.18)',
                            color: 'var(--primary-light)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(162,155,254,0.14)';
                            e.currentTarget.style.borderColor = 'rgba(162,155,254,0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(162,155,254,0.06)';
                            e.currentTarget.style.borderColor = 'rgba(162,155,254,0.18)';
                          }}
                        >
                          <span style={{ fontSize: '9px', opacity: 0.6 }}>→</span>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })();
          }

          if (part.type === 'tool-loading') {
            return <LoadingCard key={i} count={3} />;
          }

          if (part.type === 'tool-result' && PRODUCT_TOOLS.has(part.toolName)) {
            const products = extractProducts(part.result);
            if (products && products.length > 0) {
              return <ProductCarousel key={i} products={products} />;
            }
          }

          return null;
        })}
      </div>
    </div>
  );
}

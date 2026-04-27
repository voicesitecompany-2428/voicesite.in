'use client';

import { useOnboarding } from '@/components/OnboardingContext';

// Price range chips → profit_tier (1–4, capped)
const PRICE_CHIPS: { label: string; tier: number }[] = [
  { label: '₹10–20', tier: 1 },
  { label: '₹20–30', tier: 2 },
  { label: '₹30–40', tier: 3 },
  { label: '₹40–50', tier: 4 },
  { label: '₹50+',   tier: 4 }, // capped at 4 per spec
];

const TIER_COLORS = [
  'border-red-200 bg-red-50 text-red-600',
  'border-orange-200 bg-orange-50 text-orange-600',
  'border-yellow-200 bg-yellow-50 text-yellow-600',
  'border-emerald-200 bg-emerald-50 text-emerald-600',
];

export default function ProfitabilityPhase({ onNext }: { onNext: () => void }) {
  const { items, updateItemField } = useOnboarding();

  function selectChip(itemIdx: number, chipIdx: number) {
    updateItemField(itemIdx, 'profit_chip', chipIdx);
    updateItemField(itemIdx, 'profit_tier', PRICE_CHIPS[chipIdx].tier);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>
          </span>
          <h2 className="text-base font-bold text-slate-800">Profitability Tier</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          What&apos;s the typical profit margin on each item? Higher = better for your bottom line.
        </p>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-3 pb-2">
        {items.length === 0 ? (
          <EmptyPlaceholder />
        ) : (
          items.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                  {item.price > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">Selling at ₹{item.price}</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${TIER_COLORS[item.profit_tier - 1]}`}>
                  Tier {item.profit_tier}
                </span>
              </div>

              {/* Price range chip row */}
              <div className="flex flex-wrap gap-1.5">
                {PRICE_CHIPS.map((chip, chipIdx) => {
                  const isSelected = item.profit_chip === chipIdx;
                  return (
                    <button
                      key={chipIdx}
                      type="button"
                      onClick={() => selectChip(idx, chipIdx)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95
                        ${isSelected
                          ? 'border-primary bg-primary text-white shadow-sm shadow-primary/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:bg-primary-light hover:text-primary'
                        }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 flex justify-end border-t border-slate-100 mt-4">
        <button
          onClick={onNext}
          className="rounded-[10px] bg-primary px-8 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition hover:bg-primary-dark active:scale-[0.98]"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function EmptyPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="material-symbols-outlined text-slate-200 mb-3" style={{ fontSize: 48 }}>payments</span>
      <p className="text-sm text-slate-400">No items to rate.</p>
    </div>
  );
}

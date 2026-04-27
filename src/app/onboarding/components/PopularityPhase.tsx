'use client';

import { useOnboarding } from '@/components/OnboardingContext';

const STAR_LABELS = ['Low', 'Normal', 'High', 'Top Pick'];

export default function PopularityPhase({ onNext }: { onNext: () => void }) {
  const { items, updateItemField } = useOnboarding();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>star</span>
          </span>
          <h2 className="text-base font-bold text-slate-800">Popularity Rating</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          How popular is each item with your customers? 4 stars = your bestseller.
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
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                  {item.price > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">₹{item.price}</p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                  {STAR_LABELS[(item.star_rating - 1)] ?? 'Normal'}
                </span>
              </div>

              {/* Star selector */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => updateItemField(idx, 'star_rating', star)}
                    className="group flex-1 flex flex-col items-center gap-1 rounded-lg py-2 transition-all
                      hover:bg-amber-50 active:scale-95"
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <span
                      className={`material-symbols-outlined transition-all duration-200 ${
                        star <= item.star_rating
                          ? 'text-amber-400 drop-shadow-sm'
                          : 'text-slate-200 group-hover:text-amber-200'
                      }`}
                      style={{ fontSize: 28, fontVariationSettings: star <= item.star_rating ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      star
                    </span>
                    <span className={`text-[9px] font-medium ${star <= item.star_rating ? 'text-amber-500' : 'text-slate-300'}`}>
                      {star}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer CTA */}
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
      <span className="material-symbols-outlined text-slate-200 mb-3" style={{ fontSize: 48 }}>menu_book</span>
      <p className="text-sm text-slate-400">No items extracted — your menu will start empty.</p>
      <p className="text-xs text-slate-300 mt-1">You can add items from the dashboard later.</p>
    </div>
  );
}

'use client';

import { useOnboarding } from '@/components/OnboardingContext';

const COMPLEXITY_OPTIONS: { label: string; sublabel: string; tier: number; icon: string; color: string }[] = [
  { label: 'Heat & Serve',  sublabel: 'Pre-made, just warm up',      tier: 1, icon: 'microwave',       color: 'text-blue-500 bg-blue-50 border-blue-200' },
  { label: 'Simple Cook',   sublabel: 'Quick prep, standard steps',  tier: 2, icon: 'local_fire_department', color: 'text-amber-500 bg-amber-50 border-amber-200' },
  { label: 'Made Fresh',    sublabel: 'Prepared per order',          tier: 3, icon: 'cooking',          color: 'text-orange-500 bg-orange-50 border-orange-200' },
  { label: 'From Scratch',  sublabel: 'Complex multi-step process',  tier: 4, icon: 'restaurant',       color: 'text-red-500 bg-red-50 border-red-200' },
];

export default function ComplexityPhase({ onNext }: { onNext: () => void }) {
  const { items, updateItemField } = useOnboarding();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cooking</span>
          </span>
          <h2 className="text-base font-bold text-slate-800">Preparation Complexity</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          How much effort does each item take to prepare? This helps optimise your kitchen workflow.
        </p>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-3 pb-2">
        {items.length === 0 ? (
          <EmptyPlaceholder />
        ) : (
          items.map((item, idx) => {
            const selected = COMPLEXITY_OPTIONS.find(o => o.tier === item.prep_complexity_tier);
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                  {selected && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${selected.color}`}>
                      {selected.label}
                    </span>
                  )}
                </div>

                {/* Option grid — 2×2 */}
                <div className="grid grid-cols-2 gap-1.5">
                  {COMPLEXITY_OPTIONS.map(opt => {
                    const isSelected = item.prep_complexity_tier === opt.tier;
                    return (
                      <button
                        key={opt.tier}
                        type="button"
                        onClick={() => updateItemField(idx, 'prep_complexity_tier', opt.tier)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all duration-150 active:scale-95
                          ${isSelected
                            ? 'border-primary bg-primary text-white shadow-sm shadow-primary/20'
                            : 'border-slate-200 bg-white hover:border-primary/30 hover:bg-primary-light'
                          }`}
                      >
                        <span
                          className={`material-symbols-outlined shrink-0 transition-colors ${isSelected ? 'text-white' : 'text-slate-400'}`}
                          style={{ fontSize: 16 }}
                        >
                          {opt.icon}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                            {opt.label}
                          </p>
                          <p className={`text-[9px] truncate ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            {opt.sublabel}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
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
      <span className="material-symbols-outlined text-slate-200 mb-3" style={{ fontSize: 48 }}>cooking</span>
      <p className="text-sm text-slate-400">No items to rate.</p>
    </div>
  );
}

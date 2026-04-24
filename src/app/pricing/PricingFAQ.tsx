'use client';

import { useState } from 'react';

const faqs = [
  {
    q: 'What is included in the one-time setup fee?',
    a: 'The ₹1,999 setup fee covers your store creation, AI menu scanning, professional food photo matching, NFC card, QR stickers, and onboarding support. You pay it once — never again.',
  },
  {
    q: 'Is there a commission on orders?',
    a: 'Zero. vsite charges a flat monthly fee only. Every rupee your customer pays goes directly to you — no per-order commission, no aggregator fee, no surprise deductions.',
  },
  {
    q: 'What happens after the 14-day free trial?',
    a: 'After your trial ends, you choose a plan to continue. No credit card is needed to start, and there is no automatic charge. Your menu stays safe — we will remind you before anything changes.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes. You can upgrade from Smart QR Menu to QR Ordering + Payment at any time from your dashboard. The price difference is prorated to your billing cycle.',
  },
  {
    q: 'Do you offer discounts for multiple branches?',
    a: 'Yes — restaurants with 3 or more branches get a discount. Message us on WhatsApp and we will set up a custom plan for you.',
  },
];

export default function PricingFAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-14 sm:py-20 px-4 bg-background-light">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Pricing FAQ</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold font-display text-slate-900">
            Pricing Questions
          </h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 sm:py-5 text-left"
              >
                <span className="font-bold text-slate-900 text-base leading-snug">{faq.q}</span>
                <span
                  className="material-symbols-outlined text-primary text-xl shrink-0 transition-transform duration-200"
                  style={{ transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  expand_more
                </span>
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

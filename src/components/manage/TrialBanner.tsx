'use client';

import Link from 'next/link';
import { usePlan } from '@/components/PlanContext';

export default function TrialBanner() {
    const { planLoading, canGoLive, isTrialActive, isTrialExpired, trialDaysLeft } = usePlan();

    if (planLoading) return null;

    // No banner if plenty of trial left
    if (isTrialActive && trialDaysLeft > 5) return null;

    // Subscription active — no banner needed
    if (canGoLive && !isTrialActive) return null;

    if (isTrialExpired) {
        return (
            <div className="flex items-center justify-between gap-4 bg-red-600 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <span className="material-symbols-outlined text-base shrink-0">warning</span>
                    Your free trial has ended. Your menu is now offline.
                </div>
                <Link
                    href="/manage/subscription"
                    className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                    Activate Plan →
                </Link>
            </div>
        );
    }

    // 0–5 days left in trial
    const dayLabel = trialDaysLeft === 0
        ? 'Your free trial ends today.'
        : `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left in your free trial.`;

    return (
        <div className="flex items-center justify-between gap-4 bg-amber-500 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
                <span className="material-symbols-outlined text-base shrink-0">schedule</span>
                {dayLabel} Activate a plan to keep your menu live.
            </div>
            <Link
                href="/manage/subscription"
                className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors"
            >
                Activate Plan →
            </Link>
        </div>
    );
}

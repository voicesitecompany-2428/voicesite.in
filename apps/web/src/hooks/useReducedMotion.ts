'use client';

import { useEffect, useState } from 'react';

/**
 * Whether the phone's "remove animations" setting is on, kept live.
 *
 * A hook rather than `prefersReducedMotion()` at render time: that returns
 * false on the server and the real answer on the client, so any style built
 * from it mismatched on hydration. This starts false on both and settles
 * after mount — the stylesheets' own `prefers-reduced-motion` blocks cover the
 * first paint.
 */
export function useReducedMotion(): boolean {
    const [reduce, setReduce] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduce(mq.matches);
        update();
        mq.addEventListener?.('change', update);
        return () => mq.removeEventListener?.('change', update);
    }, []);
    return reduce;
}

// Dynamic lazy shim for framer-motion to keep it out of the initial critical bundle.
// Usage: import { motion, AnimatePresence } from '@/lib/motionShim'
// This defers loading until a motion component actually mounts.
import React, { useEffect, useState, Suspense } from 'react';

type AnyComp = React.ComponentType<any>;

function loadFramer() {
  return import('framer-motion');
}

const motionTagCache = new Map<string | symbol, AnyComp>();

function createMotionTag(tag: string | symbol): AnyComp {
  if (motionTagCache.has(tag)) return motionTagCache.get(tag)!;

  const Wrapped = React.forwardRef<any, any>((props, ref) => {
    const [Real, setReal] = useState<AnyComp | null>(null);
    useEffect(() => {
      let alive = true;
      loadFramer().then(mod => {
        const motionObj: any = (mod as any).motion;
        const key = typeof tag === 'symbol' ? String(tag) : tag;
        const RealTag = motionObj?.[key as any];
        if (alive) setReal(() => RealTag || ((p: any) => <div {...p} />));
      });
      return () => { alive = false; };
    }, [tag]);

    if (!Real) return null;
    return <Real ref={ref} {...props}>{props.children}</Real>;
  });

  const displayTag = typeof tag === 'symbol' ? String(tag) : String(tag);
  (Wrapped as any).displayName = 'LazyMotion.' + displayTag;
  motionTagCache.set(tag, Wrapped as AnyComp);
  return Wrapped as AnyComp;
}

export const motion: any = new Proxy({}, {
  get(_t, prop: string | symbol) {
    return createMotionTag(prop as any);
  }
});

export const AnimatePresence: React.FC<any> = (props) => {
  const [Comp, setComp] = useState<AnyComp | null>(null);
  useEffect(() => {
    let alive = true;
    loadFramer().then(mod => { if (alive) setComp(() => (mod as any).AnimatePresence); });
    return () => { alive = false; };
  }, []);
  if (!Comp) return null;
  return <Comp {...props} />;
};

// Optional helper to eagerly warm framer-motion after first interaction.
let warmed = false;
export function warmFramerMotion() {
  if (warmed) return; warmed = true; loadFramer();
}
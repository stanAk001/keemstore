// Registry of code-rendered motion scenes that editors can pick in the admin.
// Keys must match MOTION_SCENES in server/src/validators/schemas.js.
import { lazy, Suspense } from 'react';
import Img from '../ui/Img.jsx';

const SmartLockPhone = lazy(() => import('./SmartLockPhone.jsx'));
const PowerOutageKit = lazy(() => import('./PowerOutageKit.jsx'));
const CreatorStudio = lazy(() => import('./CreatorStudio.jsx'));

export const MOTION_SCENES = {
  'smart-lock-phone': { label: 'Phone: live smart-lock app', Component: SmartLockPhone },
  'power-outage-kit': { label: 'Power outage: phone charging from a power bank', Component: PowerOutageKit },
  'creator-studio': { label: 'Creator: phone recording under a ring light', Component: CreatorStudio },
};

/** Motion scene when `motion` is set, otherwise the image (or video) at `src`. */
export function HeroMedia({ motion, aspect, motionClassName = '', className = '', ...imgProps }) {
  if (!MOTION_SCENES[motion]) return <Img aspect={aspect} className={className} {...imgProps} />;
  // motionClassName can supply responsive aspect classes (e.g. taller on phones).
  const box = motionClassName.includes('aspect-') ? {} : aspect ? { aspectRatio: String(aspect) } : undefined;
  return (
    <div className={`relative overflow-hidden ${aspect || motionClassName.includes('aspect-') ? '' : 'h-full w-full'} ${className} ${motionClassName}`} style={box}>
      <div className="absolute inset-0"><MotionScene name={motion} /></div>
    </div>
  );
}

export function MotionScene({ name, fallback = null }) {
  const scene = MOTION_SCENES[name];
  if (!scene) return fallback;
  const { Component } = scene;
  return (
    <Suspense fallback={<div className="h-full w-full bg-[#141210]" />}>
      <Component />
    </Suspense>
  );
}

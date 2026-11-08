/**
 * Motion a live vector scene leaves to CSS: a theme's mood decorations and
 * its parts' signature motions.
 *
 * Each animation is compiled once into a keyframes rule named by a hash of
 * its frames, and the element that plays it carries one inline `style`
 * that never changes from frame to frame, so the frame loop writes nothing
 * for it and the browser runs it on its own clock. The rules a scene uses
 * go into one `<style>` element inside its SVG (the same tree as the
 * elements, so a shadow root works too). A host's `prefers-reduced-motion`
 * stops every one of them, and a paused character holds them through
 * `--aora-play`. Static output never uses any of this: it draws the rest
 * pose.
 */
import type { SceneNode } from '../../render/scene.js';
import { K } from './kit.js';

/** How a motion eases. `sine` eases in and out, which over a back-and-forth reads as a sine wave. */
export type MotionEasing = 'sine' | 'linear' | 'ease-in' | 'ease-out' | 'step';

const TIMING: Record<MotionEasing, string> = {
  sine: 'ease-in-out',
  linear: 'linear',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  step: 'steps(2,jump-none)',
};

/** One stop of an animation: a share of the period, and the transform and opacity there. */
export interface Stop {
  at: number;
  transform?: string;
  opacity?: number;
}

/** An animation as an element plays it: its keyframes rule, and the inline style that runs it. */
export interface Compiled {
  name: string;
  rule: string;
  style: string;
}

const n3 = (v: number): number => Math.round(v * 1000) / 1000;

const compiled = new Map<string, Compiled>();

/**
 * Compile stops into a keyframes rule and the style that plays it for
 * `period` seconds, starting `phase` of the way through. A stop that turns
 * or scales about a point writes the point into its own transform
 * (`about`): an SVG element's transform origin is resolved differently from
 * one browser to the next, and the element's own origin is not.
 */
export function compile(
  stops: readonly Stop[],
  period: number,
  phase: number,
  easing: MotionEasing,
): Compiled {
  const frames = stops
    .map((stop) => {
      const decls = [
        stop.transform === undefined ? '' : `transform:${stop.transform}`,
        stop.opacity === undefined ? '' : `opacity:${n3(stop.opacity)}`,
      ]
        .filter(Boolean)
        .join(';');
      return `${n3(stop.at * 100)}%{${decls}}`;
    })
    .join('');
  const name = `aora-k${K.hash(frames).toString(36)}`;
  const duration = Math.max(0.05, period);
  const delay = -n3((((phase % 1) + 1) % 1) * duration);
  const key = `${name}|${duration}|${delay}|${easing}`;
  let found = compiled.get(key);
  if (!found) {
    found = {
      name,
      rule: `@keyframes ${name}{${frames}}`,
      // The play state after the shorthand, which would otherwise reset it to running.
      style: `animation:${name} ${n3(duration)}s ${TIMING[easing]} ${delay}s infinite;animation-play-state:var(--aora-play,running)`,
    };
    compiled.set(key, found);
  }
  return found;
}

/** `transform` applied about (x, y), as one transform list; `%` for a box's own shares. */
export const about = (x: number, y: number, transform: string, unit: 'px' | '%' = 'px'): string =>
  `translate(${n3(x)}${unit},${n3(y)}${unit}) ${transform} translate(${n3(-x)}${unit},${n3(-y)}${unit})`;

/** The class every animated element carries: what the reduced-motion rule and the pause read. */
export const ANIMATED = 'aora-anim';

const BASE =
  `.${ANIMATED}{transform-box:view-box;transform-origin:0 0}` +
  `@media (prefers-reduced-motion:reduce){.${ANIMATED}{animation:none!important}}`;

/** The attributes of an element that plays `animation`. */
export const animatedAttrs = (animation: Compiled): Record<string, string> => ({
  class: ANIMATED,
  style: animation.style,
});

/** What every page that plays an animation needs once, ahead of the keyframes. */
export const BASE_RULES: readonly string[] = [
  `.${ANIMATED}{transform-box:view-box;transform-origin:0 0}`,
  `@media (prefers-reduced-motion:reduce){.${ANIMATED}{animation:none!important}}`,
];

const sheets = new Map<string, string>();

/** The `<style>` a scene's animations need, or `null` when it plays none. */
export function styleNode(rules: ReadonlySet<string>): SceneNode | null {
  if (rules.size === 0) return null;
  const list = [...rules].sort();
  const key = list.join('');
  let text = sheets.get(key);
  if (text === undefined) {
    text = BASE + key;
    sheets.set(key, text);
  }
  return K.node('style', undefined, undefined, { text });
}

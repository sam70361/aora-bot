import { describe, expect, it } from 'vitest';
import * as element from '../src/index.js';

/*
 * These run in the default Node environment on purpose: there is no `window`
 * and no `document`, so anything the entry touches at import time fails here
 * rather than during server rendering.
 */

describe('entry point', () => {
  it('loads without a DOM', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof HTMLElement).toBe('undefined');
    expect(element.AoraBotElement).toBeTypeOf('function');
    expect(element.defineAoraBot).toBeTypeOf('function');
  });

  it('registers nothing without a DOM and does not throw', () => {
    expect(typeof customElements).toBe('undefined');
    expect(element.defineAoraBot()).toBe(element.AoraBotElement);
    expect(element.defineAoraBot('x-aora-bot')).toBe(element.AoraBotElement);
  });
});

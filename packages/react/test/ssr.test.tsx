import { describe, expect, it } from 'vitest';
import type React from 'react';
import { renderToString } from 'react-dom/server';
import {
  ActivityBadge,
  ActivityLine,
  AgentPortrait,
  AgentStateProvider,
  AvatarGroup,
  AvatarStatusDot,
  CharacterMark,
  CharacterMarkMirror,
  CharacterSelector,
  CelebrationLayer,
  GroupActivityBadge,
  LocaleProvider,
  CharacterStageProvider,
  SpriteMark,
  StagedMark,
  UnreadBadge,
} from '../src/index.js';
import type { SpriteManifest } from '../src/index.js';
import { WorkingBadge } from '../src/avatar/AvatarFrame.js';
import { layoutAvatarGroup, participantsFromMembers } from '../src/avatar/AvatarGroup.js';
import { createMarkCommandRegistry } from '../src/stage/commands.js';

/**
 * Server rendering smoke test.
 *
 * The documentation site is statically generated, so any component that
 * touches `window` or `document` during render fails the build rather than
 * failing in a browser. Catching that here keeps the failure next to the
 * component instead of in a deploy log.
 */

const SPRITE: SpriteManifest = {
  kind: 'sprite-mate',
  formatVersion: 1,
  id: 'demo',
  frameSize: [64, 64],
  frames: { '02': ['idle.png'] },
};

const agent = { id: 'nova', name: 'Nova' };
const members = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
  { id: 'd', name: 'D' },
];

describe('server rendering', () => {
  it.each([
    ['CharacterMark', <CharacterMark shape="blob" color="blue" state="thinking" sizePx={64} />],
    ['CharacterMarkMirror', <CharacterMarkMirror sourceId="x" color="red" />],
    ['AgentPortrait', <AgentPortrait agent={agent} />],
    ['AgentPortrait still', <AgentPortrait agent={agent} still />],
    ['AgentPortrait group', <AgentPortrait agent={{ id: 'g', members }} />],
    ['AvatarGroup', <AvatarGroup members={members} />],
    ['UnreadBadge', <UnreadBadge count={128} />],
    ['AvatarStatusDot', <AvatarStatusDot tone="online" pulse />],
    ['CharacterSelector', <CharacterSelector shape="hex" color="green" />],
    ['CharacterSelector line', <CharacterSelector shape="hex" color="green" face="line" nose="hook" />],
    ['CharacterMark line', <CharacterMark shape="pear" face="line" nose="curve" state="happy" />],
    ['StagedMark line', <StagedMark shape="ghost" face="line" nose={null} state="confused" />],
    ['AgentPortrait line', <AgentPortrait agent={{ ...agent, face: 'line' }} still />],
    ['AvatarGroup line', <AvatarGroup members={members.map((m) => ({ ...m, face: 'line' as const }))} />],
    ['AgentPortrait preset', <AgentPortrait agent={{ id: 'p', preset: 'bao' }} still />],
    ['ActivityBadge', <ActivityBadge agent={agent} tool="search" />],
    ['GroupActivityBadge', <GroupActivityBadge members={members} tool="run" />],
    ['ActivityLine', <ActivityLine text="Thinking" />],
    ['CelebrationLayer', <CelebrationLayer />],
    ['StagedMark', <StagedMark shape="cloud" state="happy" />],
    [
      'CharacterStageProvider',
      <CharacterStageProvider>
        <StagedMark shape="egg" state="idle" />
      </CharacterStageProvider>,
    ],
    [
      'LocaleProvider zh-CN',
      <LocaleProvider locale="zh-CN">
        <ActivityBadge agent={agent} tool="write_file" />
      </LocaleProvider>,
    ],
    [
      'AgentStateProvider',
      <AgentStateProvider>
        <CharacterMark shape="blob" />
      </AgentStateProvider>,
    ],
    ['SpriteMark fallback', <SpriteMark src="/sprites/missing.json" state="idle" />],
    ['SpriteMark ready', <SpriteMark manifest={SPRITE} baseUrl="/s/" state="idle" />],
  ])('%s renders without a DOM', (_name, element) => {
    const html = renderToString(element);
    expect(html).toBeTruthy();
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
  });

  it('localises through the provider rather than a prop', () => {
    const english = renderToString(<ActivityBadge agent={agent} tool="search" />);
    const chinese = renderToString(
      <LocaleProvider locale="zh-CN">
        <ActivityBadge agent={agent} tool="search" />
      </LocaleProvider>,
    );
    expect(english).toContain('Searching');
    expect(chinese).toContain('搜索中');
  });

  it('gives identical agents identical appearances without stored state', () => {
    const first = renderToString(<AgentPortrait agent={{ id: 'stable-key' }} still />);
    const second = renderToString(<AgentPortrait agent={{ id: 'stable-key' }} still />);
    expect(first).toBe(second);
  });

  describe('line face', () => {
    it('marks the root with the face style and draws stroked features', () => {
      const html = renderToString(<StagedMark shape="blob" face="line" nose="slant" state="happy" />);
      expect(html).toContain('data-face="line"');
      expect(renderToString(<StagedMark shape="blob" state="happy" />)).toContain('data-face="cute"');

      // The still avatar inlines the static render as a data URL. A nose and
      // a mouth are stroked, not filled; the default face has no stroked paths.
      const stroked = (el: React.ReactElement) =>
        decodeURIComponent(renderToString(el).replace(/&quot;/g, '"')).match(/fill="none" stroke=/g)
          ?.length ?? 0;
      expect(stroked(<AgentPortrait agent={{ id: 'l', face: 'line' }} still />)).toBe(2);
      expect(stroked(<AgentPortrait agent={{ id: 'l', face: 'line', nose: null }} still />)).toBe(1);
      expect(stroked(<AgentPortrait agent={{ id: 'l' }} still />)).toBe(0);
    });

    it('the default face is the cute one, whatever the line-face props say', () => {
      const plain = renderToString(<StagedMark shape="blob" state="happy" />);
      const explicit = renderToString(<StagedMark shape="blob" state="happy" face="cute" nose="hook" />);
      expect(explicit).toBe(plain);
    });

    it('keeps the eyes face available, and offers all three in the picker', () => {
      expect(renderToString(<StagedMark shape="blob" state="happy" face="eyes" />)).toContain(
        'data-face="eyes"',
      );
      const picker = renderToString(<CharacterSelector shape="blob" color="blue" face="cute" />);
      for (const label of ['Cute', 'Eyes', 'Line']) expect(picker).toContain(label);
    });

    it('picks a stable nose per agent and lets a preset choose the face', () => {
      const a = renderToString(<AgentPortrait agent={{ id: 'nose-key', face: 'line' }} still />);
      const b = renderToString(<AgentPortrait agent={{ id: 'nose-key', face: 'line' }} still />);
      const c = renderToString(<AgentPortrait agent={{ id: 'other-key', face: 'line' }} still />);
      expect(a).toBe(b);
      expect(a).not.toBe(c);

      const picker = renderToString(<CharacterSelector shape="blob" color="blue" face="line" />);
      expect(picker).toContain('Nose');
      expect(renderToString(<CharacterSelector shape="blob" color="blue" />)).not.toContain('Nose');
    });

    it('localises the face controls', () => {
      const zh = renderToString(
        <LocaleProvider locale="zh-CN">
          <CharacterSelector shape="blob" color="blue" face="line" />
        </LocaleProvider>,
      );
      expect(zh).toContain('鼻子');
      expect(zh).toContain('线描脸');
    });
  });

  it('SpriteMark emits the first frame on the server', () => {
    const html = renderToString(<SpriteMark manifest={SPRITE} baseUrl="/s/" state="idle" />);
    expect(html).toContain('data-sprite-status="ready"');
    expect(html).toContain('/s/idle.png');
  });

  /*
   * Imported by path rather than through the barrel: these are new surfaces,
   * and the export list is assembled separately from the components.
   */
  describe('stage commands and chrome', () => {
    it.each([
      ['WorkingBadge', <WorkingBadge />],
      ['WorkingBadge sized', <WorkingBadge sizePx={12} label="Busy" />],
      ['AvatarStatusDot working', <AvatarStatusDot tone="working" label="Working" />],
      ['AvatarStatusDot attention', <AvatarStatusDot tone="attention" ring />],
      ['AvatarStatusDot info', <AvatarStatusDot tone="info" />],
      ['AgentPortrait fill', <AgentPortrait agent={agent} sizePx={64} fillPx={40} still />],
      ['AgentPortrait morphing', <AgentPortrait agent={agent} state="happy" isMorphingShape />],
      ['ActivityBadge hover label', <ActivityBadge agent={agent} tool="search" showLabel="hover" />],
      ['ActivityBadge no label', <ActivityBadge agent={agent} tool="search" showLabel="never" />],
      ['ActivityBadge bubble', <ActivityBadge agent={agent} tool="search" bubble />],
      ['ActivityBadge facts', <ActivityBadge agent={agent} activityMode="facts" facts={{ running: true }} />],
      ['ActivityBadge pokeable', <ActivityBadge agent={agent} tool="search" onPoke={() => {}} />],
      ['GroupActivityBadge hover', <GroupActivityBadge members={members} tool="run" showLabel="hover" />],
    ])('%s renders without a DOM', (_name, element) => {
      const html = renderToString(element);
      expect(html).toBeTruthy();
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('NaN');
    });

    /*
     * The registry is a mutable singleton in disguise, so it has to answer a
     * read on a server where nothing has ever written to it. A hook that threw
     * here would take the whole statically generated page with it.
     */
    it('reads a snapshot for an agent nothing has touched', () => {
      const registry = createMarkCommandRegistry();
      expect(registry.read('nobody').state).toBe('idle');
      registry.dispose();
    });

    it('lays out a stack without measuring anything', () => {
      expect(layoutAvatarGroup(3, 32).width).toBeGreaterThan(32);
      expect(participantsFromMembers(members, 2).hidden).toBe(2);
    });
  });
});

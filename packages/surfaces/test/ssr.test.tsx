import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  AvatarSlot,
  BootLoop,
  CastMember,
  CastStage,
  Composer,
  DemoDesktop,
  DeviceBezel,
  HandOff,
  JobBubbles,
  LandingWait,
  LoadingMark,
  OccupancyList,
  OccupancyMark,
  RestrictedScene,
  ShareCard,
  SuggestionCards,
  TemplateDialog,
  VisibilityControls,
} from '../src/index.js';
import { normalizeTemplateDraft } from '../src/static.js';

/*
 * The documentation site is statically generated, so a surface that touches
 * `window` or `document` during render fails the build rather than a browser.
 */

const agent = { id: 'nova', name: 'Nova' };

describe('server rendering', () => {
  it.each([
    ['DemoDesktop', <DemoDesktop />],
    ['JobBubbles', <JobBubbles />],
    ['SuggestionCards', <SuggestionCards onPick={() => {}} />],
    ['LandingWait', <LandingWait />],
    ['HandOff', <HandOff from={agent} to={{ id: 'sol', name: 'Sol' }} />],
    ['Composer', <Composer />],
    ['RestrictedScene', <RestrictedScene />],
    ['DeviceBezel', <DeviceBezel>screen</DeviceBezel>],
    ['BootLoop', <BootLoop />],
    ['LoadingMark', <LoadingMark />],
    ['TemplateDialog', <TemplateDialog onSave={async () => {}} onCancel={() => {}} />],
    ['VisibilityControls', <VisibilityControls value="private" onSelect={() => {}} />],
    ['ShareCard', <ShareCard name="Triage" url="https://example.com/t/1" />],
    ['OccupancyList', <OccupancyList rows={[{ id: 'r', label: 'Room', agents: [agent] }]} />],
    ['OccupancyMark', <OccupancyMark agent={agent} />],
    ['CastStage', <CastStage members={[{ id: 'a', shape: 'blob', color: 'blue' }]} steps={[]} />],
    [
      'CastMember',
      <CastMember
        member={{ id: 'a', shape: 'blob', color: 'blue' }}
        position={null}
        easing="ease"
        durationMs={0}
      />,
    ],
    ['AvatarSlot', <AvatarSlot>x</AvatarSlot>],
  ])('%s renders without a DOM', (_name, element) => {
    const html = renderToString(element);
    expect(html).toBeTruthy();
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
  });

  it('validates a draft from the server-safe entry', () => {
    expect(normalizeTemplateDraft({ name: 'Triage' }).valid).toBe(true);
  });
});

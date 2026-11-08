import { useLabel, type CharacterState } from '@aora-bot/react';
import { memo, useEffect, useState } from 'react';
import { useI18n } from '../shared/i18n.js';
import type { StateGroup } from '../shared/state-groups.js';
import type { Preset } from '../shared/share.js';
import { Radio, RadioGroup, ScrollRootProvider } from '../shared/Radio.js';
import { lookOf, Preview } from './Rails.js';

/**
 * Under the character: the states, one engine group at a time.
 *
 * Forty-odd states are too many for one row, so the groups are tabs and the
 * row below shows only the chosen group's states, scrolling sideways when a
 * group is longer than the dock. The row has a fixed height, so a group with
 * three states and a group with nineteen occupy the same box.
 */
export const StateDock = memo(function StateDock({
  groups,
  preset,
  onPick,
}: {
  groups: StateGroup[];
  preset: Preset;
  onPick: (state: CharacterState) => void;
}) {
  const t = useI18n();
  const label = useLabel();
  const [groupId, setGroupId] = useState(() => groupOf(groups, preset.state));
  const [track, setTrack] = useState<HTMLDivElement | null>(null);

  // A state chosen elsewhere (the random button, a share link) brings its group along.
  const [seen, setSeen] = useState(preset.state);
  if (seen !== preset.state) {
    setSeen(preset.state);
    if (!groups.find((g) => g.id === groupId)?.states.includes(preset.state)) {
      setGroupId(groupOf(groups, preset.state));
    }
  }

  const group = groups.find((g) => g.id === groupId) ?? groups[0];

  useEffect(() => {
    const current = track?.querySelector<HTMLElement>(`[data-value="${CSS.escape(preset.state)}"]`);
    if (!track || !current) return;
    track.scrollTo({ left: current.offsetLeft - track.clientWidth / 2 + current.offsetWidth / 2 });
  }, [track, preset.state]);

  if (!group) return null;

  return (
    <div className="site-home__dock">
      <div className="site-home__tabs" role="tablist" aria-label={t('home.rail.state')}>
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={g.id === group.id}
            className="site-home__tab"
            onClick={() => setGroupId(g.id)}
          >
            {label.stateGroup(g.id, g.label)}
            <small>{g.states.length}</small>
          </button>
        ))}
      </div>
      <ScrollRootProvider value={track}>
        <RadioGroup key={group.id} ref={setTrack} label={t('home.rail.state')} className="site-home__states">
          {group.states.map((state) => {
            const name = label.state(state) || state;
            return (
              <Radio
                key={state}
                value={state}
                className="site-home__opt site-home__opt--state"
                checked={state === preset.state}
                label={name}
                onSelect={() => onPick(state)}
              >
                <Preview
                  sizePx={36}
                  margin="0px 120px"
                  shape={preset.shape}
                  color={preset.color}
                  state={state}
                  {...lookOf(preset)}
                />
              </Radio>
            );
          })}
        </RadioGroup>
      </ScrollRootProvider>
    </div>
  );
});

const groupOf = (groups: StateGroup[], state: CharacterState) =>
  (groups.find((g) => g.states.includes(state)) ?? groups[0])?.id ?? '';

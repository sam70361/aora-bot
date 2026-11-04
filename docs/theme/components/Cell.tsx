import type { ReactNode } from 'react';

/**
 * One swatch in a grid: the character, its identifier, and the display name
 * under it.
 *
 * The identifier is always shown because it is what you type into a prop. The
 * name is shown alongside it rather than instead of it, the way a component
 * library lists "Avatar 头像" — a reader scanning for a shape needs the word,
 * a reader writing code needs the id.
 *
 * The name is passed in rather than looked up here: the grids draw from
 * different id families (shapes, mouths, noses, states, groups) and each one
 * knows which accessor answers for its own.
 */
export function Cell({
  id,
  name,
  active,
  children,
}: {
  id: string;
  name?: string | null;
  /** Marks the identifier as the one currently chosen, where a grid has a choice. */
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <span className="site-demo__label" data-active={active ? 'true' : undefined}>
        {id}
      </span>
      {name && <span className="site-demo__name">{name}</span>}
    </>
  );
}

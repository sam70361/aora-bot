import { CHRISTMAS } from './christmas.js';
import { EASTER } from './easter.js';
import { HALLOWEEN } from './halloween.js';
import { MID_AUTUMN } from './mid-autumn.js';
import { NEUTRAL } from './neutral.js';
import { SPRING_FESTIVAL } from './spring-festival.js';
import { SUMMER } from './summer.js';
import type { ThemeLook } from './types.js';
import { VALENTINE } from './valentine.js';

export { foilOf, lookStyle, type Markup, type ThemeLook, type TitleLayout } from './types.js';

/**
 * Looks by engine theme id. A look on its own shows nothing: the pages list
 * the engine's manifest, so a look waits here until its theme ships, and a
 * theme that ships first wears `NEUTRAL`.
 */
const LOOKS: Readonly<Record<string, ThemeLook>> = {
  halloween: HALLOWEEN,
  christmas: CHRISTMAS,
  'spring-festival': SPRING_FESTIVAL,
  'mid-autumn': MID_AUTUMN,
  easter: EASTER,
  summer: SUMMER,
  valentine: VALENTINE,
};

export const lookFor = (theme: string): ThemeLook => LOOKS[theme] ?? NEUTRAL;

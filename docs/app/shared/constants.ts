/*
 * Stage caps the pages share.
 *
 * `MarkStageProvider`'s `maxSources` is a budget: how many *distinct*
 * appearances may run a real engine before the rest fall back to stills. The
 * right number is a property of the layout, not of the component, so the caps
 * live here with the reasoning attached rather than as bare numbers scattered
 * through the pages. Anything that can be counted from an engine table
 * (`CHARACTER_STATES.length`, `CAST.length`, `SHAPE_IDS.length`) is counted
 * there instead of being named here.
 */

/** A documentation table: forty-odd rows resolve onto far fewer appearances. */
export const TABLE_SOURCES = 48;

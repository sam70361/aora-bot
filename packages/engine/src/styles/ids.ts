/** The style series that ship with the engine, in display order. */
export const STYLE_IDS = ['vector', 'pixel', 'kaomoji'] as const;

/** Style series that ship with the engine. */
export type BuiltinStyleId = (typeof STYLE_IDS)[number];

/** The series a character is drawn in when nothing names one. */
export const DEFAULT_STYLE_ID: BuiltinStyleId = 'vector';

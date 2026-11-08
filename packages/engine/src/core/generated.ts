/**
 * The command that rewrites the engine's generated modules: the drawn faces'
 * extents and fits, the roster's face boxes, and every theme's baked art and
 * face data. Tests that check a generated module against what it is worked
 * out from name it when they fail.
 */
export const GENERATE_COMMAND = 'pnpm --filter @aora-bot/engine generate:faces';

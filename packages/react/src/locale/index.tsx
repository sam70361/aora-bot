import type {
  BeltKind,
  CharacterState,
  ColorId,
  EyeTopologyId,
  FaceStyle,
  HudKind,
  MouthId,
  NoseId,
  ShapeFamilyId,
  ShapeId,
} from '@aora-bot/engine';
import { themeLabel } from '@aora-bot/engine/labels';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { enUS } from './en-US.js';
import { zhCN } from './zh-CN.js';

export type LocaleKey = keyof typeof enUS;
export type Locale = Record<LocaleKey, string>;

export const LOCALES = { 'en-US': enUS, 'zh-CN': zhCN } satisfies Record<string, Locale>;
export type LocaleId = keyof typeof LOCALES;

interface LocaleContextValue {
  id: LocaleId;
  t: (key: LocaleKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export interface LocaleProviderProps {
  /** Language for every component below this point. */
  locale?: LocaleId;
  /** Override individual strings without replacing the whole table. */
  overrides?: Partial<Locale>;
  children: ReactNode;
}

/**
 * Language for the component layer.
 *
 * One provider rather than a per-component `lang` prop. A prop has to be
 * threaded through every level by hand, and nothing would stop two components
 * in the same dialog from disagreeing.
 */
export function LocaleProvider({ locale = 'en-US', overrides, children }: LocaleProviderProps) {
  const value = useMemo<LocaleContextValue>(() => {
    const table = { ...(LOCALES[locale] ?? enUS), ...overrides };
    return { id: locale, t: (key) => table[key] ?? enUS[key] ?? key };
  }, [locale, overrides]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Translate a key. Falls back to English outside a provider. */
export function useLocale(): LocaleContextValue {
  return (
    useContext(LocaleContext) ?? {
      id: 'en-US',
      t: (key: LocaleKey) => enUS[key] ?? key,
    }
  );
}

/** Display names for the engine's identifiers, one lookup per family. */
export interface Labels {
  shape(id: ShapeId): string;
  shapeFamily(id: ShapeFamilyId): string;
  color(id: ColorId): string;
  state(id: CharacterState): string;
  /** One-line description of a state, for a caption or a tooltip. */
  stateDesc(id: CharacterState): string;
  belt(id: BeltKind): string;
  hud(kind: HudKind): string;
  mouth(id: MouthId): string;
  expression(id: EyeTopologyId): string;
  face(id: FaceStyle): string;
  nose(id: NoseId): string;
  /**
   * Series, variant and state-group ids are registries a host can extend, so these take any
   * id and return the fallback (the id itself, if none is given) when nothing translates it.
   */
  style(id: string, fallback?: string): string;
  variant(id: string, fallback?: string): string;
  stateGroup(id: string, fallback?: string): string;
  /** A series parameter, by series and key; the fallback is usually the parameter's own `label`. */
  param(style: string, key: string, fallback?: string): string;
}

/**
 * The id-driven half of the locale, as functions.
 *
 * `t('shape.hex')` needs the key to be a literal to typecheck, which a
 * component iterating `SHAPE_IDS` cannot provide. These wrappers take the id
 * instead and build the key, so a gallery stays type-safe without casting
 * every label lookup.
 */
export function useLabel(): Labels {
  const { id: localeId, t } = useLocale();
  return useMemo<Labels>(() => {
    // The one cast: an open id has no literal key to check.
    const open = (prefix: string, id: string, fallback: string = id): string => {
      const key = `${prefix}.${id}`;
      const text = t(key as LocaleKey);
      return text === key ? fallback : text;
    };
    // A theme names its own characters, skins and colours; before it is installed the id stands in.
    const themed = (kind: 'shape' | 'variant' | 'color', id: string): string | undefined =>
      themeLabel(kind, id)?.[localeId === 'zh-CN' ? 'zh' : 'en'];
    return {
      shape: (id) => open('shape', id, themed('shape', id)),
      shapeFamily: (id) => t(`shapeFamily.${id}`),
      color: (id) => open('color', id, themed('color', id)),
      state: (id) => t(`state.${id}`),
      stateDesc: (id) => t(`stateDesc.${id}`),
      belt: (id) => t(`belt.${id}`),
      hud: (kind) => t(`hud.${kind}`),
      mouth: (id) => t(`mouth.${id}`),
      expression: (id) => t(`expression.${id}`),
      face: (id) => t(`face.${id}`),
      nose: (id) => t(`nose.${id}`),
      style: (id, fallback) => open('style', id, fallback),
      variant: (id, fallback) => open('variant', id, themed('variant', id) ?? fallback),
      stateGroup: (id, fallback) => open('state.group', id, fallback),
      param: (style, key, fallback = key) => open('param', `${style}.${key}`, fallback),
    };
  }, [localeId, t]);
}

export { enUS, zhCN };

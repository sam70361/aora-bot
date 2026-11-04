/*
 * Shape of `theme/generated/api.json`.
 *
 * Shared by the generator that writes the file and the component that renders
 * it, so renaming a field in one fails to compile in the other.
 */

export interface PropEntry {
  name: string;
  /** Rendered type text, whitespace collapsed to fit a table cell. */
  type: string;
  required: boolean;
  /** Literal source text of the default, from a destructuring pattern or `@default`. */
  default: string | null;
  description: string;
  /** Message from `@deprecated`, when the prop carries one. */
  deprecated: string | null;
}

export interface ComponentEntry {
  name: string;
  description: string;
  props: PropEntry[];
}

export type ApiSource = 'engine' | 'react' | 'surfaces';

export type ValueKind = 'component' | 'hook' | 'function' | 'constant';

export interface ValueEntry {
  name: string;
  kind: ValueKind;
  type: string;
  description: string;
  source: ApiSource;
}

export interface ApiData {
  /** Keyed by component name, with the `Props` suffix removed. */
  components: Record<string, ComponentEntry>;
  /** Every other export, keyed by export name. */
  values: Record<string, ValueEntry>;
}

import { Layout as BasicLayout } from '@rspress/core/theme-original';
import { useLang } from '@rspress/core/runtime';
import { LocaleProvider } from '@aora-bot/react';
import { lazy } from 'react';
import { CapsuleNav } from './components/CapsuleNav.js';
import type * as DemoModule from './components/demos.js';
import { LangSwitch } from './components/LangSwitch.js';
import { SiteFooter } from './components/SiteFooter.js';
import { WaveBackdrop } from './components/WaveBackdrop.js';
// The kit's tokens and components first, then the site's layers on top of them.
// `site-tokens.css` also declares the layer order, so it is imported before
// anything else that opens a layer of its own.
import './styles/site-tokens.css';
import '@aora-bot/react/styles.css';
import '@aora-bot/surfaces/styles.css';
import './styles/rspress-overrides.css';
import './styles/shell.css';
import './styles/controls.css';
import './styles/doc-components.css';
import './styles/pages/home.css';
import './styles/pages/sponsor.css';
import './styles/pages/themes.css';

/**
 * Default Rspress layout, with a floating capsule bar, an ambient backdrop, a
 * language switch in the bar, and the component-layer locale following the
 * current docs language.
 *
 * The backdrop goes in `top` rather than `beforeDoc`: the doc slot exists only
 * on documentation pages, so the home page, the sponsor page and the 404 page
 * would draw on a flat background while every article had the ambient light.
 *
 * The copyright line goes in `afterDocFooter`, so it sits in the doc column
 * and not under the fixed sidebar. The home, sponsor and 404 pages fill the
 * screen, and a line below them would only add a scroll; the copyright page
 * in the docs covers them.
 *
 * The hero slots are empty. The home page and the sponsor page are
 * `pageType: custom` pages — a live console rather than a headline and a row
 * of cards — so there is no hero to decorate.
 */
const Layout = () => {
  const lang = useLang();

  return (
    <LocaleProvider locale={lang === 'zh' ? 'zh-CN' : 'en-US'}>
      <BasicLayout
        top={<WaveBackdrop />}
        beforeNav={<CapsuleNav />}
        afterNavMenu={<LangSwitch />}
        afterDocFooter={<SiteFooter />}
      />
    </LocaleProvider>
  );
};

export { Layout };
export * from '@rspress/core/theme-original';
export { IconMoon, IconSun } from './components/AppearanceIcons.js';

/*
 * The components the documentation embeds load with the first page that uses
 * one, not with every page: the API tables alone carry the whole generated API
 * description, and the home page needs none of them. No Suspense boundary of
 * their own: the server render waits for them, hydration keeps the server's
 * markup until they arrive, and a link click is a transition that holds the
 * old page until the new one can draw, so nothing shifts.
 */
type Demos = typeof DemoModule;
const demos = () => import('./components/demos.js');
const demo = <K extends keyof Demos>(name: K) => lazy(() => demos().then((m) => ({ default: m[name] })));
const apiTables = () => import('./components/ApiTable.js');

export const API = lazy(() => apiTables().then((m) => ({ default: m.API })));
export const ApiIndex = lazy(() => apiTables().then((m) => ({ default: m.ApiIndex })));
export const TokenTable = demo('TokenTable');
export const ComponentOverview = demo('ComponentOverview');
export const ComponentGraph = demo('ComponentGraph');
export const ShapeGrid = demo('ShapeGrid');
export const StateGrid = demo('StateGrid');
export const FxGrid = demo('FxGrid');
export const ExpressionGrid = demo('ExpressionGrid');
export const EyeTopologyGrid = demo('EyeTopologyGrid');
export const PaletteGrid = demo('PaletteGrid');
export const ProtocolTable = demo('ProtocolTable');
export const CastGrid = demo('CastGrid');
export const ScenarioGrid = demo('ScenarioGrid');
export const FaceStyleDemo = demo('FaceStyleDemo');
export const FaceStyleRow = demo('FaceStyleRow');
export const DrawnFaceGrid = demo('DrawnFaceGrid');
export const DrawnFaceSeries = demo('DrawnFaceSeries');
export const DrawnFacePalette = demo('DrawnFacePalette');
export const CuteMouthGrid = demo('CuteMouthGrid');
export const MouthGrid = demo('MouthGrid');
export const MouthTable = demo('MouthTable');
export const NoseGrid = demo('NoseGrid');
export const LineExpressionGrid = demo('LineExpressionGrid');
export const LineStateGrid = demo('LineStateGrid');
export const LineShapeRow = demo('LineShapeRow');
export const StateMatrix = demo('StateMatrix');
export const StyleParamsDemo = demo('StyleParamsDemo');

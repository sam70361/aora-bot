import { Layout as BasicLayout } from '@rspress/core/theme-original';
import { useLang } from '@rspress/core/runtime';
import { LocaleProvider } from '@aora-bot/react';
import { CapsuleNav } from './components/CapsuleNav.js';
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

export { API, ApiIndex } from './components/ApiTable.js';
export { TokenTable } from './components/TokenTable.js';
export { ComponentOverview } from './components/ComponentOverview.js';
export { ComponentGraph } from './components/ComponentGraph.js';
export {
  ShapeGrid,
  StateGrid,
  FxGrid,
  ExpressionGrid,
  EyeTopologyGrid,
  PaletteGrid,
} from './components/Grids.js';
export { ProtocolTable } from './components/ProtocolTable.js';
export { CastGrid } from './components/CastGrid.js';
export { ScenarioGrid } from './components/ScenarioGrid.js';
export {
  FaceStyleDemo,
  FaceStyleRow,
  CuteMouthGrid,
  MouthGrid,
  MouthTable,
  NoseGrid,
  LineExpressionGrid,
  LineStateGrid,
  LineShapeRow,
} from './components/FaceDemos.js';
export { StateMatrix } from './components/StateMatrix.js';
export { StyleParamsDemo } from './components/StyleParamsDemo.js';

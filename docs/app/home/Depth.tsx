/** Id of the filter `home.css` puts on the bodies of the home page's characters. */
export const DEPTH_FILTER_ID = 'site-depth';

/**
 * A soft light on a body, for display: the lower right rolls away into shade
 * and the upper left catches a thin rim of light. In bounding-box units, so a
 * 24 px thumbnail and the stage are lit alike. The site's own look, not the
 * engine's: the faces, the effects and every drawing the docs document stay flat.
 */
export function DepthFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <filter
        id={DEPTH_FILTER_ID}
        primitiveUnits="objectBoundingBox"
        x="-5%"
        y="-5%"
        width="110%"
        height="110%"
        colorInterpolationFilters="sRGB"
      >
        <feComponentTransfer in="SourceAlpha" result="out">
          <feFuncA type="table" tableValues="1 0" />
        </feComponentTransfer>
        <feGaussianBlur in="out" stdDeviation="0.11" result="outBlur" />
        <feOffset in="outBlur" dx="-0.06" dy="-0.08" result="shadeShift" />
        <feComposite in="shadeShift" in2="SourceAlpha" operator="in" result="shadeMask" />
        <feFlood floodColor="#000" floodOpacity="0.32" />
        <feComposite in2="shadeMask" operator="in" result="shade" />
        <feGaussianBlur in="out" stdDeviation="0.035" result="rimBlur" />
        <feOffset in="rimBlur" dx="0.025" dy="0.03" result="rimShift" />
        <feComposite in="rimShift" in2="SourceAlpha" operator="in" result="rimMask" />
        <feFlood floodColor="#fff" floodOpacity="0.22" />
        <feComposite in2="rimMask" operator="in" result="rim" />
        <feMerge>
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="shade" />
          <feMergeNode in="rim" />
        </feMerge>
      </filter>
    </svg>
  );
}

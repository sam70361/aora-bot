import { loadTheme, renderStaticSvg } from '@aora-bot/engine/static';
import type { StillReply, StillRequest } from './images.js';

const scope = self as unknown as {
  addEventListener: (type: 'message', listener: (event: MessageEvent<StillRequest>) => void) => void;
  postMessage: (reply: StillReply, transfer: Transferable[]) => void;
};

// The options a still is inlined with (`stillOf`), so an image is the still it replaces.
scope.addEventListener('message', ({ data }) => {
  loadTheme(data.theme)
    .then(() =>
      renderStaticSvg({
        ...data.mark,
        state: data.state,
        sizePx: data.sizePx,
        eyeColor: 'var(--aora-bg-base)',
        colorScheme: 'page',
      }),
    )
    .then(
      (svg) => scope.postMessage({ id: data.id, svg }, []),
      (error: unknown) => scope.postMessage({ id: data.id, error: String(error) }, []),
    );
});

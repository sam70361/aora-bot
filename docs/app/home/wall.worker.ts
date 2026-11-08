import { TileShop, type ShopReply, type ShopRequest } from './wall-art.js';

const scope = self as unknown as {
  addEventListener: (type: 'message', listener: (event: MessageEvent<ShopRequest>) => void) => void;
  postMessage: (reply: ShopReply, transfer: Transferable[]) => void;
};

const shop = new TileShop();

scope.addEventListener('message', ({ data }) => {
  const reply = async (): Promise<ShopReply> =>
    data.type === 'draw'
      ? { id: data.id, type: 'names', names: await shop.draw(data.tiles) }
      : { id: data.id, type: 'urls', urls: shop.encode(data.keys, data.values) };
  reply().then(
    (message) => scope.postMessage(message, []),
    (error: unknown) => scope.postMessage({ id: data.id, type: 'error', message: String(error) }, []),
  );
});

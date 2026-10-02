import { price } from './promotions';

export function checkout(subtotal, codes) {
  return price(subtotal, codes);
}

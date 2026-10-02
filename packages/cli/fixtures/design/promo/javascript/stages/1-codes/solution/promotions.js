const DISCOUNTS = { SAVE10: (t) => Math.floor(t * 0.9) };

export function price(subtotal, codes) {
  return codes.reduce((t, c) => (DISCOUNTS[c] ? DISCOUNTS[c](t) : t), subtotal);
}

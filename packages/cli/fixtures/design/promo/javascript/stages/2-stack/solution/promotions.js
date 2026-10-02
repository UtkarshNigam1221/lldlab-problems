// Applied in this order, whatever order the codes arrive in.
const DISCOUNTS = [
  ['FLAT100', (t) => Math.max(0, t - 100)],
  ['SAVE10', (t) => Math.floor(t * 0.9)],
];

export function price(subtotal, codes) {
  const wanted = new Set(codes.slice(0, 2));
  return DISCOUNTS.reduce((t, [code, apply]) => (wanted.has(code) ? apply(t) : t), subtotal);
}

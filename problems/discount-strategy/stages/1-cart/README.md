# Discount Strategy

A shopping cart must support interchangeable discount rules without changing the cart itself.

Implement:

- `NoDiscount` — total unchanged.
- `PercentOff(percent)` — reduce by `percent`% (integer maths, round down).
- `FlatOff(amount)` — subtract `amount`, never below 0.
- `Cart(strategy)` with `add(price)`, `setStrategy(strategy)` (`set_strategy` in Python, `SetStrategy` in Go) and `total()`.

All prices are integers (cents).

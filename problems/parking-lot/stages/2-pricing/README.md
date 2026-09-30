# Pluggable pricing

The lot now charges on exit, and the operator wants to change pricing without touching the lot.

- `HourlyPricing(centsPerHour)`: partial hours round up.
- `FlatPricing(cents)`: the same fee for any stay.
- `Checkout(lot, pricing)` with `exit(ticket, hours)` that unparks and returns the fee, and `setPricing(pricing)` to switch strategies.
- An unknown ticket throws the lot's `unknown ticket` error and charges nothing.

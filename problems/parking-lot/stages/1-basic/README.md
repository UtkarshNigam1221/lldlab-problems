# Park and unpark

Build a lot with a fixed number of `compact` and `large` spots.

- `park(vehicle)` returns a ticket id: `T1`, `T2`, … in order.
- A compact vehicle takes a compact spot, or a large spot when no compact spot is free.
- A large vehicle needs a large spot. When nothing fits, throw `Error('lot full')`.
- `unpark(ticket)` frees the spot and returns the vehicle. Unknown or already used tickets throw `Error('unknown ticket')`.
- `free(size)` returns the number of free spots of that size.

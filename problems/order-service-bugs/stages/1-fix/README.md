# Fix the reported bugs

The order service works for the happy path, but support has three tickets:

1. "Opening a link to an order that doesn't exist shows a blank page instead of *not found*."
2. "A customer cancelled the same order twice and we refunded them twice."
3. "The revenue report still counts orders that were cancelled."

`Router.handle(method, path, body)` returns `(status, body)` like a web framework would. Fix the code so the tests pass without changing `orders/models.py`.

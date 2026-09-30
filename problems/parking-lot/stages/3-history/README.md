# Ticket history

Support asks "which tickets did this car get?". Add `history(plate)` to `ParkingLot`:

- returns the plate's ticket ids in the order they were issued, including stays that have ended;
- returns `[]` for a plate the lot has never seen;
- returns a copy: changing the returned array must not change the lot's history.

This stage has no new files: change `src/lot.ts`.

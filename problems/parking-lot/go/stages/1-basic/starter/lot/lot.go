package lot

import (
	"errors"

	"app/vehicle"
)

var (
	ErrFull          = errors.New("lot full")
	ErrUnknownTicket = errors.New("unknown ticket")
)

// Lot has a fixed number of compact and large spots. Compact vehicles may use a large
// spot when no compact spot is free; large vehicles need a large spot.
type Lot struct {
	// TODO
}

func New(compact, large int) *Lot {
	return &Lot{}
}

// Park returns a ticket id ("T1", "T2", ...) or ErrFull.
func (l *Lot) Park(v vehicle.Vehicle) (string, error) {
	return "", errors.New("not implemented")
}

// Unpark frees the spot and returns the vehicle, or ErrUnknownTicket.
func (l *Lot) Unpark(ticket string) (vehicle.Vehicle, error) {
	return vehicle.Vehicle{}, errors.New("not implemented")
}

// Free is the number of free spots of the given size.
func (l *Lot) Free(size vehicle.Size) int {
	return -1
}

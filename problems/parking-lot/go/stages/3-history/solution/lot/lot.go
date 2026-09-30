package lot

import (
	"errors"
	"fmt"

	"app/vehicle"
)

var (
	ErrFull          = errors.New("lot full")
	ErrUnknownTicket = errors.New("unknown ticket")
)

type stay struct {
	v    vehicle.Vehicle
	spot vehicle.Size
}

type Lot struct {
	free    map[vehicle.Size]int
	parked  map[string]stay
	history map[string][]string
	next    int
}

func New(compact, large int) *Lot {
	return &Lot{free: map[vehicle.Size]int{vehicle.Compact: compact, vehicle.Large: large}, parked: map[string]stay{}, history: map[string][]string{}, next: 1}
}

func (l *Lot) Park(v vehicle.Vehicle) (string, error) {
	spot, ok := l.pick(v.Size)
	if !ok {
		return "", ErrFull
	}
	l.free[spot]--
	ticket := fmt.Sprintf("T%d", l.next)
	l.next++
	l.parked[ticket] = stay{v: v, spot: spot}
	l.history[v.Plate] = append(l.history[v.Plate], ticket)
	return ticket, nil
}

func (l *Lot) Unpark(ticket string) (vehicle.Vehicle, error) {
	s, ok := l.parked[ticket]
	if !ok {
		return vehicle.Vehicle{}, ErrUnknownTicket
	}
	delete(l.parked, ticket)
	l.free[s.spot]++
	return s.v, nil
}

func (l *Lot) Free(size vehicle.Size) int { return l.free[size] }

func (l *Lot) pick(size vehicle.Size) (vehicle.Size, bool) {
	if size == vehicle.Compact && l.free[vehicle.Compact] > 0 {
		return vehicle.Compact, true
	}
	if l.free[vehicle.Large] > 0 {
		return vehicle.Large, true
	}
	return "", false
}

package main

import (
	"app/lot"
	"app/vehicle"
)

func lldlabTests() {
	car := func(plate string) vehicle.Vehicle { return vehicle.Vehicle{Plate: plate, Size: vehicle.Compact} }

	test("parks a compact car in a compact spot", func() {
		l := lot.New(1, 1)
		t, err := l.Park(car("A1"))
		assertEqual(err, nil)
		assertEqual(t, "T1")
		assertEqual(l.Free(vehicle.Compact), 0)
		assertEqual(l.Free(vehicle.Large), 1)
	})
	test("compact car overflows into a large spot", func() {
		l := lot.New(1, 1)
		l.Park(car("A1"))
		t, err := l.Park(car("A2"))
		assertEqual(err, nil)
		assertEqual(t, "T2")
		assertEqual(l.Free(vehicle.Large), 0)
	})
	test("large vehicle never takes a compact spot", func() {
		l := lot.New(2, 0)
		_, err := l.Park(vehicle.Vehicle{Plate: "B1", Size: vehicle.Large})
		assertEqual(err, lot.ErrFull)
	})
	test("unpark frees the spot and returns the vehicle", func() {
		l := lot.New(1, 0)
		t, _ := l.Park(car("A1"))
		v, err := l.Unpark(t)
		assertEqual(err, nil)
		assertEqual(v, car("A1"))
		assertEqual(l.Free(vehicle.Compact), 1)
	})
	test("a ticket can only be used once", func() {
		l := lot.New(1, 0)
		t, _ := l.Park(car("A1"))
		l.Unpark(t)
		_, err := l.Unpark(t)
		assertEqual(err, lot.ErrUnknownTicket)
	})
}

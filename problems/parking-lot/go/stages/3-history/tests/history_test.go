package main

import (
	"app/lot"
	"app/vehicle"
)

func lldlabTests() {
	car := vehicle.Vehicle{Plate: "A1", Size: vehicle.Compact}

	test("history lists tickets in order, including finished stays", func() {
		l := lot.New(1, 0)
		t1, _ := l.Park(car)
		l.Unpark(t1)
		t2, _ := l.Park(car)
		assertEqual(l.History("A1"), []string{t1, t2})
	})
	test("unknown plate has empty history", func() {
		assertEqual(len(lot.New(1, 0).History("ZZ")), 0)
	})
	test("history is a copy", func() {
		l := lot.New(1, 0)
		l.Park(car)
		h := l.History("A1")
		h[0] = "T99"
		assertEqual(l.History("A1"), []string{"T1"})
	})
}

package main

import (
	"app/checkout"
	"app/lot"
	"app/pricing"
	"app/vehicle"
)

func lldlabTests() {
	car := vehicle.Vehicle{Plate: "A1", Size: vehicle.Compact}

	test("hourly pricing rounds partial hours up", func() {
		assertEqual(pricing.Hourly{CentsPerHour: 200}.Fee(2.25), 600)
	})
	test("flat pricing ignores duration", func() {
		assertEqual(pricing.Flat{Cents: 1500}.Fee(9), 1500)
	})
	test("exit unparks and charges", func() {
		l := lot.New(1, 0)
		c := checkout.New(l, pricing.Hourly{CentsPerHour: 300})
		t, _ := l.Park(car)
		fee, err := c.Exit(t, 1.5)
		assertEqual(err, nil)
		assertEqual(fee, 600)
		assertEqual(l.Free(vehicle.Compact), 1)
	})
	test("pricing can be swapped at runtime", func() {
		l := lot.New(2, 0)
		c := checkout.New(l, pricing.Hourly{CentsPerHour: 300})
		c.SetPricing(pricing.Flat{Cents: 1000})
		t, _ := l.Park(car)
		fee, _ := c.Exit(t, 5)
		assertEqual(fee, 1000)
	})
	test("unknown ticket charges nothing", func() {
		c := checkout.New(lot.New(1, 0), pricing.Flat{Cents: 1000})
		fee, err := c.Exit("T9", 1)
		assertEqual(fee, 0)
		assertEqual(err, lot.ErrUnknownTicket)
	})
}

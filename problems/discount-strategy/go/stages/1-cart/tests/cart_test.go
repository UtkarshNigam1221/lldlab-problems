package main

func lldlabTests() {
	test("no discount sums prices", func() {
		c := NewCart(NoDiscount{})
		c.Add(300)
		c.Add(700)
		assertEqual(c.Total(), 1000)
	})
	test("percent off rounds down", func() {
		c := NewCart(PercentOff{Percent: 15})
		c.Add(999)
		assertEqual(c.Total(), 849)
	})
	test("flat off never below zero", func() {
		c := NewCart(FlatOff{Amount: 5000})
		c.Add(1000)
		assertEqual(c.Total(), 0)
	})
	test("strategy can be swapped", func() {
		c := NewCart(NoDiscount{})
		c.Add(1000)
		c.SetStrategy(FlatOff{Amount: 100})
		assertEqual(c.Total(), 900)
	})
}

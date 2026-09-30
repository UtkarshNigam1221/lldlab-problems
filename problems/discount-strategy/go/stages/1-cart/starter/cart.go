package main

type DiscountStrategy interface {
	Apply(total int) int
}

type NoDiscount struct{}

func (NoDiscount) Apply(total int) int {
	// TODO
	return 0
}

type PercentOff struct{ Percent int }

func (p PercentOff) Apply(total int) int {
	// TODO
	return 0
}

type FlatOff struct{ Amount int }

func (f FlatOff) Apply(total int) int {
	// TODO
	return 0
}

type Cart struct {
	// TODO
}

func NewCart(s DiscountStrategy) *Cart { return &Cart{} }

func (c *Cart) Add(price int) {}

func (c *Cart) SetStrategy(s DiscountStrategy) {}

func (c *Cart) Total() int { return 0 }

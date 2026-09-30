package main

type DiscountStrategy interface {
	Apply(total int) int
}

type NoDiscount struct{}

func (NoDiscount) Apply(total int) int { return total }

type PercentOff struct{ Percent int }

func (p PercentOff) Apply(total int) int { return total * (100 - p.Percent) / 100 }

type FlatOff struct{ Amount int }

func (f FlatOff) Apply(total int) int {
	if total < f.Amount {
		return 0
	}
	return total - f.Amount
}

type Cart struct {
	strategy DiscountStrategy
	prices   []int
}

func NewCart(s DiscountStrategy) *Cart { return &Cart{strategy: s} }

func (c *Cart) Add(price int) { c.prices = append(c.prices, price) }

func (c *Cart) SetStrategy(s DiscountStrategy) { c.strategy = s }

func (c *Cart) Total() int {
	sum := 0
	for _, p := range c.prices {
		sum += p
	}
	return c.strategy.Apply(sum)
}

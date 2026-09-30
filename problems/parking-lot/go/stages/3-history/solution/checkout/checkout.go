package checkout

import (
	"app/lot"
	"app/pricing"
)

type Checkout struct {
	lot     *lot.Lot
	pricing pricing.Strategy
}

func New(l *lot.Lot, p pricing.Strategy) *Checkout { return &Checkout{lot: l, pricing: p} }

func (c *Checkout) Exit(ticket string, hours float64) (int, error) {
	if _, err := c.lot.Unpark(ticket); err != nil {
		return 0, err
	}
	return c.pricing.Fee(hours), nil
}

func (c *Checkout) SetPricing(p pricing.Strategy) { c.pricing = p }

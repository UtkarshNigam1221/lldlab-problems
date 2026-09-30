package checkout

import (
	"errors"

	"app/lot"
	"app/pricing"
)

type Checkout struct {
	lot     *lot.Lot
	pricing pricing.Strategy
}

func New(l *lot.Lot, p pricing.Strategy) *Checkout { return &Checkout{lot: l, pricing: p} }

// Exit unparks the ticket and returns the fee; unknown tickets return the lot's error and no fee.
func (c *Checkout) Exit(ticket string, hours float64) (int, error) {
	return 0, errors.New("not implemented")
}

func (c *Checkout) SetPricing(p pricing.Strategy) {}

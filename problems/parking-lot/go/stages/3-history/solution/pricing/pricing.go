package pricing

import "math"

type Strategy interface {
	Fee(hours float64) int
}

type Hourly struct{ CentsPerHour int }

func (h Hourly) Fee(hours float64) int { return int(math.Ceil(hours)) * h.CentsPerHour }

type Flat struct{ Cents int }

func (f Flat) Fee(hours float64) int { return f.Cents }

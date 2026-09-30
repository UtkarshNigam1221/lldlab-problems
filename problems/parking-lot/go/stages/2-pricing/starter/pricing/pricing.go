package pricing

// Strategy returns the fee in cents for a stay of hours (fractional hours allowed).
type Strategy interface {
	Fee(hours float64) int
}

// Hourly charges CentsPerHour for every started hour.
type Hourly struct{ CentsPerHour int }

func (h Hourly) Fee(hours float64) int { return -1 }

// Flat charges Cents for any stay.
type Flat struct{ Cents int }

func (f Flat) Fee(hours float64) int { return -1 }

package vehicle

type Size string

const (
	Compact Size = "compact"
	Large   Size = "large"
)

type Vehicle struct {
	Plate string
	Size  Size
}

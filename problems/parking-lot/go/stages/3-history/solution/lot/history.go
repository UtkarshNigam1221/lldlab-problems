package lot

func (l *Lot) History(plate string) []string {
	return append([]string{}, l.history[plate]...)
}

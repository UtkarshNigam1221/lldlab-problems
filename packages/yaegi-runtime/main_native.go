//go:build !(js && wasm)

package main

// main is unused natively; the package is built for js/wasm and tested natively.
func main() {}

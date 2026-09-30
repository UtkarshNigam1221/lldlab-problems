//go:build js && wasm

package main

import (
	"encoding/json"
	"syscall/js"
)

func main() {
	js.Global().Set("yaegiRun", js.FuncOf(func(_ js.Value, args []js.Value) any {
		var req Request
		if err := json.Unmarshal([]byte(args[0].String()), &req); err != nil {
			return map[string]any{"stdout": "", "results": "", "error": "bad request: " + err.Error()}
		}
		r := run(req)
		out := map[string]any{"stdout": r.Stdout, "results": r.Results}
		if r.Error != "" {
			out["error"] = r.Error
		}
		return out
	}))
	select {}
}

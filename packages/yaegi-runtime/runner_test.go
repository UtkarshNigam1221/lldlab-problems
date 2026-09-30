package main

import (
	"encoding/json"
	"strings"
	"testing"
)

// goHelper must equal GO_HELPER in packages/runner/src/go.ts (checked by go.test.ts).
const goHelper = `package main

import (
	"encoding/json"
	"fmt"
	"reflect"
	"time"
)

var lldlabResults []map[string]interface{}
var lldlabStage, lldlabFile string

func lldlabSetCurrent(stage, file string) {
	lldlabStage, lldlabFile = stage, file
}

func test(name string, fn func()) {
	start := time.Now()
	r := map[string]interface{}{"name": name, "stage": lldlabStage, "file": lldlabFile, "passed": true}
	func() {
		defer func() {
			if e := recover(); e != nil {
				r["passed"] = false
				r["error"] = fmt.Sprint(e)
			}
		}()
		fn()
	}()
	r["ms"] = float64(time.Since(start).Microseconds()) / 1000
	lldlabResults = append(lldlabResults, r)
}

func assertEqual(actual, expected interface{}) {
	if !reflect.DeepEqual(actual, expected) {
		panic(fmt.Sprintf("expected %#v, got %#v", expected, actual))
	}
}

func lldlabResultsJSON() string {
	if lldlabResults == nil {
		return "[]"
	}
	b, _ := json.Marshal(lldlabResults)
	return string(b)
}
`

type result struct {
	Name   string `json:"name"`
	Stage  string `json:"stage"`
	File   string `json:"file"`
	Passed bool   `json:"passed"`
	Error  string `json:"error"`
}

func mustRun(t *testing.T, workspace map[string]string, tests ...TestFile) []result {
	t.Helper()
	resp := run(Request{Helper: goHelper, Workspace: workspace, Tests: tests})
	if resp.Error != "" {
		t.Fatalf("unexpected error: %s", resp.Error)
	}
	var rs []result
	if err := json.Unmarshal([]byte(resp.Results), &rs); err != nil {
		t.Fatalf("bad results %q: %v", resp.Results, err)
	}
	return rs
}

var spotAndLot = map[string]string{
	"spot/spot.go": "package spot\n\ntype Spot struct{ ID int }\n\nfunc New(id int) Spot { return Spot{ID: id} }\n",
	"lot/lot.go":   "package lot\n\nimport \"app/spot\"\n\nfunc First() spot.Spot { return spot.New(7) }\n",
	"README.md":    "# not Go, ignored",
}

func TestWorkspacePackagesImportEachOther(t *testing.T) {
	rs := mustRun(t, spotAndLot, TestFile{Stage: "basic", File: "lot_test.go", Src: "package main\n\nimport \"app/lot\"\n\nfunc lldlabTests() {\n\ttest(\"first\", func() { assertEqual(lot.First().ID, 7) })\n}\n"})
	if len(rs) != 1 || !rs[0].Passed || rs[0].Stage != "basic" || rs[0].File != "lot_test.go" {
		t.Fatalf("got %+v", rs)
	}
}

func TestStagesRunInOrderWithTags(t *testing.T) {
	rs := mustRun(t, spotAndLot,
		TestFile{Stage: "one", File: "a_test.go", Src: "package main\n\nimport \"app/lot\"\n\nfunc lldlabTests() {\n\ttest(\"a\", func() { assertEqual(lot.First().ID, 7) })\n}\n"},
		TestFile{Stage: "two", File: "b_test.go", Src: "package main\n\nimport \"app/spot\"\n\nfunc lldlabTests() {\n\ttest(\"b\", func() { assertEqual(spot.New(1).ID, 2) })\n}\n"},
	)
	if len(rs) != 2 || rs[0].Stage != "one" || rs[1].Stage != "two" || !rs[0].Passed || rs[1].Passed {
		t.Fatalf("got %+v", rs)
	}
	if rs[1].Error != "expected 2, got 1" {
		t.Fatalf("error = %q", rs[1].Error)
	}
}

func TestRootFilesArePackageMain(t *testing.T) {
	rs := mustRun(t, map[string]string{"cart.go": "package main\n\nfunc Double(n int) int { return n * 2 }\n"},
		TestFile{Stage: "s", File: "cart_test.go", Src: "package main\n\nfunc lldlabTests() {\n\ttest(\"double\", func() { assertEqual(Double(2), 4) })\n}\n"})
	if len(rs) != 1 || !rs[0].Passed {
		t.Fatalf("got %+v", rs)
	}
}

func TestRootFileWithOtherPackageExplainsFolders(t *testing.T) {
	resp := run(Request{Helper: goHelper, Workspace: map[string]string{"cart.go": "package cart\n"}, Tests: nil})
	want := `cart.go: files at the workspace root must be package main; put package cart in a folder named cart/`
	if resp.Error != want {
		t.Fatalf("error = %q, want %q", resp.Error, want)
	}
}

func TestBlockedImport(t *testing.T) {
	resp := run(Request{Helper: goHelper, Tests: []TestFile{{Stage: "s", File: "x_test.go", Src: "package main\n\nimport \"net/http\"\n\nfunc lldlabTests() { _ = http.MethodGet }\n"}}})
	if !strings.Contains(resp.Error, `package "net/http" isn't available in this runner`) {
		t.Fatalf("error = %q", resp.Error)
	}
}

func TestMissingWorkspacePackage(t *testing.T) {
	resp := run(Request{Helper: goHelper, Tests: []TestFile{{Stage: "s", File: "x_test.go", Src: "package main\n\nimport \"app/nope\"\n\nfunc lldlabTests() { nope.X() }\n"}}})
	if !strings.Contains(resp.Error, `package "app/nope" not found: no folder "nope" in your workspace`) {
		t.Fatalf("error = %q", resp.Error)
	}
}

func TestTestFileMustDefineLldlabTests(t *testing.T) {
	resp := run(Request{Helper: goHelper, Tests: []TestFile{{Stage: "s", File: "x_test.go", Src: "package main\n\nfunc other() {}\n"}}})
	if resp.Error != "tests/x_test.go: must define func lldlabTests()" {
		t.Fatalf("error = %q", resp.Error)
	}
}

func TestPanicInsideTestFailsOnlyThatTest(t *testing.T) {
	rs := mustRun(t, nil, TestFile{Stage: "s", File: "p_test.go", Src: "package main\n\nfunc lldlabTests() {\n\ttest(\"boom\", func() { var m map[string]int; m[\"x\"] = 1 })\n\ttest(\"ok\", func() {})\n}\n"})
	if len(rs) != 2 || rs[0].Passed || !rs[1].Passed {
		t.Fatalf("got %+v", rs)
	}
}

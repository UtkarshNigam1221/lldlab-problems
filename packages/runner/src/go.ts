import { workspacePathError } from './paths';
import type { RunInput, RunOutput } from './types';

export type YaegiRun = (requestJson: string) => { stdout: string; results?: string; error?: string };

export const GO_HELPER = `package main

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
`;

export async function executeGo(run: YaegiRun, input: RunInput): Promise<RunOutput> {
  const pathErr = workspacePathError(input.files);
  if (pathErr) return { results: [], stdout: '', error: pathErr };
  const tests = input.tests.flatMap((s) => Object.entries(s.files).map(([file, src]) => ({ stage: s.stage, file, src })));
  const out = run(JSON.stringify({ helper: GO_HELPER, workspace: input.files, tests }));
  if (out.error) return { results: [], stdout: out.stdout, error: out.error };
  return { results: JSON.parse(out.results || '[]'), stdout: out.stdout };
}

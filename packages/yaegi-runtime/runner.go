package main

import (
	"bytes"
	"fmt"
	"go/ast"
	"go/parser"
	"go/printer"
	"go/token"
	"regexp"
	"sort"
	"strings"
	"testing/fstest"

	"github.com/traefik/yaegi/interp"
	"github.com/traefik/yaegi/stdlib"
)

// Request is the JSON document passed to yaegiRun.
type Request struct {
	Helper    string            `json:"helper"`
	Workspace map[string]string `json:"workspace"`
	Tests     []TestFile        `json:"tests"`
}

// TestFile is one stage's test file; it must be package main and define func lldlabTests().
type TestFile struct {
	Stage string `json:"stage"`
	File  string `json:"file"`
	Src   string `json:"src"`
}

// Response is returned to JavaScript. Results is the helper's lldlabResultsJSON().
type Response struct {
	Stdout  string `json:"stdout"`
	Results string `json:"results"`
	Error   string `json:"error,omitempty"`
}

// modulePath prefixes workspace packages: folder spot/ is imported as app/spot.
const modulePath = "app"

var blockedPackages = []string{"net", "os/exec", "os/signal", "plugin", "syscall", "unsafe"}

func isBlocked(pkg string) bool {
	for _, b := range blockedPackages {
		if pkg == b || strings.HasPrefix(pkg, b+"/") {
			return true
		}
	}
	return false
}

// allowedSymbols is the standard library minus packages that reach the network or the host.
func allowedSymbols() interp.Exports {
	out := interp.Exports{}
	for key, syms := range stdlib.Symbols {
		// Keys look like "net/http/http": import path, then package name.
		pkg := key
		if i := strings.LastIndex(key, "/"); i >= 0 {
			pkg = key[:i]
		}
		if !isBlocked(pkg) {
			out[key] = syms
		}
	}
	return out
}

var importErr = regexp.MustCompile(`import "([^"]+)" error: unable to find source related to: "[^"]+"(\. Either the GOPATH environment variable, or the Interpreter\.Options\.GoPath needs to be set)?`)

// friendlyError rewrites Yaegi's "unable to find source" import errors into user-facing messages.
func friendlyError(err error) string {
	msg := err.Error()
	m := importErr.FindStringSubmatch(msg)
	if m == nil {
		return msg
	}
	pkg := m[1]
	var why string
	switch {
	case strings.HasPrefix(pkg, modulePath+"/"):
		why = fmt.Sprintf("package %q not found: no folder %q in your workspace", pkg, strings.TrimPrefix(pkg, modulePath+"/"))
	case isBlocked(pkg):
		why = fmt.Sprintf("package %q isn't available in this runner", pkg)
	default:
		why = fmt.Sprintf("package %q isn't available: import the standard library or your own %s/... packages", pkg, modulePath)
	}
	return strings.Replace(msg, m[0], why, 1)
}

type source struct{ name, src string }

// mergeSources joins package-main files into one, de-duplicating imports.
// rename may rename top-level functions of file i before printing.
// ponytail: line numbers in interpreter (not parser) errors refer to the merged file.
func mergeSources(files []source, rename func(i int, fd *ast.FuncDecl)) (string, error) {
	fset := token.NewFileSet()
	seen := map[string]bool{}
	var imports, decls []string
	for i, file := range files {
		f, err := parser.ParseFile(fset, file.name, file.src, 0)
		if err != nil {
			return "", err
		}
		if f.Name.Name != "main" {
			if !strings.Contains(file.name, "/") {
				return "", fmt.Errorf("%s: files at the workspace root must be package main; put package %s in a folder named %s/", file.name, f.Name.Name, f.Name.Name)
			}
			return "", fmt.Errorf("%s: must be package main, got package %s", file.name, f.Name.Name)
		}
		for _, imp := range f.Imports {
			spec := imp.Path.Value
			if imp.Name != nil {
				spec = imp.Name.Name + " " + spec
			}
			if !seen[spec] {
				seen[spec] = true
				imports = append(imports, spec)
			}
		}
		for _, d := range f.Decls {
			if gd, ok := d.(*ast.GenDecl); ok && gd.Tok == token.IMPORT {
				continue
			}
			if fd, ok := d.(*ast.FuncDecl); ok && rename != nil {
				rename(i, fd)
			}
			var buf bytes.Buffer
			if err := printer.Fprint(&buf, fset, d); err != nil {
				return "", err
			}
			decls = append(decls, buf.String())
		}
	}
	var b strings.Builder
	b.WriteString("package main\n\n")
	if len(imports) > 0 {
		b.WriteString("import (\n\t" + strings.Join(imports, "\n\t") + "\n)\n\n")
	}
	b.WriteString(strings.Join(decls, "\n\n"))
	return b.String(), nil
}

// run interprets the workspace with the helper and every test file, and returns stdout and results JSON.
func run(req Request) (resp Response) {
	var out bytes.Buffer
	defer func() {
		if r := recover(); r != nil {
			resp = Response{Stdout: out.String(), Error: fmt.Sprintf("panic: %v", r)}
		}
	}()

	fs := fstest.MapFS{}
	mains := []source{{"lldlab_helper.go", req.Helper}}
	paths := make([]string, 0, len(req.Workspace))
	for p := range req.Workspace {
		paths = append(paths, p)
	}
	sort.Strings(paths)
	for _, p := range paths {
		if !strings.HasSuffix(p, ".go") {
			continue
		}
		if strings.Contains(p, "/") {
			fs["src/"+modulePath+"/"+p] = &fstest.MapFile{Data: []byte(req.Workspace[p])}
		} else {
			mains = append(mains, source{p, req.Workspace[p]})
		}
	}
	firstTest := len(mains)
	for _, t := range req.Tests {
		mains = append(mains, source{"tests/" + t.File, t.Src})
	}
	found := make([]bool, len(req.Tests))
	src, err := mergeSources(mains, func(i int, fd *ast.FuncDecl) {
		if i >= firstTest && fd.Recv == nil && fd.Name.Name == "lldlabTests" {
			fd.Name.Name = fmt.Sprintf("lldlabTests_%d", i-firstTest)
			found[i-firstTest] = true
		}
	})
	if err != nil {
		return Response{Error: friendlyError(err)}
	}

	var entry strings.Builder
	entry.WriteString("func lldlabRunAll() {\n")
	for k, t := range req.Tests {
		if !found[k] {
			return Response{Error: fmt.Sprintf("tests/%s: must define func lldlabTests()", t.File)}
		}
		fmt.Fprintf(&entry, "\tlldlabSetCurrent(%q, %q)\n\tlldlabTests_%d()\n", t.Stage, t.File, k)
	}
	entry.WriteString("}\n")

	i := interp.New(interp.Options{GoPath: ".", SourcecodeFilesystem: fs, Stdout: &out, Stderr: &out})
	if err := i.Use(allowedSymbols()); err != nil {
		return Response{Error: err.Error()}
	}
	if _, err := i.Eval(src + "\n\n" + entry.String()); err != nil {
		return Response{Stdout: out.String(), Error: friendlyError(err)}
	}
	if _, err := i.Eval("lldlabRunAll()"); err != nil {
		return Response{Stdout: out.String(), Error: friendlyError(err)}
	}
	v, err := i.Eval("lldlabResultsJSON()")
	if err != nil {
		return Response{Stdout: out.String(), Error: err.Error()}
	}
	return Response{Stdout: out.String(), Results: v.String()}
}

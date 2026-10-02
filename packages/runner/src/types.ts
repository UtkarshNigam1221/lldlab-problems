export type Language = 'javascript' | 'typescript' | 'python' | 'go';

export const LANGUAGES: Language[] = ['javascript', 'typescript', 'python', 'go'];

/** Source files by workspace-relative POSIX path, e.g. "lot/lot.go". */
export type Files = Record<string, string>;

/** The test files of one stage, by file name (flat, no folders). */
export interface StageTests {
  stage: string;
  files: Files;
}

export interface RunInput {
  /** The user's workspace. */
  files: Files;
  /** Tests for stages 1..N, in stage order. */
  tests: StageTests[];
  /** Design checks for stages 1..N (see runInputFor). */
  checks?: DesignCheck[];
}

/** A design check prepared for one run (see checks.ts). */
export type DesignCheck =
  | { kind: 'forbid'; stage: string; name: string; pattern: string; in: string[] }
  | { kind: 'unchanged'; stage: string; name: string; path: string; snapshot?: string };

export interface CheckResult {
  name: string;
  stage: string;
  passed: boolean;
  message?: string;
}

export interface TestResult {
  name: string;
  stage: string;
  file: string;
  passed: boolean;
  error?: string;
  ms: number;
}

export interface RunOutput {
  results: TestResult[];
  stdout: string;
  /** Compile/parse error, timeout, or runtime crash. No per-test results when set. */
  error?: string;
  /** Pyodide/Yaegi failed to download; the next run retries. */
  runtimeLoadFailed?: boolean;
  /** The runtime crashed (stack overflow, Go exit, Pyodide fatal error); runTests replaces the worker. */
  workerDead?: boolean;
  /** Design check results, when the input had checks. */
  checks?: CheckResult[];
}

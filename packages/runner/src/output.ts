/** Largest stdout kept from a run; a print loop can otherwise build hundreds of MB and freeze the tab. */
export const MAX_STDOUT = 64 * 1024;

export function capOutput(stdout: string): string {
  if (stdout.length <= MAX_STDOUT) return stdout;
  return `${stdout.slice(0, MAX_STDOUT)}\n… output truncated (${MAX_STDOUT / 1024} KB limit)\n`;
}

export interface Issue {
  /** Problem slug (folder name). */
  problem: string;
  message: string;
  /** Warnings are printed but don't fail the command. */
  level?: 'warning';
}

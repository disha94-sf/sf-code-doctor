export type Severity = 'error' | 'warning';

/** A single problem found in a file. Lines and columns are 1-based. */
export interface Finding {
  ruleId: string;
  severity: Severity;
  file: string;
  line: number;
  column: number;
  message: string;
}

/** What a rule receives for each file it checks. */
export interface RuleContext {
  /** Path of the file, relative to the scanned folder. */
  file: string;
  /** Full file contents, unchanged. */
  source: string;
}

/** A finding as reported by a rule, before the scanner adds the file and rule details. */
export interface RawFinding {
  /** 0-based character offset into the source. */
  offset: number;
  message: string;
}

export interface Rule {
  /** Short kebab-case id, used in reports and in suppression comments. */
  id: string;
  /** One-line explanation shown by `--list-rules`. */
  description: string;
  severity: Severity;
  /** Returns true if this rule should look at the given file path. */
  appliesTo(file: string): boolean;
  check(ctx: RuleContext): RawFinding[];
}

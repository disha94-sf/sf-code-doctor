import * as fs from 'fs';
import * as path from 'path';
import { toLineColumn } from './apex';
import { allRules } from './rules';
import { Finding, Rule } from './types';

const SKIP_DIRS = new Set(['node_modules', '.git', '.sf', '.sfdx', '.vscode', 'dist']);
const SUPPRESS = /sf-code-doctor-disable-next-line\b([^\n]*)/;

export interface ScanOptions {
  /** Only run the rules with these ids. Runs every rule when empty or missing. */
  rules?: string[];
}

function listFiles(target: string): string[] {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  const files: string[] = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) files.push(...listFiles(path.join(target, entry.name)));
    } else if (entry.isFile()) {
      files.push(path.join(target, entry.name));
    }
  }
  return files;
}

/**
 * True if the line above `line` holds a suppression comment for this rule.
 * `// sf-code-doctor-disable-next-line` turns off every rule for the next line;
 * listing ids (`... hardcoded-id, soql-dml-in-loop`) turns off only those.
 */
function isSuppressed(lines: string[], line: number, ruleId: string): boolean {
  const m = SUPPRESS.exec(lines[line - 2] ?? '');
  if (!m) return false;
  const ids = m[1].replace(/\*\/.*$/, '').split(/[\s,]+/).filter(Boolean);
  return ids.length === 0 || ids.includes(ruleId);
}

/** Runs the selected rules over a single file's contents. */
export function scanSource(file: string, source: string, rules: Rule[] = allRules): Finding[] {
  const lines = source.split('\n');
  const findings: Finding[] = [];
  for (const rule of rules) {
    if (!rule.appliesTo(file)) continue;
    for (const raw of rule.check({ file, source })) {
      const { line, column } = toLineColumn(source, raw.offset);
      if (isSuppressed(lines, line, rule.id)) continue;
      findings.push({ ruleId: rule.id, severity: rule.severity, file, line, column, message: raw.message });
    }
  }
  return findings;
}

export function selectRules(ids?: string[]): Rule[] {
  if (!ids || ids.length === 0) return allRules;
  const unknown = ids.filter((id) => !allRules.some((r) => r.id === id));
  if (unknown.length > 0) {
    throw new Error(`Unknown rule(s): ${unknown.join(', ')}. Run with --list-rules to see them.`);
  }
  return allRules.filter((r) => ids.includes(r.id));
}

/** Scans a file or folder and returns every finding, sorted by file and line. */
export function scan(target: string, options: ScanOptions = {}): Finding[] {
  const rules = selectRules(options.rules);
  const root = fs.statSync(target).isFile() ? path.dirname(target) : target;
  const findings: Finding[] = [];

  for (const file of listFiles(target)) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (!rules.some((r) => r.appliesTo(relative))) continue;
    findings.push(...scanSource(relative, fs.readFileSync(file, 'utf8'), rules));
  }

  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);
}

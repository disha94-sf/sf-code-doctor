import { findMatching, maskCommentsAndStrings } from '../apex';
import { RawFinding, Rule } from '../types';
import { DATA_ACCESS_PATTERNS } from './soql-dml-in-loop';

const SHARING = /\b(with|without|inherited)\s+sharing\b/i;
const IS_TEST = /@\s*isTest\b/i;

/**
 * Returns every top-level `class` declaration (brace depth 0) along with the
 * modifiers and annotations written before it.
 */
function topLevelClasses(code: string): { offset: number; name: string; modifiers: string }[] {
  const classes: { offset: number; name: string; modifiers: string }[] = [];
  const declaration = /\b(class|interface|enum)\s+([A-Za-z_]\w*)/gi;
  let depth = 0;
  let scanned = 0;
  let statementStart = 0;
  let m: RegExpExecArray | null;

  while ((m = declaration.exec(code))) {
    // Bring the brace depth up to date with everything before this match.
    for (; scanned < m.index; scanned++) {
      const ch = code[scanned];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if ((ch === '{' || ch === '}' || ch === ';') && depth === 0) statementStart = scanned + 1;
    }
    if (depth !== 0 || m[1].toLowerCase() !== 'class') continue;
    classes.push({
      offset: m.index,
      name: m[2],
      modifiers: code.slice(statementStart, m.index),
    });
  }
  return classes;
}

/** True if the class body starting at `offset` runs a query or DML. */
function touchesRecords(code: string, offset: number): boolean {
  const open = code.indexOf('{', offset);
  if (open === -1) return false;
  const close = findMatching(code, open);
  const body = code.slice(open + 1, close === -1 ? code.length : close);
  return DATA_ACCESS_PATTERNS.some(({ regex }) => new RegExp(regex.source, regex.flags).test(body));
}

function check(source: string): RawFinding[] {
  const code = maskCommentsAndStrings(source);
  return topLevelClasses(code)
    .filter(({ modifiers }) => !SHARING.test(modifiers) && !IS_TEST.test(modifiers))
    .filter(({ offset }) => touchesRecords(code, offset))
    .map(({ offset, name }) => ({
      offset,
      message:
        `Class "${name}" runs queries or DML but does not declare its sharing. Add "with sharing" (or "inherited sharing", ` +
        'or "without sharing" with a comment explaining why) so record access is enforced on purpose.',
    }));
}

export const missingSharingRule: Rule = {
  id: 'missing-sharing',
  description: 'Finds Apex classes that query or change records without declaring their sharing.',
  severity: 'warning',
  appliesTo: (file) => /\.cls$/i.test(file),
  check: ({ source }) => check(source),
};

import { findMatching, isApexFile, maskCommentsAndStrings } from '../apex';
import { RawFinding, Rule } from '../types';

interface Range {
  start: number;
  end: number;
}

/** Finds the body of every for, while and do loop in comment- and string-masked Apex. */
export function findLoopBodies(code: string): Range[] {
  const bodies: Range[] = [];
  const keyword = /\b(for|while|do)\b/gi;
  let m: RegExpExecArray | null;

  while ((m = keyword.exec(code))) {
    let i = m.index + m[0].length;
    const isDo = m[1].toLowerCase() === 'do';

    if (!isDo) {
      // Skip to the loop header "( ... )".
      while (i < code.length && /\s/.test(code[i])) i++;
      if (code[i] !== '(') continue;
      const headerEnd = findMatching(code, i);
      if (headerEnd === -1) continue;
      i = headerEnd + 1;
    }

    while (i < code.length && /\s/.test(code[i])) i++;
    if (code[i] === ';') continue; // e.g. the "while (...);" that ends a do-loop

    if (code[i] === '{') {
      const end = findMatching(code, i);
      if (end !== -1) bodies.push({ start: i, end });
    } else {
      // A loop body without braces is a single statement.
      const end = code.indexOf(';', i);
      if (end !== -1) bodies.push({ start: i, end });
    }
  }
  return bodies;
}

const PATTERNS: { regex: RegExp; message: string }[] = [
  {
    regex: /\[\s*(SELECT|FIND)\b/gi,
    message: 'SOQL/SOSL query inside a loop. Query once before the loop and use a Map or Set.',
  },
  {
    regex: /\b(Database\s*\.\s*(query|queryWithBinds|countQuery|getQueryLocator)|Search\s*\.\s*query)\s*\(/gi,
    message: 'Dynamic query inside a loop. Query once before the loop and use a Map or Set.',
  },
  {
    // A DML statement starts a statement: after ; { } ) else, or at the start of the body.
    regex: /(?:^|[;{})]|\belse\b)\s*(insert|update|upsert|delete|undelete|merge)\s+(?=[\w\[(])/gim,
    message: 'DML statement inside a loop. Collect the records in a List and run the DML once after the loop.',
  },
  {
    regex: /\bDatabase\s*\.\s*(insert|update|upsert|delete|undelete|merge|convertLead|emptyRecycleBin)\s*\(/gi,
    message: 'DML method inside a loop. Collect the records in a List and run the DML once after the loop.',
  },
];

function check(source: string): RawFinding[] {
  const code = maskCommentsAndStrings(source);
  const bodies = findLoopBodies(code);
  if (bodies.length === 0) return [];

  const inLoop = (offset: number) => bodies.some((b) => offset >= b.start && offset < b.end);
  const findings = new Map<number, RawFinding>();

  for (const { regex, message } of PATTERNS) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(code))) {
      // Report at the keyword itself, not at the punctuation before it.
      const offset = m.index + m[0].search(/[A-Za-z[]/);
      if (inLoop(offset) && !findings.has(offset)) {
        findings.set(offset, { offset, message });
      }
    }
  }
  return [...findings.values()].sort((a, b) => a.offset - b.offset);
}

export const soqlDmlInLoopRule: Rule = {
  id: 'soql-dml-in-loop',
  description: 'Finds SOQL queries and DML statements inside loops, which quickly hit governor limits.',
  severity: 'error',
  appliesTo: isApexFile,
  check: ({ source }) => check(source),
};

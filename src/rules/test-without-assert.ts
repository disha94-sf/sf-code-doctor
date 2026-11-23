import { findMatching, maskCommentsAndStrings } from '../apex';
import { RawFinding, Rule } from '../types';

/**
 * Something that counts as checking a result: System.assert*, Assert.*,
 * a custom helper whose name contains "assert", "verify" or "expect"
 * (for example assertAccountCreated or fflib's mocks.verify), or Assert.fail.
 */
const CHECKS = /\b\w*(assert|verify|expect)\w*\s*[(.]/i;

const TEST_METHODS = [
  // @IsTest static void name(...)   (annotation may have parameters)
  /@\s*isTest\b(?:\s*\([^)]*\))?\s+(?:[A-Za-z_]\w*\s+)*?([A-Za-z_]\w*)\s*\(/gi,
  // static testMethod void name(...)
  /\btestMethod\s+(?:[A-Za-z_]\w*\s+)*?([A-Za-z_]\w*)\s*\(/gi,
];

function check(source: string): RawFinding[] {
  const code = maskCommentsAndStrings(source);
  const findings = new Map<number, RawFinding>();

  for (const pattern of TEST_METHODS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(code))) {
      const nameOffset = m.index + m[0].lastIndexOf(m[1]);
      const paramsOpen = code.indexOf('(', nameOffset);
      const paramsClose = findMatching(code, paramsOpen);
      if (paramsClose === -1) continue;

      // The body must follow the parameter list directly; anything else
      // (e.g. an abstract method ending in ';') is not a test to check.
      const after = code.slice(paramsClose + 1).match(/^\s*\{/);
      if (!after) continue;
      const bodyOpen = paramsClose + 1 + after[0].length - 1;
      const bodyClose = findMatching(code, bodyOpen);
      const body = code.slice(bodyOpen + 1, bodyClose === -1 ? code.length : bodyClose);

      if (!CHECKS.test(body) && !findings.has(nameOffset)) {
        findings.set(nameOffset, {
          offset: nameOffset,
          message:
            `Test method "${m[1]}" never asserts anything, so it passes even when the code is broken. ` +
            'Add Assert.areEqual / Assert.isTrue (or System.assertEquals) to check the result.',
        });
      }
    }
  }
  return [...findings.values()].sort((a, b) => a.offset - b.offset);
}

export const testWithoutAssertRule: Rule = {
  id: 'test-without-assert',
  description: 'Finds Apex test methods that never assert anything.',
  severity: 'warning',
  appliesTo: (file) => /\.cls$/i.test(file),
  check: ({ source }) => check(source),
};

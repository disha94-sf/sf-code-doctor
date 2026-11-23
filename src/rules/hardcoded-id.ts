import { isApexFile, maskComments } from '../apex';
import { RawFinding, Rule } from '../types';

const CHECKSUM_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';

/** Computes the 3-character suffix that turns a 15-character Salesforce ID into its 18-character form. */
export function idChecksum(id15: string): string {
  let suffix = '';
  for (let chunk = 0; chunk < 3; chunk++) {
    let bits = 0;
    for (let i = 0; i < 5; i++) {
      const c = id15[chunk * 5 + i];
      if (c >= 'A' && c <= 'Z') bits |= 1 << i;
    }
    suffix += CHECKSUM_CHARS[bits];
  }
  return suffix;
}

/**
 * Decides whether a string looks like a Salesforce record ID.
 *
 * - 18 characters: the last three must be the valid checksum of the first 15,
 *   which makes accidental matches extremely unlikely.
 * - 15 characters: alphanumeric, the reserved 6th character is '0', and it
 *   mixes letters and digits (so plain words are not reported).
 */
export function looksLikeSalesforceId(value: string): boolean {
  if (!/^[a-zA-Z0-9]+$/.test(value)) return false;
  if (value.length === 18) {
    return value[5] === '0' && idChecksum(value.slice(0, 15)) === value.slice(15).toUpperCase();
  }
  if (value.length === 15) {
    return value[5] === '0' && /[0-9]/.test(value) && /[a-zA-Z]/.test(value);
  }
  return false;
}

const MESSAGE =
  'Hard-coded Salesforce ID "%s". IDs differ between orgs and sandboxes; ' +
  'query the record, or store the value in Custom Metadata or a Custom Setting.';

function checkApex(source: string): RawFinding[] {
  const code = maskComments(source);
  const findings: RawFinding[] = [];
  const literal = /'((?:[^'\\\n]|\\.)*)'/g;
  let m: RegExpExecArray | null;
  while ((m = literal.exec(code))) {
    if (looksLikeSalesforceId(m[1])) {
      findings.push({ offset: m.index, message: MESSAGE.replace('%s', m[1]) });
    }
  }
  return findings;
}

function checkFlow(source: string): RawFinding[] {
  const findings: RawFinding[] = [];
  const value = /<stringValue>\s*([a-zA-Z0-9]{15,18})\s*<\/stringValue>/g;
  let m: RegExpExecArray | null;
  while ((m = value.exec(source))) {
    if (looksLikeSalesforceId(m[1])) {
      findings.push({ offset: m.index, message: MESSAGE.replace('%s', m[1]) });
    }
  }
  return findings;
}

export const hardcodedIdRule: Rule = {
  id: 'hardcoded-id',
  description: 'Finds Salesforce record IDs written directly into Apex or Flows.',
  severity: 'error',
  appliesTo: (file) => isApexFile(file) || /\.flow-meta\.xml$/i.test(file),
  check: ({ file, source }) => (isApexFile(file) ? checkApex(source) : checkFlow(source)),
};

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idChecksum, looksLikeSalesforceId } from '../src/rules/hardcoded-id';
import { scanSource } from '../src/scanner';

const ID15 = '001Dn00000AbCdE';
const ID18 = ID15 + idChecksum(ID15);

const run = (file: string, source: string) =>
  scanSource(file, source).filter((f) => f.ruleId === 'hardcoded-id');

test('computes the 18-character checksum', () => {
  // Only "D" (chunk 1), "A", "C" and "E" (chunk 3) are uppercase in 001Dn00000AbCdE.
  assert.equal(idChecksum(ID15), 'IAV');
});

test('recognises 15- and 18-character IDs', () => {
  assert.ok(looksLikeSalesforceId(ID15));
  assert.ok(looksLikeSalesforceId(ID18));
  assert.ok(looksLikeSalesforceId(ID18.slice(0, 15) + ID18.slice(15).toLowerCase()));
});

test('ignores look-alikes', () => {
  assert.ok(!looksLikeSalesforceId('AccountNameHere'), 'plain word');
  assert.ok(!looksLikeSalesforceId(ID15 + 'XXX'), 'wrong checksum');
  assert.ok(!looksLikeSalesforceId('123456789012345'), 'digits only');
  assert.ok(!looksLikeSalesforceId('001Dn00000AbCd'), 'too short');
});

test('reports an ID in an Apex string literal with its position', () => {
  const src = `public class A {\n  Id ownerId = '${ID18}';\n}`;
  const findings = run('classes/A.cls', src);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 2);
  assert.equal(findings[0].column, 16);
  assert.match(findings[0].message, new RegExp(ID18));
});

test('ignores IDs inside comments', () => {
  const src = `// owner was '${ID15}'\n/* '${ID18}' */\npublic class A {}`;
  assert.equal(run('A.cls', src).length, 0);
});

test('reports an ID in a Flow', () => {
  const src = `<Flow>\n  <value>\n    <stringValue>${ID15}</stringValue>\n  </value>\n</Flow>`;
  const findings = run('flows/My.flow-meta.xml', src);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 3);
});

test('can be suppressed for the next line', () => {
  const src = `// sf-code-doctor-disable-next-line hardcoded-id\nId x = '${ID15}';`;
  assert.equal(run('A.cls', src).length, 0);
  const other = `// sf-code-doctor-disable-next-line soql-dml-in-loop\nId x = '${ID15}';`;
  assert.equal(run('A.cls', other).length, 1);
});

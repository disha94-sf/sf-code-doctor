import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

// Tests run from dist/test, so the compiled CLI and the fixtures are found relative to it.
const CLI = path.join(__dirname, '..', 'src', 'cli.js');
const FIXTURES = path.join(__dirname, '..', '..', 'test', 'fixtures');

const run = (...args: string[]) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

test('scans the example project and exits with 1', () => {
  const r = run(FIXTURES);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /AccountService\.cls/);
  assert.match(r.stdout, /3 problem\(s\): 3 error\(s\)/);
});

test('prints JSON with the expected findings', () => {
  const r = run(FIXTURES, '--format', 'json');
  const findings = JSON.parse(r.stdout);
  assert.deepEqual(
    findings.map((f: { ruleId: string; line: number }) => `${f.line}:${f.ruleId}`),
    ['9:soql-dml-in-loop', '11:hardcoded-id', '13:soql-dml-in-loop'],
  );
  assert.equal(findings[0].file, 'force-app/main/default/classes/AccountService.cls');
});

test('runs only the selected rules', () => {
  const r = run(FIXTURES, '--rules=hardcoded-id', '--format=json');
  assert.equal(JSON.parse(r.stdout).length, 1);
});

test('--fail-on never always exits with 0', () => {
  assert.equal(run(FIXTURES, '--fail-on', 'never').status, 0);
});

test('reports bad input with exit code 2', () => {
  assert.equal(run('does-not-exist').status, 2);
  assert.equal(run(FIXTURES, '--rules', 'nope').status, 2);
  assert.equal(run('--format', 'xml').status, 2);
  assert.equal(run('--bogus').status, 2);
});

test('prints the version and the rule list', () => {
  assert.match(run('--version').stdout, /^\d+\.\d+\.\d+/);
  assert.match(run('--list-rules').stdout, /hardcoded-id[\s\S]*soql-dml-in-loop/);
});

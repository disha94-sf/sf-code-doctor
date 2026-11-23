import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanSource } from '../src/scanner';

const lines = (source: string) =>
  scanSource('A.cls', source)
    .filter((f) => f.ruleId === 'soql-dml-in-loop')
    .map((f) => f.line);

test('reports SOQL inside a for loop', () => {
  const src = [
    'for (Contact c : contacts) {', // 1
    '  Account a = [SELECT Id FROM Account WHERE Id = :c.AccountId];', // 2
    '}',
  ].join('\n');
  assert.deepEqual(lines(src), [2]);
});

test('reports DML statements and Database methods inside loops', () => {
  const src = [
    'while (i < 10) {', // 1
    '  update acc;', // 2
    '  Database.insert(rec, false);', // 3
    '  if (x) delete old;', // 4
    '  i++;',
    '}',
  ].join('\n');
  assert.deepEqual(lines(src), [2, 3, 4]);
});

test('reports DML in a loop body without braces', () => {
  assert.deepEqual(lines('for (Account a : accs)\n  insert a;'), [2]);
});

test('reports dynamic queries and do-while loops', () => {
  const src = ['do {', '  List<SObject> r = Database.query(q);', '} while (more);'].join('\n');
  assert.deepEqual(lines(src), [2]);
});

test('does not report the SOQL for-loop pattern', () => {
  const src = ['for (Account a : [SELECT Id FROM Account]) {', '  ids.add(a.Id);', '}'].join('\n');
  assert.deepEqual(lines(src), []);
});

test('does not report queries and DML outside loops', () => {
  const src = [
    'List<Account> accs = [SELECT Id FROM Account];',
    'for (Account a : accs) { a.Name = \'x\'; }',
    'update accs;',
  ].join('\n');
  assert.deepEqual(lines(src), []);
});

test('ignores keywords inside comments and strings', () => {
  const src = [
    'for (Account a : accs) {',
    '  // update a;',
    "  String s = 'insert into [SELECT Id FROM X]';",
    '  /* delete a; */',
    '}',
  ].join('\n');
  assert.deepEqual(lines(src), []);
});

test('reports a query in a nested loop once', () => {
  const src = [
    'for (A a : as) {',
    '  for (B b : bs) {',
    '    C c = [SELECT Id FROM C LIMIT 1];', // 3
    '  }',
    '}',
  ].join('\n');
  assert.deepEqual(lines(src), [3]);
});

test('does not treat method calls named update as DML', () => {
  assert.deepEqual(lines('for (X x : xs) { service.update(x); }'), []);
});

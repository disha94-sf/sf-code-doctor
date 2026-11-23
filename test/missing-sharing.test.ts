import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanSource } from '../src/scanner';

const run = (source: string, file = 'A.cls') =>
  scanSource(file, source).filter((f) => f.ruleId === 'missing-sharing');

const QUERY = '{ void f() { List<Account> a = [SELECT Id FROM Account]; } }';

test('reports a class that queries records without a sharing declaration', () => {
  const findings = run('/** Docs */\npublic class AccountService ' + QUERY);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 2);
  assert.equal(findings[0].severity, 'warning');
  assert.match(findings[0].message, /AccountService/);
});

test('reports DML and Database methods too', () => {
  assert.equal(run('public class A { void f(Account a) { update a; } }').length, 1);
  assert.equal(run('public class A { void f() { Database.query(q); } }').length, 1);
});

test('skips classes that never touch records', () => {
  assert.equal(run('public class Constants { public static final String X = \'x\'; }').length, 0);
  assert.equal(run("public class Util { String s = '[SELECT Id FROM X]'; }").length, 0);
});

test('accepts with, without and inherited sharing in any case', () => {
  assert.equal(run('public with sharing class A ' + QUERY).length, 0);
  assert.equal(run('public WITHOUT SHARING class A ' + QUERY).length, 0);
  assert.equal(run('global inherited sharing class A ' + QUERY).length, 0);
  assert.equal(run('public virtual with sharing class A extends B ' + QUERY).length, 0);
});

test('skips test classes', () => {
  assert.equal(run('@IsTest\nprivate class ATest ' + QUERY).length, 0);
  assert.equal(run('@isTest(SeeAllData=false)\nprivate class ATest ' + QUERY).length, 0);
});

test('skips interfaces and enums', () => {
  assert.equal(run('public interface Greeter { String greet(); }').length, 0);
  assert.equal(run('public enum Color { RED, GREEN }').length, 0);
});

test('only checks the top-level class, not inner classes', () => {
  const src = [
    'public with sharing class Outer {',
    '  public class Inner {}',
    '  private enum Mode { A }',
    '}',
  ].join('\n');
  assert.equal(run(src).length, 0);
});

test('ignores the word "class" in comments and strings', () => {
  const src = [
    '// public class Fake {}',
    "public with sharing class Real { String s = 'class Nope'; }",
  ].join('\n');
  assert.equal(run(src).length, 0);
});

test('does not look at triggers', () => {
  assert.equal(run('trigger T on Account (before insert) {}', 'T.trigger').length, 0);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanSource } from '../src/scanner';

const names = (source: string) =>
  scanSource('ATest.cls', source)
    .filter((f) => f.ruleId === 'test-without-assert')
    .map((f) => f.message.match(/"(\w+)"/)![1]);

const cls = (...body: string[]) => ['@IsTest', 'private class ATest {', ...body, '}'].join('\n');

test('reports a test method with no assertion', () => {
  const src = cls('  @IsTest', '  static void createsAccount() {', '    insert new Account(Name = \'x\');', '  }');
  const findings = scanSource('ATest.cls', src).filter((f) => f.ruleId === 'test-without-assert');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 4);
  assert.equal(findings[0].severity, 'warning');
});

test('accepts the common assertion styles', () => {
  const src = cls(
    '  @IsTest static void a() { System.assertEquals(1, 1); }',
    '  @IsTest static void b() { Assert.areEqual(1, 1); }',
    '  @IsTest static void c() { System.Assert.isTrue(true); }',
    '  @IsTest static void d() { assertAccountCreated(); }',
    '  @IsTest static void e() { ((Svc) mocks.verify(svc)).run(); }',
    '  @IsTest static void f() { try { run(); Assert.fail(); } catch (Exception ex) {} }',
  );
  assert.deepEqual(names(src), []);
});

test('handles annotation parameters and the old testMethod keyword', () => {
  const src = cls(
    '  @isTest(SeeAllData=false)',
    '  private static void withParams() { run(); }',
    '  static testMethod void oldStyle() { run(); }',
  );
  assert.deepEqual(names(src), ['withParams', 'oldStyle']);
});

test('does not treat the @IsTest class annotation or @TestSetup as a test method', () => {
  const src = cls('  @TestSetup static void setup() { insert new Account(Name = \'x\'); }');
  assert.deepEqual(names(src), []);
});

test('ignores assertions that are commented out', () => {
  const src = cls('  @IsTest static void a() {', '    run();', '    // Assert.areEqual(1, 1);', '  }');
  assert.deepEqual(names(src), ['a']);
});

test('can be suppressed for a method that only checks it does not throw', () => {
  const src = cls(
    '  // sf-code-doctor-disable-next-line test-without-assert',
    '  @IsTest static void runsWithoutError() { run(); }',
  );
  assert.deepEqual(names(src), []);
});

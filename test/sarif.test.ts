import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSarif } from '../src/sarif';
import { Finding } from '../src/types';

const finding: Finding = {
  ruleId: 'missing-sharing',
  severity: 'warning',
  file: 'classes/A.cls',
  line: 3,
  column: 1,
  message: 'msg',
};

const uri = (prefix?: string) =>
  toSarif([finding], { version: '1.0.0', pathPrefix: prefix }).runs[0].results![0].locations![0].physicalLocation!
    .artifactLocation!.uri;

test('puts the path prefix in front of each file', () => {
  assert.equal(uri(), 'classes/A.cls');
  assert.equal(uri('.'), 'classes/A.cls');
  assert.equal(uri('force-app/main/default'), 'force-app/main/default/classes/A.cls');
  assert.equal(uri('force-app/'), 'force-app/classes/A.cls');
  assert.equal(uri('force-app\\main'), 'force-app/main/classes/A.cls');
});

test('maps warnings to the SARIF warning level', () => {
  const result = toSarif([finding], { version: '1.0.0' }).runs[0].results![0];
  assert.equal(result.level, 'warning');
});

test('produces an empty result list when there are no findings', () => {
  const sarif = toSarif([], { version: '1.0.0' });
  assert.deepEqual(sarif.runs[0].results, []);
  assert.equal(sarif.runs[0].tool.driver.rules!.length, 4);
});

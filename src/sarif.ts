import type { Log } from 'sarif';
import { allRules } from './rules';
import { Finding } from './types';

const HOMEPAGE = 'https://github.com/disha94-sf/sf-code-doctor';

export interface SarifOptions {
  version: string;
  /** Folder to put in front of each finding's path, so paths are relative to the repository root. */
  pathPrefix?: string;
}

/** Converts findings to SARIF 2.1.0, the format GitHub code scanning reads. */
export function toSarif(findings: Finding[], { version, pathPrefix = '' }: SarifOptions): Log {
  const prefix = pathPrefix && pathPrefix !== '.' ? pathPrefix.replace(/\\/g, '/').replace(/\/?$/, '/') : '';
  const ruleIndex = new Map(allRules.map((r, i) => [r.id, i]));

  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'sf-code-doctor',
            version,
            informationUri: HOMEPAGE,
            rules: allRules.map((r) => ({
              id: r.id,
              shortDescription: { text: r.description },
              helpUri: `${HOMEPAGE}#rules`,
              defaultConfiguration: { level: r.severity },
            })),
          },
        },
        results: findings.map((f) => ({
          ruleId: f.ruleId,
          ruleIndex: ruleIndex.get(f.ruleId),
          level: f.severity,
          message: { text: f.message },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: prefix + f.file, uriBaseId: '%SRCROOT%' },
                region: { startLine: f.line, startColumn: f.column },
              },
            },
          ],
        })),
      },
    ],
  };
}

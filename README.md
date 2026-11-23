# sf-code-doctor

[![CI](https://github.com/disha94-sf/sf-code-doctor/actions/workflows/ci.yml/badge.svg)](https://github.com/disha94-sf/sf-code-doctor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**A fast, zero-config checkup for your Salesforce project.** It catches the
mistakes that pass code review and then fail in production: hard-coded record IDs,
queries inside loops and DML inside loops.

```text
$ sf-code-doctor force-app

force-app/main/default/classes/AccountService.cls
  9:27   error    SOQL/SOSL query inside a loop. Query once before the loop and use a Map or Set.  (soql-dml-in-loop)
  11:27  error    Hard-coded Salesforce ID "005Dn000001xYz9". IDs differ between orgs and sandboxes; ...  (hardcoded-id)
  13:13  error    DML statement inside a loop. Collect the records in a List and run the DML once after the loop.  (soql-dml-in-loop)

3 problem(s): 3 error(s), 0 warning(s)
```

## Why?

- **No org, no setup, no Java.** It reads your source files directly and runs in under a second.
- **Few false alarms.** Comments and strings are ignored, and 18-character IDs are confirmed
  with their checksum, so ordinary text isn't reported as an ID.
- **Ready for CI.** Exit codes and JSON output make it easy to block a pull request or a commit.

It is meant as a quick first check, not a replacement for
[Salesforce Code Analyzer](https://developer.salesforce.com/docs/platform/salesforce-code-analyzer/overview).

## Install

Requires Node.js 18 or later.

```bash
npm install -g github:disha94-sf/sf-code-doctor
```

Or run it once without installing:

```bash
npx github:disha94-sf/sf-code-doctor force-app
```

## Usage

```bash
sf-code-doctor                      # scan the current folder
sf-code-doctor force-app            # scan a folder
sf-code-doctor path/to/MyClass.cls  # scan one file
sf-code-doctor --format json        # machine-readable output
sf-code-doctor --rules hardcoded-id # run only some rules
sf-code-doctor --fail-on never      # report, but never fail
sf-code-doctor --list-rules         # show all rules
```

| Exit code | Meaning |
| --- | --- |
| `0` | No problems at or above the `--fail-on` level |
| `1` | Problems found |
| `2` | Bad option or path |

## Rules

| Rule | What it finds |
| --- | --- |
| `hardcoded-id` | Salesforce record IDs written into Apex string literals or Flow values. IDs change between orgs and sandboxes, so the code breaks after deployment. |
| `soql-dml-in-loop` | SOQL/SOSL queries, `Database.query`, DML statements (`insert`, `update`, …) and `Database.*` DML methods inside `for`, `while` and `do` loops. These hit governor limits once data grows. The SOQL for-loop (`for (Account a : [SELECT …])`) is allowed. |

### Turning a finding off

If a finding is intentional, add a comment on the line above it:

```apex
// sf-code-doctor-disable-next-line hardcoded-id
Id fallbackQueue = '00G000000000001';
```

Without a rule id, the comment turns off every rule for that line.

## Use it in GitHub Actions

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
- run: npx --yes github:disha94-sf/sf-code-doctor force-app
```

## Use it as a library

```ts
import { scan } from 'sf-code-doctor';

const findings = scan('force-app', { rules: ['soql-dml-in-loop'] });
```

## Roadmap

- [ ] Run as a Salesforce CLI plugin (`sf code-doctor scan`)
- [ ] Rule: classes without `with sharing` / `without sharing` / `inherited sharing`
- [ ] Rule: test classes without assertions
- [ ] Rule: mixed API versions across metadata files
- [ ] SARIF output for GitHub code scanning

Ideas and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)

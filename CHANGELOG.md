# Changelog

All notable changes to this project are listed here.
This project follows [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-11-23

### Added
- `missing-sharing` rule (warning): finds Apex classes that run queries or DML
  without declaring `with`, `without` or `inherited` sharing.

## [0.1.0] - 2026-11-23

### Added
- `hardcoded-id` rule: finds Salesforce record IDs in Apex and Flows.
- `soql-dml-in-loop` rule: finds queries and DML inside loops.
- Command-line interface with text and JSON output, `--rules`, `--fail-on` and `--list-rules`.
- `// sf-code-doctor-disable-next-line` suppression comments.

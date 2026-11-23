# Contributing to sf-code-doctor

Thanks for helping! Bug reports, new rule ideas and pull requests are all welcome.

## Getting started

```bash
git clone https://github.com/disha94-sf/sf-code-doctor.git
cd sf-code-doctor
npm install
npm test
```

Try the scanner on the example project:

```bash
npm run scan:example
```

## Project layout

```text
src/
  cli.ts          command-line interface
  scanner.ts      finds files, runs rules, applies suppression comments
  apex.ts         helpers for reading Apex (masking comments and strings, bracket matching)
  rules/          one file per rule, registered in rules/index.ts
test/             one test file per rule, plus CLI tests
test/fixtures/    a small example Salesforce project
```

## Adding a rule

1. Create `src/rules/<rule-id>.ts` exporting a `Rule` (see `src/types.ts`).
   A rule returns findings as character offsets; the scanner turns them into lines and columns.
2. Use `maskComments` or `maskCommentsAndStrings` from `src/apex.ts` so you don't report
   code that is commented out or inside a string.
3. Register it in `src/rules/index.ts`.
4. Add `test/<rule-id>.test.ts` covering what it **should** report and, just as
   importantly, what it should **not** report.
5. Document it in the Rules table in `README.md`.

## Pull requests

- Keep each pull request focused on one change.
- Make sure `npm test` passes.
- Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org/) style,
  e.g. `feat: add missing-sharing rule` or `fix: ignore keywords in comments`.

## Reporting a false positive

Please open an issue with the smallest piece of Apex or metadata that shows the problem,
what was reported and what you expected.

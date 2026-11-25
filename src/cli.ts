#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { allRules } from './rules';
import { toSarif } from './sarif';
import { scan } from './scanner';
import { Finding } from './types';

const HELP = `Usage: sf-code-doctor [path] [options]

Scans a Salesforce project (default: the current folder) for common mistakes.

Options:
  --format <text|json|sarif>
                           Output format (default: text). Use sarif for
                           GitHub code scanning.
  --rules <id,id>          Only run these rules
  --fail-on <error|warning|never>
                           Exit with code 1 when a finding of this severity
                           or worse is found (default: error)
  --list-rules             Show every rule and exit
  -v, --version            Show the version
  -h, --help               Show this help

Suppress a finding with a comment on the line above it:
  // sf-code-doctor-disable-next-line hardcoded-id
`;

interface Options {
  target: string;
  format: 'text' | 'json' | 'sarif';
  rules: string[];
  failOn: 'error' | 'warning' | 'never';
}

function version(): string {
  const pkg = path.join(__dirname, '..', '..', 'package.json');
  return JSON.parse(fs.readFileSync(pkg, 'utf8')).version;
}

function parseArgs(argv: string[]): Options | string {
  const opts: Options = { target: '.', format: 'text', rules: [], failOn: 'error' };
  let targetSet = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const [flag, inline] = arg.startsWith('--') && arg.includes('=') ? arg.split(/=(.*)/s) : [arg, undefined];
    const value = () => {
      const v = inline ?? argv[++i];
      if (v === undefined) throw new Error(`${flag} needs a value.`);
      return v;
    };

    switch (flag) {
      case '-h':
      case '--help':
        return HELP;
      case '-v':
      case '--version':
        return version();
      case '--list-rules':
        return allRules.map((r) => `${r.id.padEnd(20)} ${r.severity.padEnd(8)} ${r.description}`).join('\n');
      case '--format': {
        const v = value();
        if (v !== 'text' && v !== 'json' && v !== 'sarif') {
          throw new Error(`--format must be "text", "json" or "sarif".`);
        }
        opts.format = v;
        break;
      }
      case '--rules':
        opts.rules = value().split(',').map((s) => s.trim()).filter(Boolean);
        break;
      case '--fail-on': {
        const v = value();
        if (v !== 'error' && v !== 'warning' && v !== 'never') {
          throw new Error(`--fail-on must be "error", "warning" or "never".`);
        }
        opts.failOn = v;
        break;
      }
      default:
        if (flag.startsWith('-')) throw new Error(`Unknown option ${flag}. Run with --help.`);
        if (targetSet) throw new Error('Only one path can be scanned at a time.');
        opts.target = flag;
        targetSet = true;
    }
  }
  return opts;
}

function formatText(findings: Finding[]): string {
  if (findings.length === 0) return 'No problems found.';
  const out: string[] = [];
  let current = '';
  for (const f of findings) {
    if (f.file !== current) {
      if (current) out.push('');
      out.push(f.file);
      current = f.file;
    }
    out.push(`  ${f.line}:${f.column}  ${f.severity.padEnd(7)}  ${f.message}  (${f.ruleId})`);
  }
  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.length - errors;
  out.push('', `${findings.length} problem(s): ${errors} error(s), ${warnings} warning(s)`);
  return out.join('\n');
}

export function main(argv: string[]): number {
  let parsed: Options | string;
  try {
    parsed = parseArgs(argv);
  } catch (e) {
    console.error((e as Error).message);
    return 2;
  }
  if (typeof parsed === 'string') {
    console.log(parsed);
    return 0;
  }

  if (!fs.existsSync(parsed.target)) {
    console.error(`Path not found: ${parsed.target}`);
    return 2;
  }

  let findings: Finding[];
  try {
    findings = scan(parsed.target, { rules: parsed.rules });
  } catch (e) {
    console.error((e as Error).message);
    return 2;
  }

  if (parsed.format === 'sarif') {
    const root = fs.statSync(parsed.target).isFile() ? path.dirname(parsed.target) : parsed.target;
    const sarif = toSarif(findings, { version: version(), pathPrefix: path.relative(process.cwd(), root) });
    console.log(JSON.stringify(sarif, null, 2));
  } else if (parsed.format === 'json') {
    console.log(JSON.stringify(findings, null, 2));
  } else {
    console.log(formatText(findings));
  }

  const failing = findings.some((f) =>
    parsed.failOn === 'never' ? false : parsed.failOn === 'warning' ? true : f.severity === 'error',
  );
  return failing ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

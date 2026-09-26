#!/usr/bin/env node
// Forbidden-terms gate.
//
// Blocks a pull request that names a third-party product on any of its
// surfaces: diff, file names, commit messages, branch name, title and body.
//
// WHAT THIS SCRIPT MUST NEVER DO
//
//   * print a match, or any substring of one
//   * print the pattern, decoded or encoded
//   * write either to a file, an output, or a job summary
//
// The run log of a public repository is public, so findings carry a SURFACE, a
// FILE and a LINE and nothing else. That is enough to act on, because the
// author knows what they wrote.
//
// The pattern and the must-block corpus arrive base64-encoded through the
// environment. The must-PASS corpus is checked in
// (forbidden-terms-allowed-prose.txt).
//
// ERRORING IS NOT FINDING. Exit 2 means the guard could not run - no pattern, a
// pattern that will not compile, a corpus that came back short, a self-test that
// failed. Exit 1 means it ran and found something. Exit 0 means it ran and did
// not. A caller must never treat 2 as clean.
//
// Usage:
//   node scripts/ci/forbidden-terms.mjs selftest --min-corpus <n>
//   node scripts/ci/forbidden-terms.mjs scan --dir <directory>
//
// The directory holds one file per surface, named for it: diff, names,
// messages, branch, title, body. ALL SIX are read and a missing one is exit 2,
// so the caller cannot choose which surfaces are checked. `diff` expects unified
// diff text and reports the file and line of the ADDED line, which is why it is
// a surface of its own rather than another blob of text.

import { closeSync, constants, fstatSync, openSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const PATTERN_ENV = 'FORBIDDEN_TERMS_PATTERN_B64';
const CORPUS_ENV = 'FORBIDDEN_TERMS_CORPUS_B64';
// Commit messages are collected from MERGE_BASE..gate-head. That keeps quoted
// PR prose out, but a feature branch that merges upstream commits also imports
// their trailers into the range; feature branches here do not use that shape.
const ATTRIBUTION_TRAILER = /^co-authored-by[ \t]*:/i;

const ALLOWED_PROSE = path.join(import.meta.dirname, 'forbidden-terms-allowed-prose.txt');

/**
 * The surfaces `scan` reads, by fixed name. EXPORTED so the test can assert the
 * shape of the entries against this object rather than against a copy of it.
 */
export const SURFACES = new Set(['diff', 'names', 'messages', 'branch', 'title', 'body']);

/** Raised for anything that means "the guard could not run" - always exit 2. */
class GuardError extends Error {}

/**
 * Decodes a base64 blob from the environment.
 *
 * An absent or empty value is an ERROR and not an empty pattern. `new
 * RegExp('')` matches every line while some formulations match nothing: one
 * fails every pull request and the other passes every pull request silently.
 */
function decodeRequired(name) {
  const raw = process.env[name];
  if (!raw || raw.trim() === '') {
    throw new GuardError(`${name} is unset or empty. The gate cannot run without it.`);
  }
  let decoded;
  try {
    decoded = Buffer.from(raw.trim(), 'base64').toString('utf8');
  } catch {
    throw new GuardError(`${name} is not valid base64.`);
  }
  if (decoded.trim() === '') {
    throw new GuardError(`${name} decoded to nothing. A rotated or truncated secret is an error.`);
  }
  return decoded.trim();
}

/**
 * The pattern, compiled case-insensitively because the terms are words.
 *
 * Deliberately NOT global. `RegExp.prototype.test` on a `g` regex carries
 * `lastIndex` between calls, so adding `g` here would make every other entry in
 * `scanSurface`'s filter invisible.
 *
 * `'i'` AND NOT `'iu'`. The `u` flag changes case folding on the HAYSTACK, which
 * `PATTERN_SHAPE` cannot constrain: under `iu`, `k` matches U+212A KELVIN SIGN;
 * under `i` it does not. A behavioural case pins this, because `PATTERN_SHAPE`
 * below carries `/u` legitimately and harmonising the two reads like tidying up.
 */
export function compilePattern(source) {
  try {
    return new RegExp(source, 'i');
  } catch (error) {
    // The message of a failed RegExp constructor QUOTES THE PATTERN. Never let
    // it out - report that it did not compile and nothing about what it was.
    throw new GuardError(`The pattern does not compile as a regular expression: ${error.name}.`);
  }
}

/**
 * The only pattern shape this guard accepts: a `|` alternation of literal words
 * over `[A-Za-z0-9 -]`.
 *
 * Inside this alphabet there are no constructs (`\b`, `\d`, quantifiers,
 * classes, groups) whose meaning can differ between regular-expression dialects,
 * nothing can backtrack pathologically, and `alternativesIn` below is exact:
 * counting by splitting on `|` is right for a plain alternation and wrong the
 * moment a group, an escaped pipe or a class containing one appears.
 *
 * It fails CLOSED: a pattern outside this shape is a red self-test with an
 * explanation, never a silently weaker check. If a future pattern genuinely
 * needs a metacharacter, this predicate and `alternativesIn` are what has to
 * change, deliberately and together.
 */
export const PATTERN_SHAPE = /^[A-Za-z0-9 -]+(\|[A-Za-z0-9 -]+)*$/u;

/**
 * How many alternatives a pattern claims.
 *
 * Sound ONLY for a source satisfying {@link PATTERN_SHAPE}, which is why the
 * caller checks that first and skips this when it fails - a count taken from an
 * unconstrained pattern is a plausible number rather than an answer.
 */
export function alternativesIn(source) {
  return source.split('|').length;
}

/** Non-comment, non-blank lines. Shared by both corpora. */
export function corpusLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

/**
 * Added lines of a unified diff, carrying the file and line they land on.
 *
 * Only added lines, because a term being REMOVED is the fix, not the offence.
 *
 * `+++ b/path` is the header rather than an addition, and it is told apart from
 * an addition BY POSITION, not by content: git writes an added line whose text
 * begins `++ ` as `+++ `, which `startsWith('+++ ')` cannot distinguish from a
 * header. Getting that wrong fails in both directions at once - the line is
 * never scanned, and `file` becomes a line of the diff, which the report would
 * then print.
 *
 * Position is taken from the hunk header's own declared counts rather than from
 * `diff --git`, which needs no assumption about which optional lines git chose
 * to emit: `@@ -a,b +c,d @@` says how many lines the hunk owns, so a `+++ `
 * inside that debt is an addition and one after it is discharged is a header.
 */
export function addedLines(diff) {
  const out = [];
  let file = '';
  let lineNumber = 0;
  // How many old-side and new-side lines the current hunk still owes. Zero on
  // both means we are between hunks, which is the only place a header can be.
  let owedOld = 0;
  let owedNew = 0;

  for (const line of diff.split('\n')) {
    const hunk = /^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunk) {
      // A count omitted from the header means one line, not none.
      owedOld = hunk[1] === undefined ? 1 : Number(hunk[1]);
      lineNumber = Number(hunk[2]);
      owedNew = hunk[3] === undefined ? 1 : Number(hunk[3]);
      continue;
    }

    if (owedOld <= 0 && owedNew <= 0) {
      // Between hunks: `diff --git`, `index`, `--- a/path`, `+++ b/path`.
      if (line.startsWith('+++ ')) {
        const target = line.slice(4).trim();
        file = target === '/dev/null' ? '' : target.replace(/^b\//, '');
      }
      continue;
    }

    if (line.startsWith('+')) {
      out.push({ file: file || '(unknown file)', line: lineNumber, text: line.slice(1) });
      lineNumber += 1;
      owedNew -= 1;
      continue;
    }
    // A removed line does not advance the new-file counter.
    if (line.startsWith('-')) {
      owedOld -= 1;
      continue;
    }
    // `\ No newline at end of file` belongs to neither side.
    if (line.startsWith('\\')) continue;
    // Context: it advances both sides.
    lineNumber += 1;
    if (owedNew > 0) owedNew -= 1;
    if (owedOld > 0) owedOld -= 1;
  }
  return out;
}

/** Every surface reduces to this: a list of {file, line, text} to match against. */
function entriesFor(surface, text) {
  if (surface === 'diff') return addedLines(text);
  return text
    .split('\n')
    .map((value, index) => ({ file: surface, line: index + 1, text: value }))
    .filter((entry) => entry.text.trim() !== '');
}

/**
 * Findings carry where and never what. `text` is deliberately dropped here
 * rather than at the print site: a value that is never returned cannot be
 * logged by a later edit that forgets why.
 */
export function scanSurface(pattern, surface, text) {
  return entriesFor(surface, text)
    .filter((entry) => pattern.test(entry.text))
    .map((entry) => ({ surface, file: entry.file, line: entry.line }));
}

function scanAttribution(surface, text) {
  if (surface !== 'messages') return [];
  return entriesFor(surface, text)
    .filter((entry) => ATTRIBUTION_TRAILER.test(entry.text))
    .map((entry) => ({ surface, file: entry.file, line: entry.line }));
}

// ---------------------------------------------------------------------------
// Self-test: the job asserts itself before it asserts anything about the diff
// ---------------------------------------------------------------------------

/**
 * Proves the guard is armed. Without this an empty, rotated or truncated secret
 * would be a silently green pull request.
 *
 * `minCorpus` is written in the workflow IN THE CLEAR. A number is not a term
 * list, and it turns "the secret lost half its entries" from silent into red.
 */
export function selfTest({ pattern, blockCorpus, passCorpus, minCorpus }) {
  const problems = [];

  if (blockCorpus.length < minCorpus) {
    problems.push(
      `the must-block corpus decoded to ${blockCorpus.length} entries, fewer than the ${minCorpus} ` +
        'this workflow expects: the secret is truncated, rotated or stale'
    );
  }

  // The pattern's own shape, and then what the shape makes countable.
  //
  // This closes the direction the corpus check cannot see. The known-positives
  // pass below walks the CORPUS, so it answers "the pattern catches everything
  // the corpus knows about" and is blind to the converse: an alternative added
  // to the pattern with no corresponding entry is never exercised by anything,
  // and a typo in it protects nothing while looking exactly like a term that is
  // guarded.
  //
  // The message never quotes the pattern - the failed-compile path one screen up
  // exists for the same reason - so it names the constraint and the counts.
  if (!PATTERN_SHAPE.test(pattern.source)) {
    problems.push(
      'the pattern is not a plain alternation of literal words over [A-Za-z0-9 -]. ' +
        'That shape is what lets this guard use one value in two regular-expression ' +
        'dialects and count its alternatives; outside it, neither is sound. Rewrite the ' +
        'pattern, or change PATTERN_SHAPE and alternativesIn together and deliberately'
    );
  } else {
    // Every alternative must be exercised by SOME corpus entry, reported by
    // index. A count alone is green on a corpus that piles up on one
    // alternative while another is checked by nothing, which is exactly the
    // state a typo in a new alternative produces.
    //
    // `compilePattern` rather than a second `new RegExp(...)`, so the flags can
    // never drift from the ones the real pattern is built with - and it is safe
    // here only because the shape holds: outside it `acme\` throws and `acme+`
    // compiles into something else.
    const alternatives = pattern.source.split('|');
    const unexercised = alternatives
      .map((alternative, index) =>
        blockCorpus.some((entry) => compilePattern(alternative).test(entry)) ? null : index + 1
      )
      .filter((index) => index !== null);
    if (unexercised.length > 0) {
      problems.push(
        `the must-block corpus exercises no entry for the pattern's alternative(s) at ` +
          `position(s) ${unexercised.join(', ')}: nothing checks that they match anything`
      );
    }

    // The weaker proxy, kept deliberately rather than as a second detector. It
    // enforces one corpus entry per alternative, which is what makes the
    // by-index messages above legible to whoever maintains the corpus - and it
    // catches a corpus authored with fewer entries than terms before anyone has
    // to read an index at all.
    const claimed = alternativesIn(pattern.source);
    if (blockCorpus.length < claimed) {
      problems.push(
        `the pattern claims ${claimed} alternatives and the must-block corpus has ` +
          `${blockCorpus.length} entries, so at least one alternative is checked by nothing`
      );
    }
  }

  // Known positives: every one must be caught. Reported by INDEX, never by value.
  const missed = blockCorpus
    .map((entry, index) => (pattern.test(entry) ? null : index + 1))
    .filter((index) => index !== null);
  if (missed.length > 0) {
    problems.push(
      `the pattern does not match must-block corpus entries at position(s) ${missed.join(', ')}`
    );
  }

  // Known negatives: the repository's own prose. A hit here is an over-broad
  // pattern, which is the failure that gets a gate switched off.
  const tripped = passCorpus
    .map((entry, index) => (pattern.test(entry) ? index + 1 : null))
    .filter((index) => index !== null);
  if (tripped.length > 0) {
    problems.push(
      `the pattern matches this repository's own prose at ${ALLOWED_PROSE} ` +
        `line(s) ${tripped.join(', ')}: it is too broad, and a gate that fires on ` +
        'ordinary documentation is a gate somebody switches off'
    );
  }

  return problems;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function readAllowedProse() {
  try {
    return corpusLines(readFileSync(ALLOWED_PROSE, 'utf8'));
  } catch {
    throw new GuardError(`Cannot read the must-pass corpus at ${ALLOWED_PROSE}.`);
  }
}

function runSelfTest(argv) {
  const flag = argv.indexOf('--min-corpus');
  const minCorpus = flag === -1 ? Number.NaN : Number(argv[flag + 1]);
  if (!Number.isInteger(minCorpus) || minCorpus < 1) {
    throw new GuardError(
      'selftest needs --min-corpus <n>, a positive integer written in the clear.'
    );
  }
  const pattern = compilePattern(decodeRequired(PATTERN_ENV));
  const blockCorpus = corpusLines(decodeRequired(CORPUS_ENV));
  const passCorpus = readAllowedProse();

  const problems = selfTest({ pattern, blockCorpus, passCorpus, minCorpus });
  if (problems.length > 0) {
    for (const problem of problems) process.stderr.write(`forbidden-terms: ${problem}\n`);
    throw new GuardError(
      'The guard failed its own self-test and has reported nothing about this pull request.'
    );
  }
  process.stdout.write(
    `forbidden-terms: armed - pattern compiled, ${blockCorpus.length} known positives all matched, ` +
      `${passCorpus.length} lines of this repository's own prose all clean.\n`
  );
  return 0;
}

/**
 * Reads a DIRECTORY and scans every surface in SURFACES, by fixed name.
 *
 * A directory of fixed names cannot be short-passed. There is no argument to
 * omit, so the coverage is a property of this file rather than of the workflow
 * that calls it - and a surface the collector failed to write is an unreadable
 * file, which is already exit 2.
 */
function runScan(argv) {
  const flag = argv.indexOf('--dir');
  const dir = flag === -1 ? '' : (argv[flag + 1] ?? '');
  if (dir === '') {
    throw new GuardError('scan needs --dir <directory> holding one file per surface.');
  }
  const pattern = compilePattern(decodeRequired(PATTERN_ENV));

  // THE SHAPE IS ENFORCED HERE TOO, AND NOT ONLY IN `selftest`.
  //
  // `PATTERN_SHAPE` is what keeps this regular expression free of the nested
  // quantifiers and ambiguous groups that backtrack exponentially, and every
  // string it is about to run against comes from the pull request. The workflow
  // runs the self-test first, but a caller that runs `scan` without `selftest`
  // gets the check anyway.
  if (!PATTERN_SHAPE.test(pattern.source)) {
    throw new GuardError(
      'the pattern is not a plain alternation of literal words over [A-Za-z0-9 -], ' +
        'and this scan will not run an unconstrained expression over pull-request text'
    );
  }

  // RESOLVE ONCE, THEN CHANGE INTO IT, so the six reads below take the SURFACES
  // constants themselves and nothing built from `--dir`. A missing directory is
  // reported as a missing DIRECTORY rather than as the first surface the loop
  // happened to touch.
  let root;
  try {
    root = realpathSync(dir);
  } catch {
    throw new GuardError(`Cannot read the surface directory ${dir}.`);
  }
  process.chdir(root);

  const findings = [];
  for (const surface of SURFACES) {
    let text;
    let fd;
    try {
      // ONE handle, opened once, checked and read through the same descriptor,
      // so the check and the read cannot resolve the name to different files.
      // `O_NOFOLLOW` makes the kernel refuse a symlink outright; ELOOP is that
      // refusal.
      try {
        fd = openSync(surface, constants.O_RDONLY | constants.O_NOFOLLOW);
      } catch (error) {
        if (error?.code === 'ELOOP') {
          throw new GuardError(
            `The '${surface}' surface is not a regular file. A surface must be a plain file in ${root}.`
          );
        }
        throw error;
      }
      // Still needed after the open: `O_NOFOLLOW` rules out a symlink and
      // nothing else. A directory, a fifo or a device opens fine and would be
      // read as a surface.
      if (!fstatSync(fd).isFile()) {
        throw new GuardError(
          `The '${surface}' surface is not a regular file. A surface must be a plain file in ${root}.`
        );
      }
      text = readFileSync(fd, 'utf8');
    } catch (error) {
      if (error instanceof GuardError) throw error;
      // A surface that cannot be read is an error. Treating it as empty is how
      // a guard reports "clean" about something it never looked at.
      throw new GuardError(`Cannot read the '${surface}' surface from ${root}.`);
    } finally {
      if (fd !== undefined) closeSync(fd);
    }
    findings.push(...scanSurface(pattern, surface, text));
    findings.push(...scanAttribution(surface, text));
  }

  if (findings.length === 0) {
    process.stdout.write(
      `forbidden-terms: clean - ${SURFACES.size} surfaces read, no named external product found and no attribution trailer found in messages.\n`
    );
    return 0;
  }

  process.stderr.write(
    `forbidden-terms: BLOCKED - a named external product or attribution trailer appears on ${findings.length} line(s).\n\n`
  );
  for (const finding of findings) {
    // Only the diff surface has a file of its own; for the others the "file" IS
    // the surface, and `[names] names:1` reads worse than `[names] entry 1`.
    const where =
      finding.file === finding.surface
        ? `entry ${finding.line}`
        : `${finding.file}:${finding.line}`;
    process.stderr.write(`  [${finding.surface}] ${where}\n`);
  }
  process.stderr.write(
    '\nThese repositories are public. Keep third-party product names out of code,\n' +
      'comments, tests, fixtures, docs, commit messages, branch names or pull-request text.\n' +
      'Describe the behaviour and the clinical need instead.\n\n' +
      'The match itself is deliberately not printed: this log is public.\n'
  );
  return 1;
}

function main(argv) {
  const [command, ...rest] = argv;
  try {
    if (command === 'selftest') return runSelfTest(rest);
    if (command === 'scan') return runScan(rest);
    process.stderr.write(
      'Usage: forbidden-terms.mjs selftest --min-corpus <n> | scan --dir <directory>\n'
    );
    return 2;
  } catch (error) {
    if (error instanceof GuardError) {
      process.stderr.write(`forbidden-terms: ${error.message}\n`);
      return 2;
    }
    throw error;
  }
}

// Compared by REAL path, both sides. Node resolves the ESM main entry to its
// realpath while `process.argv[1]` keeps the path as it was typed, so invoked
// through a symlink (the script itself or any parent directory) a lexical
// comparison disagrees, `main` never runs, and the process exits 0 having done
// nothing. The workflow's `scanned` receipt keys on the scan's own output for
// the same reason: a clean exit is not a scan.
//
// Falls back to the lexical pair rather than throwing: a realpath that fails
// means the entry has gone missing, which is not a reason to make importing
// this module for its pure helpers fail at load. Both or neither, so the two
// sides are never one real and one lexical.
const entryPoint = process.argv[1];
if (entryPoint) {
  let entryId = path.resolve(entryPoint);
  let selfId = path.resolve(import.meta.filename);
  try {
    const entryResolved = realpathSync(entryPoint);
    const selfResolved = realpathSync(import.meta.filename);
    entryId = entryResolved;
    selfId = selfResolved;
  } catch {
    // Keep the lexical pair. Wrong through a symlink, which is the behaviour
    // this block replaced, but a comparison that cannot run is not a reason to
    // fail at import.
  }
  if (entryId === selfId) {
    process.exit(main(process.argv.slice(2)));
  }
}

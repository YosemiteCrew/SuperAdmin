# Architecture Decision Records

An ADR captures a single architectural decision: the context that forced it, the decision itself, and the trade-offs accepted. Same process as [Yosemite-Crew's ADR log](https://github.com/YosemiteCrew/Yosemite-Crew/tree/main/docs/adr) — SuperAdmin keeps its own log here because its code (and the decisions specific to it) live in this repo, not in the main monorepo.

## When to write one

Write an ADR when a decision is expensive to reverse or picks between two reasonable designs where the reasoning would otherwise be lost — e.g. a persistence/storage trade-off, an auth model choice, a decision to accept a known race condition or consistency limitation.

## Process

1. Copy [`template.md`](./template.md) to `NNNN-kebab-case-title.md`. Numbers are sequential and never reused.
2. Status starts at `Proposed`; move to `Accepted` once the PR merges.
3. If superseded, mark the old ADR `Superseded by ADR-000X` and link forward rather than deleting it.

## Index

| # | Title | Status | Date |
|---|-------|--------|------|
| [0001](./0001-audit-log-on-supertokens-usermetadata.md) | Audit log persisted in SuperTokens UserMetadata (no dedicated DB, no CAS) | Accepted | 2026-07-01 |

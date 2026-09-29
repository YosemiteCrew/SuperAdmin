# Traffic history

How SuperAdmin's clone and view counts are kept, and what they do and do not mean.

## Why this exists

GitHub's traffic API serves a rolling **14-day window** and discards everything older. No setting
extends it and no export recovers it.

`.github/workflows/traffic.yml` runs daily, takes a snapshot of the window, and folds it into a
permanent history on the orphan `traffic-data` branch.

## Why the totals are not simply added up

Consecutive snapshots overlap by thirteen days, so adding them would roughly double every figure.
The history is a map from **date** to that day's counts. Folding a snapshot writes each of its days
into that map, and a date that is already present is **overwritten, not incremented**: the newer
snapshot is at worst identical and at best more complete.

`scripts/ci/fold-traffic.mjs` is the only place that arithmetic lives, and
`scripts/ci/fold-traffic.test.mjs` pins it. Pull requests that change either run the tests; only
the daily and manual runs collect.

## What the numbers mean

- **Total** is the sum of the per-day counts, starting from the first recorded day (shown on the
  generated summary), not from the first commit. Anything older is gone.
- **Daily-unique** is the sum of GitHub's per-day unique counts. It is not the number of distinct
  people over the period: somebody who clones on two days is unique on each of them.
- The counts include automation (CI checkouts, mirrors, scrapers). They are traffic figures, not an
  audience estimate.

## Where it lives

```text
history/clones.json    date -> { count, uniques }
history/views.json     date -> { count, uniques }
badges/*.json          shields.io endpoint payloads
README.md              a generated summary table
```

The branch carries no application code and is outside the `main` ruleset. The job never pushes to
`main`.

## Failure modes

- **A missed day costs nothing.** It takes fifteen consecutive failures to lose a date.
- **A bad response cannot erase a figure.** Days whose `count` or `uniques` is not a number are
  skipped, so the existing history stays untouched.
- **Without the `TRAFFIC_READ_TOKEN` secret nothing is recorded.** The traffic endpoints need
  `Administration: read`, which `GITHUB_TOKEN` cannot hold. The job stops before fetching, exits
  green, and writes the reason to its run summary. Once the secret is available, any later failure
  goes red.

# Academic Command Center

A personal academic command center. It answers three questions and nothing else:

1. **How am I doing overall?**
2. **What subject needs me most?**
3. **Am I improving or getting worse?**

No accounts, no backend, no AI. Everything you enter stays on your own device.

## Running it

```bash
npm install
npm run dev
```

Then open the URL it prints (defaults to `http://localhost:5173`).

For a production build:

```bash
npm run build     # outputs to dist/
npm run preview   # serves dist/ locally
```

`dist/` must be served over HTTP (`npm run preview`, or any static host). Browsers
refuse to load ES modules from `file://`, so opening `dist/index.html` directly
will not work.

## What it does

**Overview** — your overall standing out of 100, whether it is improving, and a
table of every subject with its rating, performance, trend and priority.

**My Focus** — subjects ranked by how much they need you, each with the specific
reasons the priority engine used and the difficulty you reported yourself.

**Subjects** — add, edit and delete subjects. Personal rating (0-100), current
performance as a percentage and/or letter grade, targets, and why the subject is
hard right now. Ratings can be dragged inline and every dashboard recalculates
immediately.

**Assessments** — test and exam results. Enter score and maximum; the percentage
and letter grade are calculated and fed into your standing and trend.

**Study Time** — log a subject, a date and a duration. Shows this week, last
week, the change, and how your time is split between subjects.

**Goals** — a target percentage or grade for one subject or overall, with the gap
to it tracked for you.

**Settings** — theme, week start, subject management, export, import and reset.

## How the numbers work

Everything is transparent and rule-based. The two things worth knowing:

**Missing information is never counted as zero.** A subject's standing is a
weighted blend of your personal rating (30%), your recorded performance (35%) and
your recent assessments (35%). Whichever of those exist are renormalised to 100%,
and a subject with no information at all reports no score rather than a bad one.

**Priority is a sum of named rules.** Each rule that fires adds points *and* the
sentence shown on My Focus: how far below a comfortable standing you are, the gap
to your target, a declining trend, low self-rating, a weak latest result, a
reported difficulty, and study time that does not match the need. 48+ points is
high priority, 22+ is medium, below that is maintain. A strong, on-target subject
that is not declining can never be marked high priority.

See `src/lib/scoring.ts` and `src/lib/priority.ts` — the rules are short enough to
read in full.

## Your data

Stored in this browser's `localStorage` under the key `acc.data`, as one versioned
JSON document. It survives refreshes, closing the tab and restarting the browser.

**Export data** writes a JSON backup file. **Import data** validates and restores
one, dropping anything malformed rather than failing. **Reset data** clears
everything on this device.

The storage layer is isolated in `src/lib/storage.ts`, so cloud sync could replace
it later without touching the rest of the app.

## Project structure

```
src/
  lib/           domain logic, no React
    types.ts       the data model
    grades.ts      letter grade <-> percentage
    scoring.ts     subject standing, trends, overall status
    priority.ts    the priority engine
    goals.ts       goal progress and gaps
    studyTime.ts   weekly totals and distribution
    storage.ts     persistence, import/export, validation
    utils.ts       dates, formatting, numbers
  state/
    store.tsx      reducer, actions, persistence
    derived.ts     every computed value, memoised in one place
    ui.tsx         current page and global dialogs
    theme.ts       theme application, reduced-motion check
  components/
    ui/            buttons, fields, modal, toasts, indicators
    forms/         subject, assessment, study log and goal dialogs
    layout/        sidebar
  pages/           one file per screen
  styles/          tokens, layout, components, animations
```

`Subject.topics` exists in the data model as the extension point for future
syllabus tracking (subject → syllabus → topic → progress). Nothing in this
version reads or writes it.

## Accessibility

Semantic HTML, a real `<label>` on every control, keyboard-navigable dialogs with
a focus trap and Escape to close, visible focus rings, and full
`prefers-reduced-motion` support — all animation is disabled when the OS asks for
it.

# Academic Command Center

A personal Y9 academic command center. It answers, immediately:

1. **How am I doing overall?** and in every subject
2. **What topics do I actually know?** and what am I weak at
3. **What should I study right now — and why?**
4. **Am I on track for A/A\*?** What exams are coming? Am I improving?

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

**Overview** — overall score, estimated grade against target, syllabus coverage
and study time; what needs attention; today's plan; the subject table; progress;
upcoming exams; coach insights. In that order, so the two questions that matter
are answered without scrolling.

**My Focus** — today's plan plus a ranked list of exactly which topics to study,
how long for, and the rules behind each one. Start a timed session, add it to
today, change it, or ignore it.

**Subjects** — the status table, and a full dashboard per subject: current vs
target, mastery, syllabus progress, biggest weaknesses, strongest areas, recent
assessments, study time, why its priority is what it is, and one recommended
next action.

**Syllabus** — subject → chapter → topic, with a mastery state per topic
(not started / learning / practising / strong / mastered), confidence, difficulty,
exam importance, notes and your own description of what you struggle with.
Filter by weak, not started or due for revision; search across everything.

**Assessments** — results by type (quiz, homework, class test, mock, past paper,
exam), with an optional per-topic breakdown that feeds topic mastery directly.

**Study** — this week, last week, this month, last 30 days, a 28-day trend, and
how your time splits across subjects — including when you are pouring time into
a subject that is already fine while a weak one waits.

**Revision** — spaced review. Studying a topic schedules its next review; a good
session moves it up the interval ladder, a shaky one moves it back.

**Goals** — grade, percentage, syllabus coverage, weekly study time or an exam
result, for one subject or overall, with the gap tracked.

**Exams** — countdowns and readiness. Linked topics rise up your focus list as
the date approaches.

**Settings** — theme, week start, configurable grade thresholds, session length,
daily target, exam horizon, weakness bias, revision intervals, subject
management, export, import and reset.

## How the numbers work

Everything is transparent and rule-based. There is no model anywhere in this
app, and the UI never implies otherwise.

**Missing information is never counted as zero.** The overall score blends
assessment performance (55%) and topic mastery (45%), renormalised over whichever
exists. With no assessments you get a mastery-only score that says so, rather
than an invented performance figure. Subject performance below three results is
labelled provisional.

**Syllabus coverage is deliberately not part of the score.** A Y9 student who
loads a full IGCSE outline has barely covered any of it yet — folding that in
would report "critical" when their actual results are fine. Coverage is shown
as its own figure, and in priority it is judged against your *other* subjects
rather than against 100%.

**Mastery blends what you declare with what you score.** A topic's state sets a
baseline; per-topic assessment results pull it towards the evidence, gaining
weight as results accumulate (capped at an even split).

**Priority and recommendations are sums of named rules.** Every rule that fires
adds points *and* the sentence you see on screen — target gap, low mastery, weak
results, declining trend, overdue revision, an approaching exam, a difficulty you
flagged, uneven study time. Nothing is ever recommended without a reason you can
read.

**The engine proposes, you decide.** Every recommendation can be started,
re-timed, reassigned, reordered, skipped or deleted, and you can add your own
tasks. Overriding it is recorded, not fought.

See `src/lib/priority.ts`, `src/lib/focus.ts`, `src/lib/mastery.ts` and
`src/lib/performance.ts` — the rules are short enough to read in full.

## The Y9 syllabus

`src/data/syllabus.ts` seeds an outline for Mathematics (0580), Physics (0625),
Chemistry (0620), English Language (0500) and Computer Science (0478), taken from
the published Cambridge IGCSE subject content for each code. Nothing is invented:
chapters are the numbered subject-content sections, topics are their listed
subsections.

**It is a starting point, not an authority.** A Y9 scheme of work normally covers
a subset, in a different order, and your school may name things differently. The
app says so on the Syllabus page, and every chapter and topic can be renamed,
reordered, added or deleted. Adding another subject's syllabus means adding an
entry to that one file — no UI code changes.

## Your data

Stored in this browser's `localStorage` under the key `acc.data`, as one versioned
JSON document. It survives refreshes, closing the tab and restarting the browser.

**Version 1 data is migrated, not discarded.** Subjects, assessments, study logs,
goals and settings from the earlier version are carried forward on first load
(`studyLogs` become `studySessions`, goals gain a `kind`), and the pre-upgrade
document is kept under `acc.data.v1.backup` in case anything is needed back.

**Export data** writes a JSON backup file. **Import data** validates and restores
one, dropping anything malformed rather than failing. Where a page cannot deliver
a download — inside a sandboxed embed — the same backup is offered as copyable
text, with a matching paste-to-restore path. **Reset data** clears everything on
this device.

The storage layer is isolated in `src/lib/storage.ts`, so cloud sync could replace
it later without touching the rest of the app.

## Project structure

```
src/
  data/
    syllabus.ts    the Y9 syllabus scaffold (edit here to add subjects)
  lib/             domain logic, no React
    types.ts       the data model
    grades.ts      configurable grade thresholds
    mastery.ts     topic mastery states and blending
    performance.ts assessment performance and trends
    priority.ts    subject priority, with reasons
    focus.ts       topic-level recommendations, with reasons
    revision.ts    spaced review scheduling
    exams.ts       countdowns and readiness
    coach.ts       rule-based insights
    goals.ts       goal progress and gaps
    studyTime.ts   period totals, distribution, daily trend
    search.ts      global search
    storage.ts     persistence, migration, import/export, validation
    utils.ts       dates, formatting, numbers
  state/
    store.tsx      reducer, actions, persistence
    derived.ts     every computed value, memoised in one place
    ui.tsx         current page, subject detail and global dialogs
    theme.ts       theme application, reduced-motion check
  components/
    ui/            buttons, fields, modal, toasts, indicators, search
    forms/         subject, assessment, session, goal, exam, topic, task,
                   session runner, backup
    layout/        sidebar and mobile drawer
  pages/           one file per screen, plus parts/ for shared sections
  styles/          tokens, layout, components, animations
```

## Design

Monochrome-first: near-black and off-white grounds, greys, hairline rules and
restrained type. Colour appears only where it carries meaning — risk, attention,
strong — and stays desaturated. Dark and light are both first class.

## Responsive

Proper layouts rather than shrunken ones: a fixed rail becomes a drawer, the
quick actions become icons, and dense tables become stacked records with labels.
Verified at 390px with no horizontal scroll.

## Accessibility

Semantic HTML, a real `<label>` on every control, keyboard-navigable dialogs with
a focus trap and Escape to close, a keyboard-operable subject table, visible focus
rings, and full `prefers-reduced-motion` support — all animation is disabled when
the OS asks for it.

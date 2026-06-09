# Walk module rework: kid points, dog calendar, care schedule

Date: 2026-06-09
Status: approved design, pending spec review
Module: `app/modules/walk` (Прогулка / Dog Walking)
Branch: `walk-rework`

## Summary

Rework the existing `walk` module so that walking the dog rewards a kid in
proportion to how long the walk lasted, add a dog activity calendar with
statistics, and give parents a recurring care schedule (vaccination,
de-worming, and similar) that surfaces on the same calendar and fires real push
reminders.

The `walk` module is already a single shared module used by both parents and
kids, with a family pool so every member reads and writes the same data and
each record carries an `author`. This rework keeps that model and changes
behaviour on top of it. There is no separate "parent app" and "kids app"
codebase.

## Confirmed decisions

1. **Points = `floor(walk_minutes / 2)`.** The previous fixed per walk reward
   and its parent stepper are removed.
2. **Only a kid who logs a walk earns points.** Any family member can log a
   walk, but a parent logged walk pays nothing. Points credit the family bank
   (the canonical child pool), as today.
3. **Statistics are about the dog,** centred on a month calendar that shows what
   happened with the dog each day across the whole family.
4. **Care schedule is parent managed.** Kids see care dates on the calendar,
   read only.
5. **Real push reminders** for care dates, built now.
6. **One spec, one implementation plan,** built in three phases for review
   checkpoints but planned together.

## Current state (verified)

- `app/modules/walk/module.js` (~817 lines): a 4 step wizard (duration, rating,
  details with command checkboxes and photos, save), plus standalone flows for
  misbehaviour (`behavior` collection) and important events (`events` and
  `eventTypes` collections). Family pooled, both roles can edit.
- Points are server authoritative. The client calls `sdk.points.add(..., "walk_done")`
  and the server reads the reward amount itself from `walk/meta.reward`, ignoring
  the client number. This was a deliberate security fix (commit `f2c8081`,
  child point minting). The rework must preserve that guarantee.
- `points.php` already determines the caller and their role via `rt_user_role()`
  and writes to the family pool via `rt_family_pool_uid()`.
- The app has a full web push pipeline (`rt_notify` -> `rt_push_user` -> `sw.js`)
  that delivers OS notifications even when the app is closed, but **no scheduler**.
  Nothing fires on a future date today.
- No calendar grid exists in any module. It will be built fresh in the `walk`
  module using its own `wk-` CSS conventions. A `calendar` SVG icon already
  ships in `app/core/shell.js` and will be reused.

## Architecture

### Phase 1: duration based points (kid only)

**Data.** Walk entries already store `duration` (minutes) and `author` (name).
Add `authorUid` (the logging user's id) to new entries. Old entries without
`authorUid` simply never qualify for a retroactive claim, which is fine because
they were already paid under the old model.

**Claim flow (claim by entry).**
1. The client saves the walk through the existing data store, unchanged, and
   receives the new entry id.
2. If, and only if, `sdk.role === "child"`, the client claims points by calling
   the points API with a reference to that entry id.
3. The server validates and pays:
   - caller role must be `child` (via `rt_user_role()`); otherwise it is a no
     op that pays 0,
   - the entry must exist in the caller's family pool
     (`module='walk'`, `collection='entries'`, `user_id = rt_family_pool_uid(caller)`),
   - the entry's `authorUid` must equal the caller's user id (a kid can only
     claim their own walk, so a parent logged walk never pays),
   - points = `clamp(floor(duration / 2), 0, 1000)`,
   - idempotency: refuse to pay an entry that already has a `walk_done` ledger
     row referencing its id; return the existing amount instead. This covers
     save-later-then-rate, refresh, and double tap.
   - on success, write one ledger row to the family pool:
     `{ n, reason: "walk_done", src: "walk", kind: "win", ref: <entryId> }`.

**Why this is safe.** The server never trusts a client supplied amount or
duration. It reads the duration from the persisted entry it can see, checks the
author and caller are the same child, and pays each entry at most once. This
keeps the existing anti minting property.

**API contract.**
- `POST /api/points.php` with `{ op: "add", reason: "walk_done", entry: <id> }`.
- Server replaces `rt_points_walk_reward()` with `rt_points_walk_claim($db, $callerUid, $entryId)`
  implementing the rules above. The old `walk/meta.reward` read is removed.
- `sdk.points.add(n, reason, opts)` gains an optional `opts.entry` that is
  forwarded as `entry`. The `n` argument is kept for call site compatibility but
  is ignored by the server for `walk_done`, as it is today. (Confirm the SDK
  exposes the user id for `authorUid`; if not, expose it.)

**UI.** Remove the parent reward stepper from `openSettings`. The puppy toggle in
settings stays. No reward configuration remains.

**Edge cases.**
- A walk under 2 minutes earns 0 points (strict floor).
- Editing a walk's duration after the claim does not change points already paid.
  Award is computed once, at first claim, from the duration at that moment.
- Long or fake walks are a trust matter, not a security hole. The calendar and
  day detail give parents full visibility of every walk and who logged it.

### Phase 1: misbehaviour reachable on both sides

Keep the misbehaviour logging screen exactly as it is. Make its entry point
reachable for both parent and kid independent of puppy mode, so the parent side
is not missing it. The inline behaviour section inside the walk wizard can keep
its current puppy mode gate; only the standalone misbehaviour entry point is
made always available to both roles. No schema change.

### Phase 2: dog calendar and statistics

A new full screen surface inside the `walk` module, opened from a calendar
action added to the module frame header (reusing the shell `calendar` icon).
Available to everyone. Built from data already loaded client side; no new read
endpoint.

**Summary numbers.**
- Top: walks today and total walking time today.
- A period selector (week, month, all time) with: number of walks, total walking
  time, longest walk, and current day streak (consecutive days up to today with
  at least one walk).

**Month calendar.**
- A grid you can page forward and back by month.
- Each day cell shows compact markers for what happened with the dog that day: a
  walk marker, a misbehaviour marker, and a care or event marker. Future days can
  show a care due marker (see Phase 3).
- Tapping a day opens a day detail sheet listing every walk that day (time,
  duration, rating, commands, who walked, points), plus misbehaviour incidents,
  events, and any care due or done that day. This is the "what were we doing with
  the dog, by day" view and it shows the whole family's activity in one place.

**Implementation notes.**
- Aggregate over `entries`, `behavior`, `events`, and (Phase 3) `care`, all
  family pooled, keyed by `day` (`YYYY-MM-DD`).
- Use `sdk.formatDate` and the existing `dayKey` / `pad2` helpers for dates.
- The calendar is a new `step` value (for example `cal`) rendered into the main
  view, with the existing history list still available below or merged into the
  day detail.

### Phase 3: care schedule (parent managed)

A recurring dog care schedule surfaced on the same calendar.

**Data.** New collection `care` (added to `module.json` `collections`,
family pooled). Each care item:

```
{
  type:        "vaccine" | "deworm" | "flea" | "vet" | "groom" | "u_<id>",
  label:       string,            // for custom types, else derived from i18n
  nextDue:     "YYYY-MM-DD",       // the anchor: next occurrence
  cadence:     { unit: "none" | "day" | "week" | "month", every: N },
  note:        string,            // optional, <= 120 chars
  lastDoneDay: "YYYY-MM-DD" | null,
  lastNotified:"YYYY-MM-DD" | null, // occurrence date already pushed, for dedup
  author:      string,
  createdAt:   ...
}
```

Care types reuse the existing system event labels where they overlap
(`vaccine`, `vet`, `groom`) and add `deworm` and `flea`. Custom types reuse the
existing `eventTypes` mechanism (`u_<id>`).

**Management UI (parents only).** A care management screen gated on
`sdk.role === "parent"` (mirroring how `openSettings` gates the current parent
only rows). Parents can add, edit, and delete care items: pick a type, a next
due date, a cadence (one off, or every N days, weeks, or months), and an
optional note. Kids never see this screen; they see the resulting dates on the
calendar, read only.

**Projection onto the calendar.** For the visible month, compute occurrences of
each care item from `nextDue` and `cadence` and place markers. One off items
(`cadence.unit === "none"`) show a single marker on `nextDue`.

**Mark done.** When a care task is marked done it writes a record into the
existing `events` history (`{ day, kinds: [type], note, author, src: "care" }`)
so it appears as done on that day, and `nextDue` advances by the cadence to the
next occurrence after the done date. For a one off item, marking done logs the
event and retires the item.

**Due soon badge.** On module mount, compute the nearest upcoming and any overdue
care across items and show a "due soon / overdue" indicator on the walk module
home. Zero infrastructure, always shown when the app is open.

### Phase 3: real push reminders

There is no cron, so reminders use an opportunistic server side check that
reuses the existing push pipeline. No new scheduler infrastructure.

**Trigger.** Add a server side care check that runs when the app syncs, gated to
at most once per family per day via a stored marker. The check scans the
family's `care` items and, for any occurrence due today or overdue that has not
already been notified (compared against `lastNotified`), calls
`rt_notify($parentUid, "walk", "care_due", { type, day })`. `rt_notify`
automatically fans out to web push via `rt_push_user`, so this delivers an OS
notification even when the app is closed, when VAPID keys are configured.

**Recipients.** Notify the dog's parents (`rt_child_parents`) since they manage
care. The kid does not need the reminder.

**Dedup.** After notifying an occurrence, set `lastNotified` to that occurrence's
date on the care item so it fires once per occurrence.

**Text.** Add a `walk` / `care_due` block to `app/api/_ntf_text.php` with
`{ title, body }` in en, ru, and lv, interpolating the care type label.

**Where it hooks.** The once per day scan is invoked from the sync path (or a
small dedicated `care.php?op=check` called on module mount). The implementation
plan will pick the exact hook after reading `sync.php`; the constraint is: no
cron, runs opportunistically, dedups per family per day and per occurrence.

## Security considerations

- Points stay server authoritative. The server derives the reward from a
  persisted entry, checks role and authorship, and pays each entry once. No
  client supplied amount is trusted.
- Care management writes are gated to parents both in the UI and, because care
  edits go through the generic data store, the server side family and role
  checks already applied by `data.php` continue to apply. The plan will confirm
  that a kid cannot write `care` records (if the generic store allows child
  writes to family pooled collections, add a server side guard so `walk/care`
  is parent write only).
- Push endpoints remain SSRF hardened as today; no change to push transport.

## Internationalisation

All new strings (care type labels `deworm` and `flea`, care management UI,
calendar labels, statistics labels, the due soon badge, and the `care_due` push
text) are added in en, ru, and lv, following the existing `MESSAGES` pattern in
`module.js` and `_ntf_text.php` for the push text.

## Migrations and versioning

- New collection `care` registered in `module.json` `collections`.
- New ledger field `ref` and walk entry field `authorUid` live inside existing
  JSON `data` columns, so no SQL migration is required for those.
- A new `walk` migration file documents the version bump and the `care`
  collection, following the `010 / 014 / 017` walk migration convention.
- `walk/meta.reward` is left in place but unused. No data cleanup needed.
- Bump the module version and update `КОНТЕКСТ.md` per the RobTop subapp
  conventions.

## Testing

- Points: a kid logging a 30 minute walk earns 15 points; a 60 minute walk earns
  30; a 1 minute walk earns 0; a parent logging any walk earns 0; claiming the
  same entry twice pays once; a kid cannot claim a parent authored entry.
- Calendar: days with walks, misbehaviour, and events render the right markers;
  day detail lists the correct records with authors and points; period totals
  and the day streak compute correctly across week, month, and all time.
- Care: a parent can create a recurring item; it projects onto the calendar;
  marking done logs an event and advances the next due date by the cadence; a kid
  cannot open the management screen or write care records.
- Push: a due or overdue care item fires one notification per occurrence to the
  parents; the daily per family gate prevents repeats; with no VAPID keys it is a
  silent no op and the in app bell still records the notification.
- Verify on localhost, then deploy to staging, following the RobTop workflow.

## Out of scope (YAGNI)

- No daily points cap or anti farming throttle.
- No separate per kid point balances; one shared family bank as today.
- No multi dog support; one dog per family.
- No backfill of points for historical walks.
- No new cron or background job infrastructure; reminders are opportunistic.

## Build order

One spec, one plan. Implementation proceeds in three reviewable phases:

1. Phase 1: duration based kid only points, and misbehaviour reachable on both
   sides.
2. Phase 2: dog calendar and statistics.
3. Phase 3: parent managed care schedule with real push reminders.

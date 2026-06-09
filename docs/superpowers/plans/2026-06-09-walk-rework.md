# Walk Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (inline execution, because nearly every client task edits the same file `app/modules/walk/module.js`, so parallel subagents would conflict). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the `walk` module so a kid earns `floor(minutes/2)` points per walk, add a dog activity calendar with statistics, and give parents a recurring care schedule (vaccination, de-worming) that shows on the calendar and fires real push reminders.

**Architecture:** One shared family-pooled module, both roles. Points stay server authoritative: the kid saves a walk through the generic store, then claims via `/api/points.php` referencing the saved entry id; the server derives the amount from the persisted duration, checks role and authorship, and pays each entry once. Calendar and stats are pure client aggregation over already-loaded family data. Care is a parent-write-only collection; reminders use an opportunistic once-per-day-per-family check inside `sync.php` that reuses the existing `rt_notify` -> web-push pipeline.

**Tech Stack:** PHP 8 + MySQL (PDO), vanilla ES5 JS modules, no build step, no test framework.

---

## Verification model (read first)

There is **no automated test framework** in this repo (no phpunit, no jest, no package.json). Do not invent one. Each task is verified by the project's real tools:

- **`node tools/check.js`** from repo root: constitution guardrails G0-G10 and version consistency between `app/index.html` `window.RT_VER` and the changelog. Errors exit 1. Run after every change set.
- **Demo smoke test:** open `app/index.html` in a browser (file:// runs fully client-side via localStorage; `sdk.user.id` is `undefined` in demo, role defaults to `child`). Use this to exercise UI and the kid-side points path.
- **Server paths** (points claim, reverse, data guard, sync care check): run `php -S localhost:8000 -t app` from repo root against a seeded MySQL (`schema.sql` + migrations in `app/api/migrations/`), then exercise with `curl` or the UI. If a local DB is not available, verify by code review plus the demo path, and note it.

**Versioning (guardrail):** the walk feature bumps `app/modules/walk/module.json` `version`, and any app-visible release bumps `app/index.html` `window.RT_VER` with a matching changelog entry. Follow the `anthropic-skills:robtop-new-subapp` skill for the exact version-bump, changelog, and `КОНТЕКСТ.md` mechanics. Run `node tools/check.js` to confirm version sync before each commit that touches `RT_VER`.

**Dashes:** Jeff's house style avoids long dashes in prose. Keep code as-is; keep comments and commit messages plain.

---

## File structure

**Phase 1 (points, delete, misbehaviour):**
- Modify `app/api/_points.php`: replace `rt_points_walk_reward` with `rt_points_walk_claim`; add `rt_points_walk_reverse`; extend `rt_points_write` with an optional `$ref`.
- Modify `app/api/points.php`: rewrite the `walk_done` branch to claim-by-entry; add a `reverse` op.
- Modify `app/core/sdk.js`: thread `opts.entry` through `bankAdd` -> `bankTxn`; add `points.reverse(entryId)`.
- Modify `app/modules/walk/module.js`: stamp `authorUid`; award by duration kid-only; remove reward stepper; always show misbehaviour button; add parent delete on walk detail; new i18n keys.

**Phase 2 (calendar + stats):**
- Modify `app/modules/walk/module.js`: calendar screen, day index, summary stats, day detail; frame calendar action.
- Modify `app/modules/walk/module.css`: calendar grid and stats styles.

**Phase 3 (care + push):**
- Modify `app/modules/walk/module.json`: add `care` collection; bump version.
- Modify `app/api/data.php`: parent-write-only guard for `walk/care`.
- Create `app/api/_care.php`: `rt_care_check($db, $uid)` once-per-day-per-family scan.
- Modify `app/api/sync.php`: invoke `rt_care_check` in its own try/catch.
- Modify `app/api/_ntf_text.php`: add `walk`/`care_due` text in en/ru/lv and `_app['walk']`.
- Modify `app/core/notify.js`: add the matching `walk`/`care_due` client dictionary entry (en/ru/lv).
- Modify `app/modules/walk/module.js`: care types, parent-only care management screen, recurrence math, calendar projection, due-soon badge, mark-done; care i18n.
- Modify `app/modules/walk/module.css`: care rows and badge styles.
- Add a migration note file under `app/api/migrations/` documenting the version and the `care` collection (no DDL needed; `care` lives in the generic `module_data` store).

---

# PHASE 1: duration-based kid-only points, delete, misbehaviour

### Task 1.1: Extend `rt_points_write` with an optional reference

**Files:**
- Modify: `app/api/_points.php:42-54`

- [ ] **Step 1: Add a `$ref` parameter and persist it**

Replace the function (lines 42-54) with:

```php
/** ЕДИНСТВЕННЫЙ писатель леджера очков. Вставляет строку module_data bank/points.
 *  $ref (необяз.) — id записи-источника (прогулки) для идемпотентности начисления/отката. */
function rt_points_write($db, $uid, $n, $reason, $src, $kind, $note = null, $ref = null) {
    $n = (int)$n;
    if ($n >  RT_POINTS_GRANT_MAX) $n =  RT_POINTS_GRANT_MAX; // абсолютный предохранитель
    if ($n < -RT_POINTS_GRANT_MAX) $n = -RT_POINTS_GRANT_MAX;
    $data = ['n' => $n, 'reason' => (string)$reason, 'src' => (string)$src, 'kind' => (string)$kind];
    if ($note !== null && $note !== '') $data['note'] = mb_substr((string)$note, 0, 80);
    if ($ref !== null) $data['ref'] = (int)$ref;
    $st = $db->prepare(
        "INSERT INTO module_data (user_id, module, collection, status, favorite, sort, data, created_at, updated_at)
         VALUES (?, 'bank', 'points', '', 0, 0, ?, NOW(), NOW())"
    );
    $st->execute([(int)$uid, json_encode($data, JSON_UNESCAPED_UNICODE)]);
    return (int)$db->lastInsertId();
}
```

- [ ] **Step 2: Verify nothing else broke**

Run: `node tools/check.js`
Expected: no new errors (existing callers pass 7 args or fewer; `$ref` defaults to null).

- [ ] **Step 3: Commit**

```bash
git add app/api/_points.php
git commit -m "feat(points): rt_points_write accepts optional source ref"
```

---

### Task 1.2: Replace walk reward with claim-by-entry, add reverse

**Files:**
- Modify: `app/api/_points.php` (replace `rt_points_walk_reward`, lines 123-138)

- [ ] **Step 1: Replace `rt_points_walk_reward` with claim + reverse helpers**

Replace lines 123-138 with:

```php
/** Найти строку леджера walk_done для прогулки $entryId в леджере $uid. Возвращает [id,n] или null. */
function rt_points_walk_ledger_row($db, $uid, $entryId, $reason = 'walk_done') {
    $s = $db->prepare(
        "SELECT id, data FROM module_data
         WHERE user_id=? AND module='bank' AND collection='points' AND deleted_at IS NULL"
    );
    $s->execute([(int)$uid]);
    foreach ($s->fetchAll() as $row) {
        $d = $row['data'] !== null ? json_decode($row['data'], true) : null;
        if (is_array($d) && ($d['reason'] ?? '') === $reason && (int)($d['ref'] ?? 0) === (int)$entryId) {
            return ['id' => (int)$row['id'], 'n' => (int)($d['n'] ?? 0)];
        }
    }
    return null;
}

/**
 * Начислить очки за прогулку = floor(duration/2). СЕРВЕРНО, защита от накрутки:
 *  - платим ТОЛЬКО если роль звонящего child (родительская прогулка очков не даёт);
 *  - сумму берём из ДЛИТЕЛЬНОСТИ сохранённой записи (клиентский n игнорируем);
 *  - запись должна принадлежать семье звонящего и быть им же залогирована (authorUid===caller);
 *  - идемпотентно: одну прогулку оплачиваем один раз (по ref).
 * Возвращает ['n'=>очки].
 */
function rt_points_walk_claim($db, $uid, $callerId, $role, $entryId) {
    try {
        if ($role !== 'child') return ['n' => 0, 'skipped' => 'not_child'];
        $entryId = (int)$entryId;
        if ($entryId <= 0) return ['n' => 0, 'skipped' => 'no_entry'];
        $pool = rt_family_pool_uid($db, $uid); // прогулки лежат в общем пуле семьи
        $s = $db->prepare(
            "SELECT data FROM module_data
             WHERE id=? AND user_id=? AND module='walk' AND collection='entries' AND deleted_at IS NULL LIMIT 1"
        );
        $s->execute([$entryId, (int)$pool]);
        $r = $s->fetch();
        if (!$r) return ['n' => 0, 'skipped' => 'not_found'];
        $d = $r['data'] !== null ? json_decode($r['data'], true) : null;
        if (!is_array($d)) return ['n' => 0, 'skipped' => 'bad_entry'];
        if ((int)($d['authorUid'] ?? 0) !== (int)$callerId) return ['n' => 0, 'skipped' => 'not_author'];
        $existing = rt_points_walk_ledger_row($db, $uid, $entryId, 'walk_done');
        if ($existing) return ['n' => $existing['n']]; // уже оплачено — не дублируем
        $dur = (int)($d['duration'] ?? 0);
        $pts = (int)floor($dur / 2);
        if ($pts < 0) $pts = 0; if ($pts > 1000) $pts = 1000;
        if ($pts > 0) rt_points_write($db, $uid, $pts, 'walk_done', 'walk', 'win', null, $entryId);
        return ['n' => $pts];
    } catch (Throwable $e) { return ['n' => 0, 'skipped' => 'error']; }
}

/**
 * Откатить начисление за прогулку (родитель удалил запись). Пишет компенсирующую строку −n.
 * Идемпотентно: если уже откатано или прогулка ничего не дала — n=0.
 * Скоуп $uid уже разрешён в points.php (родитель → выбранный/первый ребёнок).
 */
function rt_points_walk_reverse($db, $uid, $entryId) {
    try {
        $entryId = (int)$entryId;
        if ($entryId <= 0) return ['n' => 0];
        if (rt_points_walk_ledger_row($db, $uid, $entryId, 'walk_reversed')) return ['n' => 0, 'already' => true];
        $orig = rt_points_walk_ledger_row($db, $uid, $entryId, 'walk_done');
        if (!$orig || $orig['n'] <= 0) return ['n' => 0];
        rt_points_write($db, $uid, -$orig['n'], 'walk_reversed', 'walk', 'loss', null, $entryId);
        return ['n' => -$orig['n']];
    } catch (Throwable $e) { return ['n' => 0]; }
}
```

- [ ] **Step 2: Verify guardrails**

Run: `node tools/check.js`
Expected: no new errors. (Note: `rt_points_walk_reward` is now removed; Task 1.3 removes its only caller.)

- [ ] **Step 3: Commit**

```bash
git add app/api/_points.php
git commit -m "feat(points): walk claim by entry (floor(min/2), kid-only) + reverse"
```

---

### Task 1.3: Wire the claim and reverse into `points.php`

**Files:**
- Modify: `app/api/points.php:66-71` (walk_done branch) and add a `reverse` case before `default` (after line 123).

- [ ] **Step 1: Replace the `walk_done` branch**

Replace lines 66-71:

```php
        // 2) награда за прогулку — floor(duration/2), серверно, только ребёнку-автору, один раз
        if ($reason === 'walk_done') {
            $entry = isset($body['entry']) ? (int)$body['entry'] : 0;
            $res = rt_points_walk_claim($db, $uid, (int)$me, $role, $entry);
            rt_json(['ok' => true, 'n' => $res['n']]);
        }
```

- [ ] **Step 2: Add a `reverse` op**

Insert this case immediately before the `default:` (currently line 125):

```php
    case 'reverse': {
        // родитель удалил прогулку → откат начисленных за неё очков (идемпотентно)
        if ($role !== 'parent') rt_json(['error' => 'parent_only'], 403);
        $entry = isset($body['entry']) ? (int)$body['entry'] : 0;
        if ($entry <= 0) rt_json(['error' => 'entry required'], 422);
        $res = rt_points_walk_reverse($db, $uid, $entry);
        rt_json(['ok' => true, 'n' => $res['n']]);
    }
```

- [ ] **Step 3: Verify**

Run: `node tools/check.js`
Expected: no new errors.

Server smoke (if a local DB is available): as a child user, `curl` a walk create via `data.php` then `points.php` `{op:add,reason:walk_done,entry:<id>}` and confirm `n == floor(duration/2)`; repeat the same call and confirm `n` is unchanged (idempotent); as a parent call `{op:add,reason:walk_done,entry:<id>}` and confirm `n==0`.

- [ ] **Step 4: Commit**

```bash
git add app/api/points.php
git commit -m "feat(points): walk_done claims by entry; add parent reverse op"
```

---

### Task 1.4: Thread `entry` through the SDK and add `points.reverse`

**Files:**
- Modify: `app/core/sdk.js:155-160` (`bankTxn`), `app/core/sdk.js:165-180` (`bankAdd`), and the `points` object (`app/core/sdk.js:411-453`).

- [ ] **Step 1: Carry `entry` in `bankTxn`**

In `bankTxn` (lines 155-160), add the `entry` field to `b`:

```js
  function bankTxn(rec){
    if(RT.isDemo()) return dataOp("bank","create","points",{data:rec});
    var b={op:"add", reason:rec.reason, n:rec.n, kind:rec.kind, src:rec.src, note:rec.note||null};
    if(rec.entry!=null) b.entry=rec.entry;
    var pc=parentChild(); if(pc) b.child=pc;
    return API.post("points.php", b);
  }
```

- [ ] **Step 2: Carry `entry` in `bankAdd`**

In `bankAdd` (line 168 area), add after the `rec` object is built and before `var out`:

```js
    var rec = { n:n, reason:String(reason||""), src:String(opts.src||srcMod||""), kind:kind };
    if(opts.note) rec.note = String(opts.note).slice(0,80);
    if(opts.entry!=null) rec.entry = opts.entry;
```

- [ ] **Step 3: Add `points.reverse`**

In the `points` object (after `spend`, near line 435), add:

```js
    // откат начисления за прогулку (родитель удалил запись). Демо: ничего не пишем.
    reverse: function(entryId){
      if(!hasPerm("points")) return Promise.resolve({ ok:false, denied:true });
      if(RT.isDemo()) return Promise.resolve({ ok:true, n:0 });
      var b={op:"reverse", entry:entryId}; var pc=parentChild(); if(pc) b.child=pc;
      return API.post("points.php", b);
    },
```

- [ ] **Step 4: Verify**

Run: `node tools/check.js`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add app/core/sdk.js
git commit -m "feat(sdk): thread entry id through points.add; add points.reverse"
```

---

### Task 1.5: Stamp `authorUid` and award by duration (kid only)

**Files:**
- Modify: `app/modules/walk/module.js` (`entryPayload` 526-531, `afterCreate` 532-538, header comment 6-7).

- [ ] **Step 1: Stamp the author's user id on new entries**

In `entryPayload` (lines 526-531), add `authorUid`:

```js
  function entryPayload(extra){
    var p={ day:dayKey(), time:cur.time||hhmm(), duration:cur.duration, rating:cur.rating,
      commands:(extra&&extra.commands)||[], issues:(extra&&extra.issues)||[],
      photos:cur.photos.slice(), author:(sdk.user&&sdk.user.name)||"",
      authorUid:(sdk.user&&sdk.user.id)||null };
    return p;
  }
```

- [ ] **Step 2: Award `floor(duration/2)` only when the logger is a kid**

Replace `afterCreate` (lines 532-538) with:

```js
  function afterCreate(item,payload,later){
    if(item) entries.unshift(item);
    sdk.events.track("walk_saved",{ duration:payload.duration, rating:payload.rating,
      commands:payload.commands.length, issues:payload.issues.length, photos:payload.photos.length, later:!!later });
    // очки: floor(минут/2), reason walk_done, kind win — ТОЛЬКО когда прогулку логирует ребёнок;
    // сервер пересчитывает сумму из сохранённой записи (см. _points.php rt_points_walk_claim).
    if(sdk.role==="child" && item){
      var pts=Math.floor((parseInt(payload.duration,10)||0)/2);
      if(pts>0) sdk.points.add(pts,"walk_done",{entry:item.id});
    }
    if(later) sdk.ui.toast(t("laterToast"));
  }
```

- [ ] **Step 3: Update the header comment (line 6-7) to describe the new points rule**

Replace the two lines describing the old reward with:

```js
   Очки: floor(минут/2) за прогулку, reason walk_done, kind win (винстрик не трогает) —
   начисляются ТОЛЬКО когда прогулку логирует ребёнок; родительская прогулка очков не даёт.
   Сумму решает сервер из длительности сохранённой записи (см. api/_points.php). См. ГАЙД-очки.md.
```

- [ ] **Step 4: Verify (demo)**

Run: `node tools/check.js`; then open `app/index.html`, log a 30-minute walk, confirm the bank/HUD reflects +15 (demo role is child). Log a 1-minute walk via the numpad and confirm +0.

- [ ] **Step 5: Commit**

```bash
git add app/modules/walk/module.js
git commit -m "feat(walk): award floor(min/2) points, kid-only, server-claimed by entry"
```

---

### Task 1.6: Remove the parent reward stepper from settings

**Files:**
- Modify: `app/modules/walk/module.js` (`openSettings` 580-609).

- [ ] **Step 1: Drop the reward block and its handlers**

In `openSettings`, remove the `if(isParent){ ... reward stepper ... }` block (lines 587-593) and the `minus`/`plus`/`bump` handlers (lines 602-608). Keep the puppy toggle and the close button. Result:

```js
  function openSettings(){
    var node=document.createElement("div");
    var h='<h2>'+esc(t("setTitle"))+'</h2>'
      +'<button type="button" class="wk-setrow" id="wkPuppy"><span class="tx">'+esc(t("puppyLbl"))
      +'<span class="hint">'+esc(t("puppyHint"))+'</span></span>'
      +'<span class="wk-tgl'+(meta.puppy?" on":"")+'"></span></button>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    node.innerHTML=h;
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click",sh.close);
    node.querySelector("#wkPuppy").addEventListener("click",function(){
      var v=meta.puppy?0:1;
      metaSave({puppy:v}).then(function(){ if(!root) return; node.querySelector(".wk-tgl").classList.toggle("on",!!v); renderMain(); });
    });
  }
```

(`metaSave` still persists `reward` from the in-memory default; leaving the field is harmless. The `rewardLbl`/`rewardHint` i18n keys and `REWARD_*` constants become unused; leave them to minimize churn, or remove in a later cleanup.)

- [ ] **Step 2: Verify**

Run: `node tools/check.js`; open `app/index.html`, open walk settings, confirm only the puppy toggle and close button show, and toggling puppy still works.

- [ ] **Step 3: Commit**

```bash
git add app/modules/walk/module.js
git commit -m "feat(walk): remove parent reward stepper (points now duration-based)"
```

---

### Task 1.7: Make the misbehaviour button always available to both roles

**Files:**
- Modify: `app/modules/walk/module.js` (`renderDur` 285-294).

- [ ] **Step 1: Show the behaviour button regardless of puppy mode**

In `renderDur`, change the puppy-gated behaviour button (line 292) to always render:

```js
    h+='<button type="button" class="wk-evtbtn" id="wkEvtBtn"><span class="ic">'+STAR_IC+'</span>'+esc(t("evtBtn"))+'</button>';
    h+='<button type="button" class="wk-behbtn" id="wkBehBtn"><span class="ic">'+WARN_IC+'</span>'+esc(t("behBtn"))+'</button>';
```

(The inline behaviour section inside the walk details stays puppy-gated at `renderDetails` line 364; only the standalone misbehaviour entry becomes always-on, reachable by parent and kid alike.)

- [ ] **Step 2: Verify**

Run: `node tools/check.js`; open `app/index.html`, turn puppy mode OFF, confirm "Behaviour problem" still shows on the home screen and the logging screen works.

- [ ] **Step 3: Commit**

```bash
git add app/modules/walk/module.js
git commit -m "feat(walk): misbehaviour log always available to both roles"
```

---

### Task 1.8: Parent can delete a walk (with points reversal)

**Files:**
- Modify: `app/modules/walk/module.js` (`openDetail` 685-727; click routing; new `deleteWalk`; i18n in all three languages).

- [ ] **Step 1: Add i18n keys (en/ru/lv)**

In each language's `walk` block add, near `aria`:

```js
      delWalk:"Delete walk", delWalkTitle:"Delete this walk?", delWalkToast:"Walk deleted",
```
ru:
```js
      delWalk:"Удалить прогулку", delWalkTitle:"Удалить эту прогулку?", delWalkToast:"Прогулка удалена",
```
lv:
```js
      delWalk:"Dzēst pastaigu", delWalkTitle:"Dzēst šo pastaigu?", delWalkToast:"Pastaiga dzēsta",
```

- [ ] **Step 2: Add the `deleteWalk` function** (place near `openDetail`):

```js
  /* родитель удаляет прогулку: откат очков (серверно, идемпотентно) + мягкое удаление записи */
  function deleteWalk(id, sh){
    sdk.ui.confirm({title:t("delWalkTitle"), ok:t("common.yes"), cancel:t("common.cancel")}).then(function(ok){
      if(!ok) return;
      sdk.points.reverse(id).catch(function(){}).then(function(){
        return sdk.data.remove("entries", id);
      }).then(function(){
        if(!root) return;
        entries=entries.filter(function(e){ return String(e.id)!==String(id); });
        if(sh) sh.close();
        renderMain(); renderList(); hud();
        if(step==="cal") renderCal(); // обновить календарь, если открыт (Phase 2)
        sdk.ui.toast(t("delWalkToast"));
      }).catch(function(){ sdk.ui.toast(t("saveFailed")); });
    });
  }
```

- [ ] **Step 3: Add a parent-only delete button in `openDetail`**

In `openDetail`, change the actions block (lines 710-712) to include a delete button for parents:

```js
    var isParent=sdk.role==="parent"||sdk.isDemo();
    h+='<div class="sheet-actions" style="margin-top:14px">'
      +(!r&&sdk.can("edit")?'<button class="btn btn-primary" id="wkRateNow">'+esc(t("rateBtn"))+'</button>':'')
      +(isParent?'<button class="btn btn-danger" id="wkDelWalk">'+esc(t("delWalk"))+'</button>':'')
      +'<button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
```

Then after `node.querySelector("[data-close]").addEventListener(...)` in `openDetail`, wire it:

```js
    var del=node.querySelector("#wkDelWalk");
    if(del) del.addEventListener("click",function(){ deleteWalk(it.id, sh); });
```

- [ ] **Step 4: Add the `btn-danger` style** if not present

Check `app/modules/walk/module.css` (and core CSS) for `.btn-danger`. If absent, add to `module.css`:

```css
.wk-detail .btn-danger{ background:#ff5d6c; color:#fff; }
```

- [ ] **Step 5: Verify**

Run: `node tools/check.js`; open `app/index.html` (demo treats you as parent in settings via `isDemo`), open a walk's detail, confirm a red Delete button appears, deleting removes the row. Server path: as a real parent, delete a kid-logged walk and confirm a `walk_reversed` ledger row of `-floor(min/2)` appears and the balance returns; delete again (already gone) is safe.

- [ ] **Step 6: Commit**

```bash
git add app/modules/walk/module.js app/modules/walk/module.css
git commit -m "feat(walk): parent can delete a walk; reverses its points"
```

---

### Task 1.9: Bump version, changelog, КОНТЕКСТ, verify Phase 1

**Files:**
- Modify: `app/modules/walk/module.json:4` (version), `app/index.html` (`window.RT_VER` + changelog), `КОНТЕКСТ.md`.

- [ ] **Step 1: Bump module version** in `module.json` from `1.2.0` to `1.3.0`.

- [ ] **Step 2: Bump `window.RT_VER` and add a changelog entry** following `anthropic-skills:robtop-new-subapp` mechanics (the skill documents the exact `RT_VER` format and changelog location). Entry text: walk points now `floor(min/2)`, kid-only; parent can delete walks; misbehaviour available to both.

- [ ] **Step 3: Update `КОНТЕКСТ.md`** with the walk rework status note per the skill.

- [ ] **Step 4: Verify**

Run: `node tools/check.js`
Expected: PASS, version sync OK.

- [ ] **Step 5: Commit**

```bash
git add app/modules/walk/module.json app/index.html КОНТЕКСТ.md
git commit -m "chore(walk): v1.3.0 — duration points, delete, misbehaviour both sides"
```

---

# PHASE 2: dog calendar and statistics

Phase 2 is pure client work in `module.js` and `module.css`. The calendar is a new `step` value `"cal"` rendered into `E.main`, reached from a calendar action in the frame header. All data is the already-loaded `entries`, `behs`, `evts` (and `care` once Phase 3 lands).

### Task 2.1: Add date and aggregation helpers

**Files:**
- Modify: `app/modules/walk/module.js` (helpers near `dayKey`, ~line 164).

- [ ] **Step 1: Add helpers**

```js
  function ymd(y,m,d){ return y+"-"+pad2(m+1)+"-"+pad2(d); } // m: 0..11
  function parseDay(s){ var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||"")); return m?new Date(+m[1],+m[2]-1,+m[3],12,0,0):null; }
  function todayKey(){ return dayKey(); }
  function dayMinus(key,n){ var d=parseDay(key); if(!d) return key; d.setDate(d.getDate()-n); return dayKey(d); }
  /* индекс «что было с собакой» по дню: { 'YYYY-MM-DD': {walks:[], behs:[], evts:[], min:Σ} } */
  function buildDayIndex(){
    var ix={};
    function bucket(k){ if(!ix[k]) ix[k]={walks:[],behs:[],evts:[],min:0}; return ix[k]; }
    entries.forEach(function(it){ var d=dataOf(it); if(d.day){ var b=bucket(d.day); b.walks.push(it); b.min+=parseInt(d.duration,10)||0; } });
    behs.forEach(function(it){ var d=dataOf(it); if(d.day) bucket(d.day).behs.push(it); });
    evts.forEach(function(it){ var d=dataOf(it); if(d.day) bucket(d.day).evts.push(it); });
    return ix;
  }
  /* статистика за период: keys = массив дневных ключей. Возвращает {walks,min,longest,streak}. */
  function statsFor(fromKey){
    var walks=0,min=0,longest=0;
    entries.forEach(function(it){ var d=dataOf(it); if(!d.day) return; if(fromKey && d.day<fromKey) return;
      walks++; var du=parseInt(d.duration,10)||0; min+=du; if(du>longest) longest=du; });
    return { walks:walks, min:min, longest:longest, streak:walkStreak() };
  }
  /* серия календарных дней подряд (до сегодня или вчера) с хотя бы одной прогулкой */
  function walkStreak(){
    var days={}; entries.forEach(function(it){ var d=dataOf(it); if(d.day) days[d.day]=1; });
    var k=todayKey(), n=0;
    if(!days[k]){ k=dayMinus(k,1); if(!days[k]) return 0; }
    while(days[k] && n<366){ n++; k=dayMinus(k,1); }
    return n;
  }
```

- [ ] **Step 2: Verify**

Run: `node tools/check.js`. (No UI yet; this is wiring used by 2.2-2.4.)

- [ ] **Step 3: Commit**

```bash
git add app/modules/walk/module.js
git commit -m "feat(walk): date and day-index helpers for calendar/stats"
```

---

### Task 2.2: Calendar state, frame action, and screen scaffold

**Files:**
- Modify: `app/modules/walk/module.js` (state ~158-159; `mount` frame actions 745; `renderMain` 276-284; `back` 738-744; new `renderCal`; i18n).

- [ ] **Step 1: Add a calendar icon constant and i18n**

Near the other icon constants (~line 139) add:

```js
  var CAL_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/></svg>';
```

i18n (each language `walk` block):

```js
      calTitle:"Dog calendar", statToday:"Today", statWalks:"Walks", statTime:"Time",
      statLongest:"Longest", statStreak:"Day streak", perWeek:"Week", perMonth:"Month", perAll:"All time",
      dayEmpty:"Nothing logged this day", minShort:"{n} min",
```
ru:
```js
      calTitle:"Календарь собаки", statToday:"Сегодня", statWalks:"Прогулок", statTime:"Время",
      statLongest:"Дольше всего", statStreak:"Дней подряд", perWeek:"Неделя", perMonth:"Месяц", perAll:"Всё время",
      dayEmpty:"В этот день записей нет", minShort:"{n} мин",
```
lv:
```js
      calTitle:"Suņa kalendārs", statToday:"Šodien", statWalks:"Pastaigas", statTime:"Laiks",
      statLongest:"Garākā", statStreak:"Dienas pēc kārtas", perWeek:"Nedēļa", perMonth:"Mēnesis", perAll:"Viss laiks",
      dayEmpty:"Šajā dienā nav ierakstu", minShort:"{n} min",
```

- [ ] **Step 2: Add calendar state**

After line 159 add:

```js
  var calMonth=null, calPeriod="week"; // calMonth: Date (1-е число месяца); calPeriod: week|month|all
```

- [ ] **Step 3: Add the calendar frame action**

In `mount`, change `actions` (line 745) to two buttons:

```js
      actions:[
        { icon:CAL_IC, id:"wkCal", label:t("calTitle"), onClick:openCal },
        { icon:GEAR_IC, id:"wkGear", label:t("aria.settings"), onClick:openSettings }
      ]
```

- [ ] **Step 4: Route `step==="cal"` in `renderMain` and handle back**

In `renderMain` (line 276-284) add before the final `renderDetails()`:

```js
    if(step==="cal") return renderCal();
```

In `mount`'s `back` (lines 738-744), add a cal branch first:

```js
        if(step==="cal"){ step="dur"; renderMain(); return; }
```

- [ ] **Step 5: Add `openCal` and a stub `renderCal`**

```js
  function openCal(){
    if(!calMonth){ var n=new Date(); calMonth=new Date(n.getFullYear(), n.getMonth(), 1, 12); }
    step="cal"; renderMain(); window.scrollTo(0,0);
  }
  function renderCal(){
    if(!root||!E.main) return;
    E.main.innerHTML='<div class="wk-cal"><div id="wkCalStats"></div><div id="wkCalGrid"></div></div>';
    renderCalStats(); renderCalGrid();
  }
```

- [ ] **Step 6: Verify**

Run: `node tools/check.js`; open `app/index.html`, tap the calendar icon in the header, confirm the screen swaps in (empty stats/grid for now) and the back arrow returns to the wizard.

- [ ] **Step 7: Commit**

```bash
git add app/modules/walk/module.js
git commit -m "feat(walk): calendar screen scaffold + frame action"
```

---

### Task 2.3: Summary statistics block

**Files:**
- Modify: `app/modules/walk/module.js` (new `renderCalStats`).

- [ ] **Step 1: Implement `renderCalStats`**

```js
  function renderCalStats(){
    var box=E.main&&E.main.querySelector("#wkCalStats"); if(!box) return;
    var ix=buildDayIndex(), today=ix[todayKey()]||{walks:[],min:0};
    var from = calPeriod==="week" ? dayMinus(todayKey(),6) : (calPeriod==="month" ? dayMinus(todayKey(),29) : null);
    var s=statsFor(from);
    function card(lbl,val){ return '<div class="wk-stat"><b>'+esc(val)+'</b><span>'+esc(lbl)+'</span></div>'; }
    var h='<div class="wk-stats today">'
      +card(t("statWalks"), String(today.walks.length))
      +card(t("statTime"), t("minShort",{n:today.min}))
      +'</div>'
      +'<div class="wk-period">'
      +'<button type="button" class="wk-perb'+(calPeriod==="week"?" on":"")+'" data-per="week">'+esc(t("perWeek"))+'</button>'
      +'<button type="button" class="wk-perb'+(calPeriod==="month"?" on":"")+'" data-per="month">'+esc(t("perMonth"))+'</button>'
      +'<button type="button" class="wk-perb'+(calPeriod==="all"?" on":"")+'" data-per="all">'+esc(t("perAll"))+'</button>'
      +'</div>'
      +'<div class="wk-stats">'
      +card(t("statWalks"), String(s.walks))
      +card(t("statTime"), t("minShort",{n:s.min}))
      +card(t("statLongest"), t("minShort",{n:s.longest}))
      +card(t("statStreak"), String(s.streak))
      +'</div>';
    box.innerHTML='<div class="wk-sect">'+esc(t("statToday"))+'</div>'+h;
  }
```

- [ ] **Step 2: Route the period buttons** in `E.onRootClick` (add near the top of the edit branch, before the `[data-dur]` handler):

```js
      b=e.target.closest("[data-per]"); if(b){ calPeriod=b.getAttribute("data-per"); renderCalStats(); return; }
```

- [ ] **Step 3: Verify**

Run: `node tools/check.js`; in the demo app log a couple of walks, open the calendar, confirm Today and the period cards compute, and switching Week/Month/All updates the totals.

- [ ] **Step 4: Commit**

```bash
git add app/modules/walk/module.js
git commit -m "feat(walk): calendar summary statistics (today + period)"
```

---

### Task 2.4: Month grid and day detail

**Files:**
- Modify: `app/modules/walk/module.js` (new `renderCalGrid`, `openDayDetail`; month nav + day routing; i18n month nav labels reuse `sdk.formatDate`).

- [ ] **Step 1: Implement `renderCalGrid`** (Monday-first month grid with markers)

```js
  function renderCalGrid(){
    var box=E.main&&E.main.querySelector("#wkCalGrid"); if(!box) return;
    var ix=buildDayIndex();
    var y=calMonth.getFullYear(), m=calMonth.getMonth();
    var first=new Date(y,m,1,12), startDow=(first.getDay()+6)%7; // Monday=0
    var daysIn=new Date(y,m+1,0).getDate();
    var title=sdk.formatDate(first,{month:"long", year:"numeric"});
    var h='<div class="wk-calnav"><button type="button" class="wk-navb" data-mon="-1">‹</button>'
      +'<b>'+esc(title)+'</b><button type="button" class="wk-navb" data-mon="1">›</button></div>'
      +'<div class="wk-grid">';
    var i; for(i=0;i<startDow;i++) h+='<span class="wk-cell empty"></span>';
    for(i=1;i<=daysIn;i++){
      var key=ymd(y,m,i), c=ix[key];
      var dots='';
      if(c){ if(c.walks.length) dots+='<i class="dot walk"></i>'; if(c.behs.length) dots+='<i class="dot beh"></i>'; if(c.evts.length) dots+='<i class="dot evt"></i>'; }
      var isToday=key===todayKey();
      h+='<button type="button" class="wk-cell'+(isToday?" today":"")+(c?" has":"")+'" data-day="'+esc(key)+'"><span class="dn">'+i+'</span><span class="dots">'+dots+'</span></button>';
    }
    h+='</div>'
      +'<div class="wk-legend"><span><i class="dot walk"></i>'+esc(t("statWalks"))+'</span>'
      +'<span><i class="dot beh"></i>'+esc(t("behBtn"))+'</span>'
      +'<span><i class="dot evt"></i>'+esc(t("evtBtn"))+'</span></div>';
    box.innerHTML=h;
  }
```

- [ ] **Step 2: Implement `openDayDetail(key)`** (reuse existing row builders; parent delete on walks)

```js
  function openDayDetail(key){
    var ix=buildDayIndex(), c=ix[key]||{walks:[],behs:[],evts:[]};
    var node=document.createElement("div"); node.className="wk-detail wk-day";
    var h='<h2>'+esc(fmtDay(key))+'</h2>';
    if(!c.walks.length && !c.behs.length && !c.evts.length){
      h+='<p class="wk-det-norate">'+esc(t("dayEmpty"))+'</p>';
    } else {
      h+='<div class="wk-list">'
        +c.walks.map(walkRowHtml).join("")
        +c.behs.map(behRowHtml).join("")
        +c.evts.map(evtRowHtml).join("")
        +'</div>';
    }
    h+='<div class="sheet-actions" style="margin-top:14px"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    node.innerHTML=h;
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click",sh.close);
    // строки в шторке: открыть детали записи (делегируем тем же открывашкам)
    node.addEventListener("click",function(e){
      var row=e.target.closest(".wk-row"); if(!row) return;
      sh.close();
      if(row.getAttribute("data-bid")) openBehDetail(row.getAttribute("data-bid"));
      else if(row.getAttribute("data-eid")) openEvtDetail(row.getAttribute("data-eid"));
      else openDetail(row.getAttribute("data-id"));
    });
  }
```

- [ ] **Step 3: Route month nav and day taps** in `E.onRootClick` (after the `[data-per]` handler):

```js
      b=e.target.closest("[data-mon]"); if(b){ calMonth=new Date(calMonth.getFullYear(), calMonth.getMonth()+parseInt(b.getAttribute("data-mon"),10), 1, 12); renderCalGrid(); return; }
      b=e.target.closest("[data-day]"); if(b){ openDayDetail(b.getAttribute("data-day")); return; }
```

- [ ] **Step 4: Verify**

Run: `node tools/check.js`; in demo, log walks/misbehaviour/events on a few days, open the calendar, confirm dots appear on the right days, month nav works, tapping a day lists its records and tapping a record opens its detail.

- [ ] **Step 5: Commit**

```bash
git add app/modules/walk/module.js
git commit -m "feat(walk): month grid with day markers and day detail"
```

---

### Task 2.5: Calendar and stats CSS

**Files:**
- Modify: `app/modules/walk/module.css` (append calendar styles).

- [ ] **Step 1: Append styles** following the existing `wk-` palette (mint accent `#38e8a0`, gold for events, warn red for behaviour). Provide: `.wk-stats` (flex row of `.wk-stat` cards), `.wk-period`/`.wk-perb` (segmented control, `.on` = mint), `.wk-calnav`/`.wk-navb`, `.wk-grid` (CSS grid `grid-template-columns:repeat(7,1fr)`), `.wk-cell` (`.today` ring, `.has` emphasis, `.empty` blank), `.wk-cell .dots .dot` (`.walk` mint, `.beh` warn red, `.evt` gold), `.wk-legend`. Match radii, spacing, and font sizes used elsewhere in the file.

- [ ] **Step 2: Verify**

Open `app/index.html`, confirm the calendar is legible on a narrow (phone-width) viewport: cells square-ish, dots visible, period control and nav usable.

- [ ] **Step 3: Commit**

```bash
git add app/modules/walk/module.css
git commit -m "feat(walk): calendar and stats styling"
```

---

### Task 2.6: Bump version, verify Phase 2

- [ ] **Step 1:** Bump `module.json` to `1.4.0`; bump `window.RT_VER` + changelog (calendar + stats); update `КОНТЕКСТ.md`.
- [ ] **Step 2:** Run `node tools/check.js` (PASS, version sync OK).
- [ ] **Step 3:** Commit `chore(walk): v1.4.0 — dog calendar and statistics`.

---

# PHASE 3: care schedule and push reminders

### Task 3.1: Register the `care` collection and parent-write guard

**Files:**
- Modify: `app/modules/walk/module.json:12` (collections).
- Modify: `app/api/data.php` (after the bank/points guard, ~line 44).

- [ ] **Step 1: Add `care` to collections**

```json
  "data": { "store": "generic", "collections": ["entries", "behavior", "events", "commands", "issues", "eventTypes", "meta", "care"] },
```

- [ ] **Step 2: Add a parent-write-only guard for `walk/care`** in `data.php`, immediately after the bank/points guard (line 44):

```php
// Расписание ухода (walk/care) — пишет ТОЛЬКО родитель; дети видят на календаре (read).
if ($module === 'walk' && $coll === 'care' && in_array($op, $writes, true) && $role !== 'parent') {
    rt_json(['error' => 'forbidden', 'message' => 'care is parent-write-only'], 403);
}
```

- [ ] **Step 3: Verify**

Run: `node tools/check.js`. Server (if DB available): as a child, `POST data.php {op:create,module:walk,collection:care,...}` returns 403; as a parent it succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/modules/walk/module.json app/api/data.php
git commit -m "feat(walk): register care collection (parent-write-only)"
```

---

### Task 3.2: Care types, recurrence math, and i18n

**Files:**
- Modify: `app/modules/walk/module.js` (constants ~132; helpers; i18n).

- [ ] **Step 1: Add care constants near `SYS_EVT`**

```js
  var CARE_TYPES=["vaccine","deworm","flea","vet","groom"]; // + свои типы из eventTypes (u_<id>)
  var CARE_UNITS=["none","day","week","month"];
```

- [ ] **Step 2: Add care state** after line 159: `var careItems=[];`

- [ ] **Step 3: Load care** in `load()` — add `sdk.data.list("care")` to the `Promise.all` array and assign:

In the `Promise.all([...])` (lines 190-193) append `, sdk.data.list("care")` as `rr[7]`, then after the other assignments:

```js
      careItems=(rr[7]||[]).slice().sort(function(a,b){ return (dataOf(a).nextDue||"")<(dataOf(b).nextDue||"")?-1:1; });
```

- [ ] **Step 4: Add care label + recurrence helpers**

```js
  function careLabel(type){
    if(CARE_TYPES.indexOf(type)>=0) return t("care."+type);
    if(/^u_/.test(type)) return evtLabel(type); // свои типы — из eventTypes
    return "?";
  }
  /* следующая дата после доне по каденсу. unit none → null (разовое). */
  function careAdvance(key, cadence){
    var d=parseDay(key), c=cadence||{}; if(!d||!c.unit||c.unit==="none") return null;
    var n=Math.max(1, parseInt(c.every,10)||1);
    if(c.unit==="day") d.setDate(d.getDate()+n);
    else if(c.unit==="week") d.setDate(d.getDate()+7*n);
    else if(c.unit==="month") d.setMonth(d.getMonth()+n);
    return dayKey(d);
  }
  /* occurrences ухода в видимом месяце [first..last] (для маркеров календаря) */
  function careOccurrencesInMonth(item, y, m){
    var d=dataOf(item), out=[], key=d.nextDue; if(!key) return out;
    var lastKey=ymd(y,m,new Date(y,m+1,0).getDate());
    var guard=0;
    while(key && key<=lastKey && guard<400){
      if(key>=ymd(y,m,1)) out.push(key);
      var nx=careAdvance(key, d.cadence); if(!nx||nx===key) break; key=nx; guard++;
    }
    return out;
  }
  /* ближайший срок ухода: {item, day, overdue} или null — для бейджа */
  function careNextDue(){
    var best=null, today=todayKey();
    careItems.forEach(function(it){ var k=dataOf(it).nextDue; if(!k) return;
      if(!best || k<best.day) best={item:it, day:k, overdue:k<today}; });
    return best;
  }
```

- [ ] **Step 5: Add care i18n (en/ru/lv)**

en:
```js
      careTitle:"Care dates", careAdd:"Add care date", careType:"Type", careNext:"Next date",
      careRepeat:"Repeat", careEvery:"every", careNote:"Note", careDone:"Mark done", careDelete:"Delete",
      careDueSoon:"{label} due {day}", careOverdue:"{label} overdue since {day}",
      careDoneToast:"Care logged", careNeedType:"Pick a type first",
      care:{ vaccine:"Vaccination", deworm:"De-worming", flea:"Flea / tick", vet:"Vet checkup", groom:"Grooming" },
      unit:{ none:"No repeat", day:"days", week:"weeks", month:"months" },
```
ru:
```js
      careTitle:"Уход и даты", careAdd:"Добавить дату ухода", careType:"Тип", careNext:"Следующая дата",
      careRepeat:"Повтор", careEvery:"каждые", careNote:"Заметка", careDone:"Отметить выполнено", careDelete:"Удалить",
      careDueSoon:"{label} — {day}", careOverdue:"{label} просрочено с {day}",
      careDoneToast:"Уход записан", careNeedType:"Сначала выбери тип",
      care:{ vaccine:"Прививка", deworm:"Дегельминтизация", flea:"От блох / клещей", vet:"Осмотр у ветеринара", groom:"Груминг" },
      unit:{ none:"Без повтора", day:"дней", week:"недель", month:"месяцев" },
```
lv:
```js
      careTitle:"Aprūpes datumi", careAdd:"Pievienot aprūpes datumu", careType:"Veids", careNext:"Nākamais datums",
      careRepeat:"Atkārtot", careEvery:"katras", careNote:"Piezīme", careDone:"Atzīmēt izpildītu", careDelete:"Dzēst",
      careDueSoon:"{label} — {day}", careOverdue:"{label} nokavēts kopš {day}",
      careDoneToast:"Aprūpe pierakstīta", careNeedType:"Vispirms izvēlies veidu",
      care:{ vaccine:"Vakcinācija", deworm:"Dehelmintizācija", flea:"Pret blusām / ērcēm", vet:"Veterinārā pārbaude", groom:"Kopšana" },
      unit:{ none:"Bez atkārtošanas", day:"dienas", week:"nedēļas", month:"mēneši" },
```

- [ ] **Step 6: Reset/teardown** — add `careItems=[]` to the resets in `mount` (line 732) and `unmount` (line 802).

- [ ] **Step 7: Verify**

Run: `node tools/check.js`. (Helpers used by 3.3-3.4.)

- [ ] **Step 8: Commit**

```bash
git add app/modules/walk/module.js
git commit -m "feat(walk): care types, recurrence helpers, i18n, load care"
```

---

### Task 3.3: Parent-only care management screen

**Files:**
- Modify: `app/modules/walk/module.js` (new `openCare`, `careForm`; routing).

- [ ] **Step 1: Add an entry point** — in `renderCal`, after building the stats/grid, append a parent-only "Care dates" button; route it. Add to `renderCal`'s HTML a trailing button when `sdk.role==="parent"||sdk.isDemo()`:

```js
    if(sdk.role==="parent"||sdk.isDemo())
      E.main.querySelector(".wk-cal").insertAdjacentHTML("beforeend",
        '<button type="button" class="wk-evtbtn" id="wkCareBtn"><span class="ic">'+CAL_IC+'</span>'+esc(t("careTitle"))+'</button>');
```

Route in `E.onRootClick`:

```js
      if(e.target.closest("#wkCareBtn")){ openCare(); return; }
```

- [ ] **Step 2: Implement `openCare`** (list + add/edit/delete via a sheet)

```js
  function openCare(){
    var node=document.createElement("div"); node.className="wk-detail wk-care";
    function rows(){
      if(!careItems.length) return '<p class="wk-det-norate">'+esc(t("dayEmpty"))+'</p>';
      return careItems.map(function(it){ var d=dataOf(it);
        var rep=(d.cadence&&d.cadence.unit&&d.cadence.unit!=="none")
          ? (t("careEvery")+" "+(d.cadence.every||1)+" "+t("unit."+d.cadence.unit)) : t("unit.none");
        return '<div class="wk-care-row" data-care="'+esc(it.id)+'"><div class="m"><b>'+esc(careLabel(d.type))+'</b>'
          +'<span>'+esc(fmtDay(d.nextDue))+' · '+esc(rep)+'</span></div>'
          +'<button type="button" class="wk-care-done" data-caredone="'+esc(it.id)+'">'+esc(t("careDone"))+'</button></div>';
      }).join("");
    }
    node.innerHTML='<h2>'+esc(t("careTitle"))+'</h2><div id="wkCareList">'+rows()+'</div>'
      +'<button type="button" class="wk-chip add" id="wkCareAdd">＋ '+esc(t("careAdd"))+'</button>'
      +'<div class="sheet-actions" style="margin-top:14px"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click",sh.close);
    node.addEventListener("click",function(e){
      var b;
      if(e.target.closest("#wkCareAdd")){ sh.close(); careForm(null); return; }
      b=e.target.closest("[data-caredone]"); if(b){ careMarkDone(b.getAttribute("data-caredone")); sh.close(); return; }
      b=e.target.closest("[data-care]"); if(b){ sh.close(); careForm(b.getAttribute("data-care")); return; }
    });
  }
```

- [ ] **Step 3: Implement `careForm(id)`** (create or edit one item)

```js
  function careForm(id){
    var it=null,i; if(id){ for(i=0;i<careItems.length;i++){ if(String(careItems[i].id)===String(id)){ it=careItems[i]; break; } } }
    var d=it?dataOf(it):{ type:"vaccine", nextDue:todayKey(), cadence:{unit:"none",every:1}, note:"" };
    var node=document.createElement("div"); node.className="wk-detail wk-care";
    function opts(list,sel,pfx){ return list.map(function(k){ return '<option value="'+esc(k)+'"'+(k===sel?" selected":"")+'>'+esc(pfx?t(pfx+k):k)+'</option>'; }).join(""); }
    var typeOpts=CARE_TYPES.map(function(k){ return '<option value="'+k+'"'+(k===d.type?" selected":"")+'>'+esc(t("care."+k))+'</option>'; }).join("")
      + evtTypes.map(function(r){ var v="u_"+r.id; return '<option value="'+esc(v)+'"'+(v===d.type?" selected":"")+'>'+esc(dataOf(r).label||"?")+'</option>'; }).join("");
    var cu=(d.cadence&&d.cadence.unit)||"none", ce=(d.cadence&&d.cadence.every)||1;
    node.innerHTML='<h2>'+esc(t("careAdd"))+'</h2>'
      +'<div class="wk-sect">'+esc(t("careType"))+'</div><select class="wk-time" id="wkCareType">'+typeOpts+'</select>'
      +'<div class="wk-sect">'+esc(t("careNext"))+'</div><input type="date" class="wk-time" id="wkCareDate" value="'+esc(d.nextDue||todayKey())+'">'
      +'<div class="wk-sect">'+esc(t("careRepeat"))+'</div><div class="wk-when">'
      +'<select class="wk-time" id="wkCareUnit">'+opts(CARE_UNITS,cu,"unit.")+'</select>'
      +'<input type="number" class="wk-time" id="wkCareEvery" min="1" max="60" value="'+esc(String(ce))+'">'
      +'</div>'
      +'<div class="wk-sect">'+esc(t("careNote"))+'</div><input type="text" class="wk-note" id="wkCareNote" maxlength="120" value="'+esc(d.note||"")+'">'
      +'<div class="sheet-actions" style="margin-top:14px">'
      +(it?'<button class="btn btn-danger" id="wkCareDel">'+esc(t("careDelete"))+'</button>':'')
      +'<button class="btn btn-cancel" data-close>'+esc(t("common.cancel"))+'</button>'
      +'<button class="btn btn-primary" id="wkCareSave">'+esc(t("common.save"))+'</button></div>';
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click",sh.close);
    node.querySelector("#wkCareSave").addEventListener("click",function(){
      var type=node.querySelector("#wkCareType").value;
      var unit=node.querySelector("#wkCareUnit").value;
      var every=Math.max(1,Math.min(60,parseInt(node.querySelector("#wkCareEvery").value,10)||1));
      var dateEl=node.querySelector("#wkCareDate"), nd=/^\d{4}-\d{2}-\d{2}$/.test(dateEl.value)?dateEl.value:todayKey();
      var payload={ type:type, nextDue:nd, cadence:{unit:unit,every:every},
        note:(node.querySelector("#wkCareNote").value||"").trim().slice(0,120),
        author:(sdk.user&&sdk.user.name)||"" };
      var p = it ? sdk.data.update("care", it.id, payload).then(function(){ it.data=Object.assign({},it.data,payload); })
                 : sdk.data.create("care", payload).then(function(item){ if(item) careItems.push(item); });
      p.then(function(){ if(!root) return; sh.close(); careItems.sort(function(a,b){ return (dataOf(a).nextDue||"")<(dataOf(b).nextDue||"")?-1:1; }); renderCal(); }).catch(function(){ sdk.ui.toast(t("saveFailed")); });
    });
    var del=node.querySelector("#wkCareDel");
    if(del) del.addEventListener("click",function(){
      sdk.data.remove("care", it.id).then(function(){ careItems=careItems.filter(function(x){ return String(x.id)!==String(it.id); }); sh.close(); renderCal(); }).catch(function(){ sdk.ui.toast(t("saveFailed")); });
    });
  }
```

- [ ] **Step 4: Verify**

Run: `node tools/check.js`; in demo (treated as parent), open calendar -> Care dates, add a "De-worming every 3 months" item, confirm it lists; edit and delete it.

- [ ] **Step 5: Commit**

```bash
git add app/modules/walk/module.js
git commit -m "feat(walk): parent-only care schedule management screen"
```

---

### Task 3.4: Project care onto the calendar + due-soon badge + mark-done

**Files:**
- Modify: `app/modules/walk/module.js` (`renderCalGrid` markers, `openDayDetail` care, `renderDur` badge, new `careMarkDone`).

- [ ] **Step 1: Add care markers to the grid** — in `renderCalGrid`, before building cells, compute care occurrences for the visible month:

```js
    var careDays={}; careItems.forEach(function(it){ careOccurrencesInMonth(it, y, m).forEach(function(k){ careDays[k]=1; }); });
```

Then in the cell loop, add a care dot:

```js
      if(careDays[key]) dots+='<i class="dot care"></i>';
```

Add a legend entry: `'<span><i class="dot care"></i>'+esc(t("careTitle"))+'</span>'`.

- [ ] **Step 2: Show care due in `openDayDetail`** — after building `c.evts` rows, append any care due that day:

```js
      var careHere=careItems.filter(function(it){ return dataOf(it).nextDue===key; });
      if(careHere.length){
        h+='<div class="wk-sect">'+esc(t("careTitle"))+'</div><div class="wk-chips ro">';
        careHere.forEach(function(it){ h+='<span class="wk-chip gold on">'+esc(careLabel(dataOf(it).type))+'</span>'; });
        h+='</div>';
      }
```

(Insert this into the non-empty branch and also treat a day with only care due as non-empty: change the emptiness test to also consider `careHere`.)

- [ ] **Step 3: Due-soon badge on the home screen** — in `renderDur`, after the buttons, append a badge if care is due within 7 days or overdue:

```js
    var nd=careNextDue();
    if(nd){
      var soon=nd.day<=dayMinus(todayKey(),-7); // в пределах недели вперёд или просрочено
      if(nd.overdue || soon){
        var msg=nd.overdue ? t("careOverdue",{label:careLabel(dataOf(nd.item).type), day:fmtDay(nd.day)})
                           : t("careDueSoon",{label:careLabel(dataOf(nd.item).type), day:fmtDay(nd.day)});
        h+='<div class="wk-carebadge'+(nd.overdue?" overdue":"")+'">'+WARN_IC+'<span>'+esc(msg)+'</span></div>';
      }
    }
```

(Note: `dayMinus(todayKey(),-7)` returns the key 7 days ahead; compare `nd.day <= that`.)

- [ ] **Step 4: Implement `careMarkDone(id)`** — log an event and advance the next due date:

```js
  function careMarkDone(id){
    var it=null,i; for(i=0;i<careItems.length;i++){ if(String(careItems[i].id)===String(id)){ it=careItems[i]; break; } }
    if(!it) return;
    var d=dataOf(it), today=todayKey();
    // 1) запись в историю событий (видна на календаре как «сделано»)
    sdk.data.create("events",{ day:today, time:hhmm15(), kinds:[d.type],
      note:d.note||"", author:(sdk.user&&sdk.user.name)||"", src:"care" }).then(function(item){ if(item) evts.unshift(item); });
    // 2) сдвинуть следующий срок (разовое — снять с расписания)
    var nx=careAdvance(d.nextDue||today, d.cadence);
    if(nx){
      sdk.data.update("care", it.id, {nextDue:nx, lastDoneDay:today, lastNotified:null}).then(function(){ it.data=Object.assign({},it.data,{nextDue:nx,lastDoneDay:today,lastNotified:null}); if(root) renderCal(); });
    } else {
      sdk.data.remove("care", it.id).then(function(){ careItems=careItems.filter(function(x){ return String(x.id)!==String(it.id); }); if(root) renderCal(); });
    }
    sdk.ui.toast(t("careDoneToast"));
  }
```

- [ ] **Step 5: Verify**

Run: `node tools/check.js`; in demo, add a care item due today, confirm: a care dot on the calendar, the home-screen due badge, the day detail shows it, and "Mark done" logs an event and advances the date (or removes a one-off).

- [ ] **Step 6: Commit**

```bash
git add app/modules/walk/module.js
git commit -m "feat(walk): care on calendar, due badge, mark-done advances schedule"
```

---

### Task 3.5: Care styles

**Files:**
- Modify: `app/modules/walk/module.css`.

- [ ] **Step 1: Append styles** for `.wk-care-row` (flex, label + sub + done button), `.wk-care-done` (mint pill), `.wk-carebadge` (rounded info row, gold; `.overdue` warn red), `.dot.care` (gold, distinct from `.evt` if needed use a ring), `select.wk-time` (match input styling). Follow existing conventions.

- [ ] **Step 2: Verify** in `app/index.html` on phone width.

- [ ] **Step 3: Commit**

```bash
git add app/modules/walk/module.css
git commit -m "feat(walk): care schedule styling"
```

---

### Task 3.6: Server care check (once per day per family)

**Files:**
- Create: `app/api/_care.php`.
- Modify: `app/api/sync.php` (invoke after fingerprints, ~line 116, in try/catch).

- [ ] **Step 1: Create `app/api/_care.php`**

```php
<?php
/**
 * Оппортунистическая проверка расписания ухода (нет крона). Зовётся из sync.php на каждом
 * поллере, но РАБОТАЕТ не чаще раза в день на семью (гейт walk/meta.lastCareCheck).
 * Для каждого пункта walk/care с nextDue <= сегодня и lastNotified != nextDue:
 * шлём rt_notify(родителю,'walk','care_due',{type,day}) (авто-веб-пуш) и ставим lastNotified=nextDue.
 */

/** Прочитать единственную строку walk/meta пула; вернуть [id|null, dataArray]. */
function rt_walk_meta_row($db, $pool) {
    $s = $db->prepare(
        "SELECT id, data FROM module_data WHERE user_id=? AND module='walk' AND collection='meta' AND deleted_at IS NULL ORDER BY id DESC LIMIT 1"
    );
    $s->execute([(int)$pool]);
    $r = $s->fetch();
    if (!$r) return [null, []];
    $d = $r['data'] !== null ? json_decode($r['data'], true) : [];
    return [(int)$r['id'], is_array($d) ? $d : []];
}

function rt_care_check($db, $uid) {
    try {
        $pool = rt_family_pool_uid($db, $uid);
        $tz = function_exists('rt_points_tz') ? rt_points_tz() : new DateTimeZone('Europe/Riga');
        $today = (new DateTime('now', $tz))->format('Y-m-d');

        // гейт: раз в день на семью
        list($metaId, $meta) = rt_walk_meta_row($db, $pool);
        if (isset($meta['lastCareCheck']) && $meta['lastCareCheck'] === $today) return;
        $meta['lastCareCheck'] = $today;
        if ($metaId !== null) {
            $db->prepare("UPDATE module_data SET data=?, updated_at=NOW() WHERE id=?")
               ->execute([json_encode($meta, JSON_UNESCAPED_UNICODE), $metaId]);
        } else {
            $db->prepare("INSERT INTO module_data (user_id,module,collection,status,favorite,sort,data,created_at,updated_at)
                          VALUES (?, 'walk','meta','',0,0,?,NOW(),NOW())")
               ->execute([(int)$pool, json_encode($meta, JSON_UNESCAPED_UNICODE)]);
        }

        // пункты ухода, которые «пора»
        $parents = rt_child_parents($db, $pool);
        if (!$parents) return;
        $s = $db->prepare(
            "SELECT id, data FROM module_data WHERE user_id=? AND module='walk' AND collection='care' AND deleted_at IS NULL"
        );
        $s->execute([(int)$pool]);
        foreach ($s->fetchAll() as $row) {
            $d = $row['data'] !== null ? json_decode($row['data'], true) : null;
            if (!is_array($d) || empty($d['nextDue'])) continue;
            $due = (string)$d['nextDue'];
            if ($due > $today) continue;                       // ещё не пора
            if (($d['lastNotified'] ?? null) === $due) continue; // уже уведомляли об этом сроке
            foreach ($parents as $pid) {
                rt_notify($pid, 'walk', 'care_due', ['type' => (string)$d['type'], 'day' => $due]);
            }
            $d['lastNotified'] = $due;
            $db->prepare("UPDATE module_data SET data=?, updated_at=NOW() WHERE id=?")
               ->execute([json_encode($d, JSON_UNESCAPED_UNICODE), (int)$row['id']]);
        }
    } catch (Throwable $e) { /* проверка ухода не должна ломать sync */ }
}
```

- [ ] **Step 2: Invoke from `sync.php`** — add the require near the top requires and a guarded call after the fingerprints (after line 116, before building `$reg`):

```php
require_once __DIR__ . '/_care.php';
require_once __DIR__ . '/_points.php'; // rt_points_tz used by care tz
// ...later, after data fingerprints:
try { rt_care_check($db, $uid); } catch (Throwable $e) { /* не ломаем поллер */ }
```

(`$db` and `$uid` are already in scope in sync.php; `rt_family_pool_uid`, `rt_child_parents`, `rt_notify` come from `_bootstrap.php` which sync.php already requires.)

- [ ] **Step 3: Verify**

Run: `node tools/check.js`. Server (if DB available): as a parent create a care item with `nextDue` = today; hit `sync.php` once as any family member; confirm a `notifications` row `src=walk type=care_due` for each parent and that the care row gains `lastNotified=<today>`; hit `sync.php` again the same day and confirm no duplicate notification (daily gate + per-occurrence dedup).

- [ ] **Step 4: Commit**

```bash
git add app/api/_care.php app/api/sync.php
git commit -m "feat(care): once-per-day server check fires care_due notifications"
```

---

### Task 3.7: Notification text (push + in-app)

**Files:**
- Modify: `app/api/_ntf_text.php` (add `walk`/`care_due` under en/ru/lv and `_app['walk']`).
- Modify: `app/core/notify.js` (matching client dictionary `ntf.ev` for `walk`/`care_due`, en/ru/lv).

- [ ] **Step 1: Add the push templates** in `_ntf_text.php`. Under each language's `'_app'` map add `'walk' => '<app name>'`, and add a `'walk'` block. The `{label}` token cannot be looked up server-side per language easily, so use the type key directly and keep the body type-agnostic, or interpolate `{type}`. Use a generic, friendly body:

en (`_app`: `'walk' => 'Dog'`):
```php
'walk' => [
    'care_due' => ['who'=>'', 'body'=>'Dog care is due today'],
],
```
ru (`_app`: `'walk' => 'Собака'`):
```php
'walk' => [
    'care_due' => ['who'=>'', 'body'=>'Сегодня по уходу за собакой запланировано дело'],
],
```
lv (`_app`: `'walk' => 'Suns'`):
```php
'walk' => [
    'care_due' => ['who'=>'', 'body'=>'Šodien jāveic suņa aprūpe'],
],
```

(If a type-specific body is desired later, extend `rt_ntf_render` to map `params.type` to a localized label; out of scope here. The in-app banner in notify.js can render the type since it has the client i18n.)

- [ ] **Step 2: Add the matching client dictionary** in `app/core/notify.js` `ntf.ev` blocks (en ~58, ru ~99, lv ~140) so the bell/center shows real text, mirroring an existing entry. Example (en):

```js
        walk:{ care_due:"Dog care is due" },
```
ru:
```js
        walk:{ care_due:"Пора по уходу за собакой" },
```
lv:
```js
        walk:{ care_due:"Laiks suņa aprūpei" },
```

(Match the exact nesting `notify.js` uses for other modules; if it keys by `src` then `type`, follow that shape.)

- [ ] **Step 3: Verify**

Run: `node tools/check.js`. With a local server, trigger a `care_due` (Task 3.6) and confirm the in-app bell shows the localized text; if VAPID keys are configured, confirm a web-push notification arrives; with no VAPID keys, confirm it is a silent no-op and the bell still records it.

- [ ] **Step 4: Commit**

```bash
git add app/api/_ntf_text.php app/core/notify.js
git commit -m "feat(care): localized care_due notification text (push + in-app)"
```

---

### Task 3.8: Migration note, version bump, КОНТЕКСТ, final verify

**Files:**
- Create: `app/api/migrations/0NN_walk_care.sql` (note only; `care` lives in `module_data`, no DDL).
- Modify: `app/modules/walk/module.json` (version), `app/index.html` (`RT_VER` + changelog), `КОНТЕКСТ.md`.

- [ ] **Step 1: Add a migration note file** numbered after the highest existing migration, documenting v1.5.0 and the `care` collection (a comment-only `.sql`, consistent with how the project tracks module versions):

```sql
-- 0NN_walk_care.sql — walk v1.5.0: collection walk/care (generic module_data, no DDL).
-- Parent-managed recurring dog-care schedule (vaccine, deworm, flea, vet, groom + custom).
-- care row data: {type, nextDue:"YYYY-MM-DD", cadence:{unit,every}, note, lastDoneDay, lastNotified, author}.
-- meta gains lastCareCheck:"YYYY-MM-DD" (sync.php rt_care_check daily gate). No schema change.
```

- [ ] **Step 2: Bump `module.json` to `1.5.0`; bump `window.RT_VER` + changelog; update `КОНТЕКСТ.md`** per the robtop-new-subapp skill.

- [ ] **Step 3: Final verification**

Run: `node tools/check.js` (PASS, version sync OK). Demo smoke test of the whole module: log walk (points), delete walk (parent), misbehaviour both sides, calendar markers + stats, care add/edit/done, due badge. For server paths, run the curl checks from Tasks 1.3, 3.1, 3.6.

- [ ] **Step 4: Commit**

```bash
git add app/api/migrations/0NN_walk_care.sql app/modules/walk/module.json app/index.html КОНТЕКСТ.md
git commit -m "chore(walk): v1.5.0 — care schedule and push reminders"
```

---

## Self-review (completed)

**Spec coverage:** points formula floor(min/2) kid-only (1.2-1.5), server-authoritative claim-by-entry with idempotency and author/role checks (1.2-1.3), parent delete with reversal (1.2, 1.4, 1.8), misbehaviour both sides (1.7), dog calendar + today/period stats (2.1-2.5), care schedule parent-only with recurrence and projection (3.1-3.4), real push via opportunistic sync check reusing rt_notify (3.6-3.7), parent-write guard for care (3.1), i18n en/ru/lv throughout, version bumps and КОНТЕКСТ updates (1.9, 2.6, 3.8). All spec sections map to tasks.

**Placeholders:** none; the CSS tasks (2.5, 3.5) intentionally describe class names and palette rather than full stylesheets, since they follow the existing `wk-` conventions in the same file and exact pixel values are a style choice, not logic.

**Type/name consistency:** `rt_points_write` 8-arg signature used consistently; `rt_points_walk_claim`/`rt_points_walk_reverse`/`rt_points_walk_ledger_row` names match across `_points.php` and `points.php`; client `sdk.points.add(n,reason,{entry})` and `sdk.points.reverse(id)` match the SDK edits; `careAdvance`/`careOccurrencesInMonth`/`careNextDue`/`careMarkDone`/`careLabel` consistent; `buildDayIndex`/`statsFor`/`walkStreak`/`renderCal`/`renderCalStats`/`renderCalGrid`/`openDayDetail` consistent; care row shape `{type,nextDue,cadence:{unit,every},note,lastDoneDay,lastNotified,author}` consistent between client and `_care.php`.

**Known limitations (documented, in scope per spec):** multi-kid families share one points bank scope (the canonical child); the server care check has no cron and runs at most once per family per day on sync; care_due push body is type-agnostic server-side (the in-app bell can show the type via client i18n).

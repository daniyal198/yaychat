# YaysApp — Autonomous Nightly Session Playbook

You are the **primary coding agent (Claude Opus)** running an unattended overnight development
session on the **YaysApp** mobile app. No human is watching. Work autonomously, safely, and leave
behind reviewed code, clean commits, a pull request, and a daily report. Follow this playbook
top to bottom.

> **Naming:** the product is **YaysApp** (formerly "YayChat"). Use "YaysApp" in every human-facing
> string: report headers, PR title/body, and commit messages. Do NOT rename any files, directories,
> or npm packages — the on-disk names (`YayChat/`, remote `daniyal198/yaychat`, package
> `yaychat-mobile`) stay exactly as they are.

## 0. Environment & invariants (read carefully)

- You are running **inside an isolated git worktree** checked out from a fresh `origin/main`, on a
  branch already created for you named `nightly/<DATE>` (DATE = today, `YYYY-MM-DD`). Your current
  working directory is the worktree root. **Everything you do stays on this branch.**
- **Never** touch `main` directly, never force-push, never rewrite published history, never delete
  branches, never run `git worktree`/`git clone` yourself — the wrapper manages worktrees.
- **Scope is strictly `mobile/`** (React Native + TypeScript). Do not modify `backend/` or the
  exchange backend — the local backend install is known-broken and is out of scope.
- **Current objective = the Chat MVP** per `yaysapp_module_development_plan.md`: the product goal is
  real-time messaging between real users. Because the backend is blocked and you are mobile-only,
  your nightly job is the **mobile-buildable slice of the critical path**: Module M0 (design system,
  app shell, navigation) and the **chat UI on mock service adapters**, plus the `bitcoin-yay-mobile`
  chat audit (`docs/yaychat-current-chat-audit.md`). Do NOT attempt real-time backend work.
- Package manager is **npm** (Node 26 / npm 11). Do not switch to yarn.
- You have a **wall-clock time budget** (the wrapper enforces it and may terminate you). Because of
  that, you must **persist progress incrementally** — commit each feature as it finishes and update
  the report and ledger after *every* feature, so a mid-work termination still leaves usable output.

## 1. Load context

Read, in this order:
1. `.nightly/progress-ledger.md` — what's already done / in progress / blocked.
2. `yaysapp_module_development_plan.md` (v3.0, module-based) — **the current plan/source of truth for
   scope**, and `yaysapp_module_timeline.md` for order. Focus on **Module M0** and the **chat UI
   slice of M2 on mock adapters**. (The older `yaychat_ai_development_milestones.md` is superseded.)
3. `yaychat_unified_product_vision_prd.md` — the PRD; it overrides everything on product conflicts.
4. `mobile/docs/` — especially `yaychat-frontend-test-plan.md`, `yaychat-component-inventory.md`,
   `yaychat-mock-api-contracts.md`, `yaychat-screen-inventory.md`, `yaychat-navigation-map.md`.
   Reuse the structures/contracts defined there instead of inventing new ones.
5. Skim `mobile/src/` to understand existing patterns (navigation, context, services, theme, types)
   before writing code. Match the existing conventions.

## 2. Select tasks

- If the ledger's **Tasks** section is empty (first run), derive a concrete, ordered task list from
  **Module M0 + the chat-UI slice of M2** in `yaysapp_module_development_plan.md` + `mobile/docs/*`,
  and write it into the ledger before coding.
- Pick the **next unblocked task(s)** not already `[x]`. Prefer small, independently shippable
  features. Do not start more than you can plausibly finish + review within the time budget.
- Skip anything requiring a live backend, real credentials, native device builds, or network
  services you don't have — mark such items `[!]` blocked with a one-line reason.

## 3. Implement (you, Opus) — one feature at a time

For each selected feature:
1. Implement it in `mobile/`, following existing patterns and the mock-API contracts.
2. Keep changes focused and self-contained. Add/adjust unit tests under `mobile/__tests__/` to cover
   new logic (the repo uses Jest).
3. Run locally in `mobile/`:
   - `npm test` (or `npx jest --silent`) — must pass.
   - `npm run lint` — fix all new lint errors you introduce.
   If a pre-existing failure is unrelated to your change, note it in the report rather than trying to
   fix unrelated code.

## 4. Review (spawn a Claude Fable subagent) — before every commit

After a feature is implemented and green, launch a **review subagent on Claude Fable** using the
Agent/Task tool. Use `subagent_type: "general-purpose"` with **`model: "fable"`** (Claude Fable 5).
Give it the diff scope and this brief:

> "You are a senior reviewer enforcing production-quality standards for the YaysApp React Native
> app. Review ONLY the changes for feature <name> in `mobile/`. Check: correctness, edge cases,
> TypeScript soundness, adherence to existing patterns (`mobile/src` conventions, theme, navigation,
> mock-API contracts in `mobile/docs`), test coverage, accessibility, and dead/duplicated code.
> Refactor directly where it clearly improves quality, then run `npm test` and `npm run lint` in
> `mobile/` and report what you changed and why. Do not expand scope beyond this feature."

Apply/keep the subagent's improvements. Re-run `npm test` and `npm run lint` afterward to confirm
green. Record what Fable changed — it feeds the report's **Review improvements** section.

## 5. Commit cleanly (one commit per reviewed feature)

- Stage only the files for this feature. Do NOT commit `.nightly/logs/`.
- Conventional-Commits style, e.g. `feat(chat): add unread-badge to conversation list`.
- Message body: 1–3 lines on what and why.
- **Attribution:** commit solely as the repository owner. Do **NOT** add any `Co-Authored-By` trailer,
  AI-attribution line, or "Generated with" footer. The owner is the sole author of all commits.
- Commit is on `nightly/<DATE>` only.

## 6. Update ledger + report after EVERY feature (timeout-safe)

Immediately after each commit:
- Mark the task `[x]` in `.nightly/progress-ledger.md` and append a Session-history row. This file
  is **excluded from git** (the wrapper persists it across nights) — just edit it in place; do not
  commit `.nightly/`.
- Create/append `reports/<DATE>.md` (see §8 for the exact format). Write it incrementally so it's
  always valid even if the session is killed next minute. **The report IS committed** to the branch
  (it's part of the deliverable) — include it in the relevant feature commit or a final docs commit.

## 7. Loop

Repeat §3–§6 until either all selected tasks are done or you sense the time budget is nearly spent
(leave a safety margin of a few minutes for finalize). Then go to §9.

## 8. Daily report format — `reports/<DATE>.md`

```markdown
# YaysApp Nightly Report — <DATE>

**Branch:** nightly/<DATE> · **PR:** <url or "pending"> · **Commits:** <base>..<head>

## Completed tasks
- <task from the ledger, one bullet each>

## Features implemented
- <feature>: <one-line description>

## Bugs fixed
- <bug + how, or "None">

## Files changed
- <path> — <what changed>   (or a summarized `git diff --stat`)

## Review improvements (Claude Fable)
- <feature>: <what Fable refactored/caught>

## Remaining tasks / blockers
- <not-done items and any [!] blockers with reasons>
```

## 9. Finalize

1. Ensure the working tree is clean (everything committed) and `npm test` + `npm run lint` are green.
2. Push the branch: `git push -u origin nightly/<DATE>`.
3. Open a **draft** PR against `main`:
   `gh pr create --draft --base main --head nightly/<DATE> --title "YaysApp nightly — <DATE>" --body-file <tmp>`
   The body should summarize the report: what shipped, review notes, test/lint status, and remaining
   work. If a PR for this branch already exists, update it instead of erroring.
4. Put the PR URL into the report header and the ledger.
5. If NO commits were produced (nothing to ship or fully blocked), do NOT open a PR. Instead write a
   report explaining why (blockers, empty task list, etc.) so the morning review is still informative.

## Safety rules (hard limits)

- Only ever operate within this worktree and only under `mobile/` (+ `.nightly/` and `reports/`).
- No `git push` except the single `nightly/<DATE>` branch. Never `--force`. Never touch `main`.
- No `rm -rf`, no history rewrites, no dependency upgrades beyond what a feature strictly needs, no
  editing of secrets/`.env` files, no network calls to unknown hosts.
- If you hit a state you're unsure about, STOP that feature, mark it `[!]` blocked with the reason in
  the ledger and report, and move on — never guess destructively.

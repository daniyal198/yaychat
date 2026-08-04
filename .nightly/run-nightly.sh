#!/usr/bin/env bash
#
# YaysApp autonomous nightly session runner.
#
# Sets up an isolated git worktree from a fresh origin/main, runs a headless Claude Opus
# session driven by orchestrator.md, then cleans up. The user's working copy is never touched.
#
# Env overrides:
#   SESSION_HOURS   wall-clock budget for the Claude session (default 4; accepts decimals)
#   REPO            path to the YayChat repo (default: derived from this script's location)
#   CLAUDE_BIN      path to the claude CLI (default: looked up on PATH / ~/.local/bin)
#
# Usage:
#   bash .nightly/run-nightly.sh            # normal run
#   SESSION_HOURS=0.3 bash .nightly/run-nightly.sh   # short dry run for verification

set -uo pipefail

# --- Resolve paths ------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${REPO:-$(cd "$SCRIPT_DIR/.." && pwd)}"
NIGHTLY_DIR="$REPO/.nightly"
LOG_DIR="$NIGHTLY_DIR/logs"
DATE="$(date +%Y-%m-%d)"
STAMP="$(date +%Y-%m-%d_%H%M%S)"
BRANCH="nightly/$DATE"
WORKTREE="/tmp/yaysapp-nightly/$DATE"
LOG="$LOG_DIR/$DATE.log"
SESSION_HOURS="${SESSION_HOURS:-4}"

mkdir -p "$LOG_DIR" "$(dirname "$WORKTREE")"

# Log to both the per-day file and stdout (launchd also captures stdout/stderr).
exec > >(tee -a "$LOG") 2>&1

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# Ensure PATH includes common CLI locations (launchd runs with a minimal PATH).
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
CLAUDE_BIN="${CLAUDE_BIN:-$(command -v claude || true)}"

log "=== YaysApp nightly session $STAMP ==="
log "repo=$REPO branch=$BRANCH worktree=$WORKTREE budget=${SESSION_HOURS}h"

if [ -z "$CLAUDE_BIN" ]; then
  log "FATAL: claude CLI not found on PATH"; exit 127
fi
if [ ! -d "$REPO/.git" ]; then
  log "FATAL: $REPO is not a git repository"; exit 1
fi

# --- Cleanup on any exit ------------------------------------------------------
cleanup() {
  local rc=$?
  log "cleanup: removing worktree $WORKTREE (exit=$rc)"
  git -C "$REPO" worktree remove --force "$WORKTREE" 2>/dev/null || rm -rf "$WORKTREE"
  git -C "$REPO" worktree prune 2>/dev/null || true
  log "=== session end (exit=$rc) ==="
}
trap cleanup EXIT INT TERM

# --- Fetch and build the isolated worktree ------------------------------------
log "fetching origin..."
if ! git -C "$REPO" fetch --prune origin; then
  log "FATAL: git fetch failed"; exit 1
fi

# Start clean: if a stale worktree/branch from a crashed run exists, clear it.
git -C "$REPO" worktree remove --force "$WORKTREE" 2>/dev/null || true
rm -rf "$WORKTREE"
git -C "$REPO" worktree prune 2>/dev/null || true

# If the branch already exists (e.g. re-run same day), reuse it; else create from origin/main.
if git -C "$REPO" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  log "branch $BRANCH exists; checking it out into worktree"
  git -C "$REPO" worktree add "$WORKTREE" "$BRANCH" || { log "FATAL: worktree add (existing branch) failed"; exit 1; }
else
  log "creating branch $BRANCH from origin/main"
  git -C "$REPO" worktree add -b "$BRANCH" "$WORKTREE" origin/main || { log "FATAL: worktree add failed"; exit 1; }
fi

# --- Seed the persistent ledger into the worktree -----------------------------
# The ledger lives on disk in the MAIN repo's .nightly/ so it survives across nights
# (worktrees are cut from origin/main and don't carry it). Copy it in; copy it back after.
mkdir -p "$WORKTREE/.nightly"
if [ -f "$NIGHTLY_DIR/progress-ledger.md" ]; then
  cp "$NIGHTLY_DIR/progress-ledger.md" "$WORKTREE/.nightly/progress-ledger.md"
fi
# Keep the agent from committing .nightly/ to the branch (reports/ stays committable).
EXCLUDE_FILE="$(git -C "$WORKTREE" rev-parse --git-path info/exclude 2>/dev/null)"
if [ -n "$EXCLUDE_FILE" ]; then
  mkdir -p "$(dirname "$EXCLUDE_FILE")"
  grep -qxF ".nightly/" "$EXCLUDE_FILE" 2>/dev/null || echo ".nightly/" >> "$EXCLUDE_FILE"
fi

# --- Install mobile deps (isolated to the worktree) ---------------------------
log "installing mobile npm deps (this can take a while)..."
( cd "$WORKTREE/mobile" && npm ci --no-audit --no-fund 2>&1 | tail -5 ) \
  || ( cd "$WORKTREE/mobile" && npm install --no-audit --no-fund 2>&1 | tail -5 ) \
  || log "WARN: npm install had issues; the session will surface test/lint failures"

# --- Portable timeout wrapper (no gtimeout on stock macOS) --------------------
# Runs "$@" but kills it after SESSION_HOURS. Uses perl's alarm as a portable timeout.
run_with_timeout() {
  local secs
  secs="$(perl -e 'printf("%d", $ARGV[0]*3600)' "$SESSION_HOURS")"
  perl -e '
    my $t = shift;
    my $pid = fork();
    if ($pid == 0) { exec @ARGV or exit 127; }
    $SIG{ALRM} = sub {
      kill "TERM", $pid; sleep 10; kill "KILL", $pid; exit 124;
    };
    alarm $t;
    waitpid($pid, 0);
    exit($? >> 8);
  ' "$secs" "$@"
}

# --- Run the headless Claude Opus session -------------------------------------
PROMPT="$(cat "$NIGHTLY_DIR/orchestrator.md")"
log "starting Claude Opus session (budget ${SESSION_HOURS}h)..."
cd "$WORKTREE"

# Optional hard dollar cap on API spend per session (set MAX_BUDGET_USD to enable).
BUDGET_ARGS=()
if [ -n "${MAX_BUDGET_USD:-}" ]; then
  BUDGET_ARGS=(--max-budget-usd "$MAX_BUDGET_USD")
  log "cost cap: \$$MAX_BUDGET_USD"
fi

run_with_timeout "$CLAUDE_BIN" \
  --print \
  --model claude-opus-4-8 \
  --dangerously-skip-permissions \
  --add-dir "$WORKTREE" \
  "${BUDGET_ARGS[@]}" \
  "$PROMPT"
CLAUDE_RC=$?

if [ "$CLAUDE_RC" -eq 124 ]; then
  log "session hit the ${SESSION_HOURS}h budget and was stopped (expected stop condition)"
else
  log "session exited with code $CLAUDE_RC"
fi

# --- Safety net: if the agent committed but failed to push, push the branch ---
if git -C "$WORKTREE" rev-parse --verify --quiet HEAD >/dev/null; then
  AHEAD="$(git -C "$WORKTREE" rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"
  if [ "${AHEAD:-0}" -gt 0 ]; then
    if [ -z "$(git -C "$WORKTREE" branch -r --contains HEAD 2>/dev/null | grep "origin/$BRANCH")" ]; then
      log "safety net: pushing $BRANCH ($AHEAD commit(s) not yet on origin)"
      git -C "$WORKTREE" push -u origin "$BRANCH" 2>&1 | tail -3 || log "WARN: safety-net push failed"
    fi
  else
    log "no new commits this session"
  fi
fi

# --- Persist ledger + reports back to the main repo (survives worktree removal) ---
if [ -f "$WORKTREE/.nightly/progress-ledger.md" ]; then
  cp "$WORKTREE/.nightly/progress-ledger.md" "$NIGHTLY_DIR/progress-ledger.md"
  log "ledger persisted to main repo"
fi
if compgen -G "$WORKTREE/reports/*.md" > /dev/null; then
  mkdir -p "$REPO/reports"
  cp "$WORKTREE"/reports/*.md "$REPO/reports/" 2>/dev/null || true
  log "reports mirrored to $REPO/reports/"
fi

exit 0

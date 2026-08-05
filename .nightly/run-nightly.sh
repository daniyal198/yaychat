#!/usr/bin/env bash
#
# YaysApp autonomous nightly session runner.
#
# Syncs main, runs a headless Codex session driven by orchestrator.md, and lets
# the agent commit/push directly to main.
#
# Env overrides:
#   SESSION_HOURS          per-run wall-clock budget for the Codex session (default 0.5; accepts decimals)
#   AGENT_DAILY_USAGE_MINUTES assigned local daily runtime budget for this agent (default 30)
#   AGENT_USAGE_STOP_PERCENT  stop once local daily runtime reaches this percentage (default 85)
#   REPO            path to the YayChat repo (default: derived from this script's location)
#   CODEX_BIN       path to the codex CLI (default: looked up on PATH / ~/.local/bin)
#   YAYSAPP_CODING_MODEL   model for implementation (default: gpt-5.5)
#   YAYSAPP_REVIEW_MODEL   model for review/improvements (default: gpt-5.4)
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
BRANCH="main"
WORKDIR="$REPO"
LOG="$LOG_DIR/$DATE.log"
SESSION_HOURS="${SESSION_HOURS:-0.5}"
AGENT_DAILY_USAGE_MINUTES="${AGENT_DAILY_USAGE_MINUTES:-30}"
AGENT_USAGE_STOP_PERCENT="${AGENT_USAGE_STOP_PERCENT:-85}"
USAGE_DIR="$NIGHTLY_DIR/usage"
USAGE_FILE="$USAGE_DIR/$DATE.tsv"
EFFECTIVE_SESSION_SECONDS=0

mkdir -p "$LOG_DIR" "$USAGE_DIR"

# Log to both the per-day file and stdout (launchd also captures stdout/stderr).
exec > >(tee -a "$LOG") 2>&1

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# Ensure PATH includes common CLI locations (launchd runs with a minimal PATH).
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
CODEX_BIN="${CODEX_BIN:-$(command -v codex || find "$HOME/.cursor/extensions" -path "*/bin/macos-*/codex" -type f -perm -111 2>/dev/null | sort -r | head -1 || true)}"
YAYSAPP_CODING_MODEL="${YAYSAPP_CODING_MODEL:-gpt-5.5}"
YAYSAPP_REVIEW_MODEL="${YAYSAPP_REVIEW_MODEL:-gpt-5.4}"
export YAYSAPP_REVIEW_MODEL

log "=== YaysApp nightly session $STAMP ==="
log "repo=$REPO branch=$BRANCH workdir=$WORKDIR budget=${SESSION_HOURS}h assigned_daily=${AGENT_DAILY_USAGE_MINUTES}m stop_at=${AGENT_USAGE_STOP_PERCENT}% coding_model=$YAYSAPP_CODING_MODEL review_model=$YAYSAPP_REVIEW_MODEL"

if [ -z "$CODEX_BIN" ]; then
  log "FATAL: codex CLI not found on PATH"; exit 127
fi
if [ ! -d "$REPO/.git" ]; then
  log "FATAL: $REPO is not a git repository"; exit 1
fi

# --- Local usage guard --------------------------------------------------------
# Codex does not expose a reliable CLI command for ChatGPT/Codex account usage.
# This guard enforces a local budget for this automation only, so the scheduled
# agent cannot run for hours unattended.
usage_seconds_for_today() {
  awk -F '\t' '$3 == "codex" {sum += $5} END {print int(sum)}' "$USAGE_FILE" 2>/dev/null || echo 0
}

budget_seconds="$(perl -e 'my $m = $ARGV[0] + 0; my $p = $ARGV[1] + 0; my $s = int($m * 60 * $p / 100); $s = 1 if $s < 1; print $s' "$AGENT_DAILY_USAGE_MINUTES" "$AGENT_USAGE_STOP_PERCENT")"
requested_seconds="$(perl -e 'my $s = int($ARGV[0] * 3600); $s = 1 if $s < 1; print $s' "$SESSION_HOURS")"
used_seconds="$(usage_seconds_for_today)"
remaining_seconds=$((budget_seconds - used_seconds))

if [ "$remaining_seconds" -le 0 ]; then
  log "usage guard: stopping before Codex; local assigned daily budget is already at ${AGENT_USAGE_STOP_PERCENT}% (${used_seconds}s/${budget_seconds}s)"
  mkdir -p "$REPO/reports"
  {
    echo "# YaysApp Nightly Report — $DATE"
    echo
    echo "**Branch:** main · **PR:** none · **Commits:** none"
    echo
    echo "## Completed tasks"
    echo "- None; run skipped by the local usage guard."
    echo
    echo "## Features implemented"
    echo "- None."
    echo
    echo "## Bugs fixed"
    echo "- None."
    echo
    echo "## Files changed"
    echo "- None."
    echo
    echo "## Review improvements (Codex \`$YAYSAPP_REVIEW_MODEL\`)"
    echo "- None; review was not started."
    echo
    echo "## Remaining tasks / blockers"
    echo "- Local usage guard stopped the run before Codex because this agent reached ${AGENT_USAGE_STOP_PERCENT}% of its assigned ${AGENT_DAILY_USAGE_MINUTES}-minute daily budget."
  } > "$REPO/reports/$DATE.md"
  exit 0
fi

if [ "$requested_seconds" -gt "$remaining_seconds" ]; then
  EFFECTIVE_SESSION_SECONDS="$remaining_seconds"
else
  EFFECTIVE_SESSION_SECONDS="$requested_seconds"
fi
EFFECTIVE_SESSION_HOURS="$(perl -e 'printf "%.3f", $ARGV[0] / 3600' "$EFFECTIVE_SESSION_SECONDS")"
log "usage guard: used=${used_seconds}s limit=${budget_seconds}s remaining=${remaining_seconds}s effective_session=${EFFECTIVE_SESSION_SECONDS}s (${EFFECTIVE_SESSION_HOURS}h)"

# --- Cleanup on any exit ------------------------------------------------------
cleanup() {
  local rc=$?
  log "=== session end (exit=$rc) ==="
}
trap cleanup EXIT INT TERM

# --- Sync main ----------------------------------------------------------------
log "fetching origin..."
if ! git -C "$REPO" fetch --prune origin; then
  log "FATAL: git fetch failed"; exit 1
fi

if [ "$(git -C "$REPO" branch --show-current)" != "main" ]; then
  log "checking out main"
  git -C "$REPO" checkout main || { log "FATAL: could not check out main"; exit 1; }
fi
log "fast-forwarding main from origin/main..."
git -C "$REPO" pull --ff-only origin main || { log "FATAL: could not fast-forward main"; exit 1; }

# Keep the agent from committing .nightly/ (reports/ stays committable).
EXCLUDE_FILE="$(git -C "$WORKDIR" rev-parse --git-path info/exclude 2>/dev/null)"
if [ -n "$EXCLUDE_FILE" ]; then
  mkdir -p "$(dirname "$EXCLUDE_FILE")"
  grep -qxF ".nightly/" "$EXCLUDE_FILE" 2>/dev/null || echo ".nightly/" >> "$EXCLUDE_FILE"
fi

# --- Install mobile deps ------------------------------------------------------
log "installing mobile npm deps (this can take a while)..."
( cd "$WORKDIR/mobile" && npm install --legacy-peer-deps --no-audit --no-fund ) \
  || log "WARN: npm install had issues; the session will surface test/lint failures"

# --- Portable timeout wrapper (no gtimeout on stock macOS) --------------------
# Runs "$@" but kills it after SESSION_HOURS. Uses perl's alarm as a portable timeout.
run_with_timeout() {
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
  ' "$EFFECTIVE_SESSION_SECONDS" "$@"
}

# --- Run the headless Codex session -------------------------------------------
PROMPT="$(cat "$NIGHTLY_DIR/orchestrator.md")"
log "starting Codex session (effective budget ${EFFECTIVE_SESSION_SECONDS}s / ${EFFECTIVE_SESSION_HOURS}h)..."
cd "$WORKDIR"
CODEX_STARTED_AT="$(date +%s)"

# Bash 3.2 + `set -u` treats empty arrays as unset, so build the command incrementally.
CODEX_CMD=(
  "$CODEX_BIN"
  exec
  --model "$YAYSAPP_CODING_MODEL"
  --dangerously-bypass-approvals-and-sandbox
  -C "$WORKDIR"
  --add-dir "$WORKDIR"
  "$PROMPT"
)
if [ -n "${MAX_BUDGET_USD:-}" ]; then
  log "WARN: MAX_BUDGET_USD is not supported by codex exec; ignoring"
fi

run_with_timeout "${CODEX_CMD[@]}"
CODEX_RC=$?
CODEX_ENDED_AT="$(date +%s)"
CODEX_ELAPSED_SECONDS=$((CODEX_ENDED_AT - CODEX_STARTED_AT))
printf '%s\t%s\tcodex\t%s\t%s\t%s\n' "$STAMP" "$BRANCH" "$YAYSAPP_CODING_MODEL" "$CODEX_ELAPSED_SECONDS" "$CODEX_RC" >> "$USAGE_FILE"
log "usage guard: recorded ${CODEX_ELAPSED_SECONDS}s for $YAYSAPP_CODING_MODEL in $USAGE_FILE"

if [ "$CODEX_RC" -eq 124 ]; then
  log "session hit the effective ${EFFECTIVE_SESSION_SECONDS}s budget and was stopped (expected stop condition)"
else
  log "session exited with code $CODEX_RC"
fi

# --- Safety net: if the agent committed but failed to push, push main ---------
if git -C "$WORKDIR" rev-parse --verify --quiet HEAD >/dev/null; then
  AHEAD="$(git -C "$WORKDIR" rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"
  if [ "${AHEAD:-0}" -gt 0 ]; then
    log "safety net: pushing main ($AHEAD commit(s) not yet on origin)"
    git -C "$WORKDIR" push origin main 2>&1 | tail -3 || log "WARN: safety-net push failed"
  else
    log "no new commits this session"
  fi
fi

exit 0

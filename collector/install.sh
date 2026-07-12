#!/usr/bin/env bash
# One-command installer for the Home WiFi Collector.
#
# BEST (no prompts, works with curl|bash reliably) — pass the two required
# values inline so the script never has to read from the terminal:
#
#   SITE_URL="https://text2sale.com" WIFI_INGEST_SECRET="your-secret" \
#     bash -c "$(curl -fsSL https://raw.githubusercontent.com/jamiejay214/text2sale/main/collector/install.sh)"
#
# Also fine (it will prompt on the terminal):
#
#   curl -fsSL https://raw.githubusercontent.com/jamiejay214/text2sale/main/collector/install.sh | bash
#
# Optional env: PIHOLE_URL, PIHOLE_TOKEN, HOUSEHOLD, INTERVAL_SEC, FORCE=1
set -euo pipefail

say() { printf "\033[1;36m▸ %s\033[0m\n" "$*"; }
err() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; }

REPO_URL="https://github.com/jamiejay214/text2sale"
CLONE_DIR="$HOME/text2sale"

# Read a value into a variable from the real terminal (/dev/tty), NOT stdin —
# stdin is the piped script under `curl | bash`, and reading it would swallow
# the script's own lines (the original bug). Falls back to the default.
ask() { # ask VAR "prompt" "default"
  local __var="$1" __msg="$2" __def="${3:-}" __val=""
  if { exec 3</dev/tty; } 2>/dev/null; then
    read -r -p "$__msg" __val <&3 || true
    exec 3<&-
  fi
  [ -z "$__val" ] && __val="$__def"
  printf -v "$__var" '%s' "$__val"
}

# --- locate the collector (a checkout next to this script, or clone) --------
SRC="${BASH_SOURCE[0]:-}"
if [ -n "$SRC" ] && [ -f "$(dirname "$SRC")/collect.mjs" ]; then
  COLLECTOR_DIR="$(cd "$(dirname "$SRC")" && pwd)"
elif [ -f "./collect.mjs" ]; then
  COLLECTOR_DIR="$(pwd)"
else
  if ! command -v git >/dev/null 2>&1; then err "git is required. Install git and re-run."; exit 1; fi
  if [ -d "${CLONE_DIR}/.git" ]; then
    say "Updating existing checkout at ${CLONE_DIR}"
    git -C "${CLONE_DIR}" pull --ff-only || true
  else
    say "Cloning ${REPO_URL} → ${CLONE_DIR}"
    git clone --depth 1 "${REPO_URL}" "${CLONE_DIR}"
  fi
  COLLECTOR_DIR="${CLONE_DIR}/collector"
fi
COLLECT_JS="${COLLECTOR_DIR}/collect.mjs"
[ -f "${COLLECT_JS}" ] || { err "collect.mjs not found at ${COLLECT_JS}"; exit 1; }
STATE_FILE="${COLLECTOR_DIR}/.wifi-state.json"

# --- require Node 18+ -------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  err "Node.js 18+ is required and was not found."
  echo "  Debian/Raspberry Pi OS:  sudo apt-get update && sudo apt-get install -y nodejs"
  echo "  macOS (Homebrew):        brew install node"
  echo "  Or install from https://nodejs.org  then re-run."
  exit 1
fi
if [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then err "Need Node 18+."; exit 1; fi
NODE_BIN="$(command -v node)"

# --- config -----------------------------------------------------------------
SITE_URL="${SITE_URL:-}"
WIFI_INGEST_SECRET="${WIFI_INGEST_SECRET:-}"
[ -z "${SITE_URL}" ] && ask SITE_URL "Your site URL [https://text2sale.com]: " "https://text2sale.com"
[ -z "${WIFI_INGEST_SECRET}" ] && ask WIFI_INGEST_SECRET "WIFI_INGEST_SECRET (the value you set on Vercel): " ""

# sanitise + validate
SITE_URL="$(printf '%s' "$SITE_URL" | tr -d '"'"'"' \t' | sed 's#/*$##')"
case "$SITE_URL" in
  http://*|https://*) : ;;
  *) err "SITE_URL must start with http:// or https:// (got: '${SITE_URL}')."
     err "Re-run with:  SITE_URL=\"https://text2sale.com\" WIFI_INGEST_SECRET=\"...\" bash -c \"\$(curl -fsSL ${REPO_URL}/raw/main/collector/install.sh)\""
     exit 1 ;;
esac
if [ -z "${WIFI_INGEST_SECRET}" ]; then
  err "WIFI_INGEST_SECRET is required (must match the value set on the server)."
  exit 1
fi
HOUSEHOLD="${HOUSEHOLD:-home}"
INTERVAL_SEC="${INTERVAL_SEC:-60}"
PIHOLE_URL="${PIHOLE_URL:-}"
PIHOLE_TOKEN="${PIHOLE_TOKEN:-}"

# --- one test cycle (abort before installing a service if it fails) ---------
say "Testing one collection cycle against ${SITE_URL} …"
if SITE_URL="${SITE_URL}" WIFI_INGEST_SECRET="${WIFI_INGEST_SECRET}" \
   PIHOLE_URL="${PIHOLE_URL}" PIHOLE_TOKEN="${PIHOLE_TOKEN}" \
   HOUSEHOLD="${HOUSEHOLD}" INTERVAL_SEC=0 STATE_FILE="${STATE_FILE}" \
   "${NODE_BIN}" "${COLLECT_JS}"; then
  say "Test cycle ran. If it printed 'ingest 200' you're good; 503/401 means finish steps ①/② (Supabase table + WIFI_INGEST_SECRET on Vercel)."
else
  err "Test cycle failed (see error above). NOT installing the background service."
  err "Fix the issue and re-run. Nothing was installed."
  [ "${FORCE:-0}" = "1" ] || exit 1
  err "FORCE=1 set — installing anyway."
fi

# --- install as a background service ---------------------------------------
install_systemd() {
  local unit=/etc/systemd/system/wifi-collector.service
  say "Installing systemd service (sudo)…"
  sudo tee "${unit}" >/dev/null <<UNIT
[Unit]
Description=Home WiFi Collector
After=network-online.target
Wants=network-online.target

[Service]
Environment=SITE_URL=${SITE_URL}
Environment=WIFI_INGEST_SECRET=${WIFI_INGEST_SECRET}
Environment=PIHOLE_URL=${PIHOLE_URL}
Environment=PIHOLE_TOKEN=${PIHOLE_TOKEN}
Environment=HOUSEHOLD=${HOUSEHOLD}
Environment=INTERVAL_SEC=${INTERVAL_SEC}
Environment=STATE_FILE=${STATE_FILE}
ExecStart=${NODE_BIN} ${COLLECT_JS}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
UNIT
  sudo systemctl daemon-reload
  sudo systemctl enable --now wifi-collector
  say "Running in the background; starts on boot."
  echo "  Logs:  journalctl -u wifi-collector -f"
  echo "  Stop:  sudo systemctl disable --now wifi-collector"
}

install_launchd() {
  local plist="$HOME/Library/LaunchAgents/com.text2sale.wificollector.plist"
  mkdir -p "$HOME/Library/LaunchAgents"
  say "Installing launchd agent (macOS)…"
  cat > "${plist}" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.text2sale.wificollector</string>
  <key>ProgramArguments</key><array><string>${NODE_BIN}</string><string>${COLLECT_JS}</string></array>
  <key>EnvironmentVariables</key><dict>
    <key>SITE_URL</key><string>${SITE_URL}</string>
    <key>WIFI_INGEST_SECRET</key><string>${WIFI_INGEST_SECRET}</string>
    <key>PIHOLE_URL</key><string>${PIHOLE_URL}</string>
    <key>PIHOLE_TOKEN</key><string>${PIHOLE_TOKEN}</string>
    <key>HOUSEHOLD</key><string>${HOUSEHOLD}</string>
    <key>INTERVAL_SEC</key><string>${INTERVAL_SEC}</string>
    <key>STATE_FILE</key><string>${STATE_FILE}</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict></plist>
PLIST
  launchctl unload "${plist}" 2>/dev/null || true
  launchctl load "${plist}"
  say "Running in the background; starts on login."
  echo "  Stop:  launchctl unload ${plist} && rm ${plist}"
}

install_nohup() {
  say "No systemd/launchd — starting with nohup (won't auto-start on reboot)."
  SITE_URL="${SITE_URL}" WIFI_INGEST_SECRET="${WIFI_INGEST_SECRET}" \
  PIHOLE_URL="${PIHOLE_URL}" PIHOLE_TOKEN="${PIHOLE_TOKEN}" \
  HOUSEHOLD="${HOUSEHOLD}" INTERVAL_SEC="${INTERVAL_SEC}" STATE_FILE="${STATE_FILE}" \
  nohup "${NODE_BIN}" "${COLLECT_JS}" > "${COLLECTOR_DIR}/collector.log" 2>&1 &
  say "Started (PID $!). Logs: ${COLLECTOR_DIR}/collector.log"
}

if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
  install_systemd
elif [ "$(uname -s)" = "Darwin" ]; then
  install_launchd
else
  install_nohup
fi

echo
say "Done. Open ${SITE_URL}/command → Home WiFi. The badge turns LIVE within ~a minute (once steps ①/② are done)."

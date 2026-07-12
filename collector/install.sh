#!/usr/bin/env bash
# One-command installer for the Home WiFi Collector.
#
# Usage (from a machine on your home WiFi — Raspberry Pi, spare laptop, NAS):
#
#   curl -fsSL https://raw.githubusercontent.com/jamiejay214/text2sale/main/collector/install.sh | bash
#
# or, if you've already cloned the repo:
#
#   bash collector/install.sh
#
# It installs the collector as a background service that keeps running and
# restarts on reboot, so your dashboard stays LIVE without you doing anything.
#
# You can pre-set these to skip the prompts:
#   SITE_URL, WIFI_INGEST_SECRET, PIHOLE_URL, PIHOLE_TOKEN, HOUSEHOLD, INTERVAL_SEC
set -euo pipefail

say() { printf "\033[1;36m▸ %s\033[0m\n" "$*"; }
err() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; }

REPO_URL="https://github.com/jamiejay214/text2sale"
DEFAULT_DIR="$HOME/text2sale"

# --- locate the collector (use this checkout, or clone) ---------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-}")" 2>/dev/null && pwd || true)"
if [ -n "${SCRIPT_DIR}" ] && [ -f "${SCRIPT_DIR}/collect.mjs" ]; then
  COLLECTOR_DIR="${SCRIPT_DIR}"
else
  if ! command -v git >/dev/null 2>&1; then err "git is required. Install git and re-run."; exit 1; fi
  if [ ! -d "${DEFAULT_DIR}/.git" ]; then
    say "Cloning ${REPO_URL} → ${DEFAULT_DIR}"
    git clone --depth 1 "${REPO_URL}" "${DEFAULT_DIR}"
  else
    say "Updating existing checkout at ${DEFAULT_DIR}"
    git -C "${DEFAULT_DIR}" pull --ff-only || true
  fi
  COLLECTOR_DIR="${DEFAULT_DIR}/collector"
fi
COLLECT_JS="${COLLECTOR_DIR}/collect.mjs"
[ -f "${COLLECT_JS}" ] || { err "collect.mjs not found at ${COLLECT_JS}"; exit 1; }

# --- require Node 18+ -------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  err "Node.js 18+ is required and was not found."
  echo "  Debian/Raspberry Pi OS:  sudo apt-get update && sudo apt-get install -y nodejs"
  echo "  macOS (Homebrew):        brew install node"
  echo "  Or install from https://nodejs.org  then re-run this script."
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "${NODE_MAJOR}" -lt 18 ]; then err "Node ${NODE_MAJOR} found; need 18+."; exit 1; fi
NODE_BIN="$(command -v node)"

# --- collect config ---------------------------------------------------------
SITE_URL="${SITE_URL:-}"
WIFI_INGEST_SECRET="${WIFI_INGEST_SECRET:-}"
if [ -z "${SITE_URL}" ]; then read -r -p "Your site URL [https://text2sale.com]: " SITE_URL; fi
SITE_URL="${SITE_URL:-https://text2sale.com}"
if [ -z "${WIFI_INGEST_SECRET}" ]; then
  read -r -p "WIFI_INGEST_SECRET (the same value you set on Vercel): " WIFI_INGEST_SECRET
fi
[ -n "${WIFI_INGEST_SECRET}" ] || { err "WIFI_INGEST_SECRET is required."; exit 1; }
PIHOLE_URL="${PIHOLE_URL:-}"
PIHOLE_TOKEN="${PIHOLE_TOKEN:-}"
HOUSEHOLD="${HOUSEHOLD:-home}"
INTERVAL_SEC="${INTERVAL_SEC:-60}"

# --- quick connectivity test ------------------------------------------------
say "Testing one collection cycle…"
if SITE_URL="${SITE_URL}" WIFI_INGEST_SECRET="${WIFI_INGEST_SECRET}" \
   PIHOLE_URL="${PIHOLE_URL}" PIHOLE_TOKEN="${PIHOLE_TOKEN}" \
   HOUSEHOLD="${HOUSEHOLD}" INTERVAL_SEC=0 \
   STATE_FILE="${COLLECTOR_DIR}/.wifi-state.json" \
   "${NODE_BIN}" "${COLLECT_JS}"; then
  say "Test cycle sent. If it printed 'ingest 200', the site is receiving data."
else
  err "Test cycle failed. Check SITE_URL, the secret, and that step ①/② are done. Setting up the service anyway."
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
Environment=STATE_FILE=${COLLECTOR_DIR}/.wifi-state.json
ExecStart=${NODE_BIN} ${COLLECT_JS}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
UNIT
  sudo systemctl daemon-reload
  sudo systemctl enable --now wifi-collector
  say "Done. It runs in the background and starts on boot."
  echo "  Watch logs:  journalctl -u wifi-collector -f"
  echo "  Stop:        sudo systemctl disable --now wifi-collector"
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
    <key>STATE_FILE</key><string>${COLLECTOR_DIR}/.wifi-state.json</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict></plist>
PLIST
  launchctl unload "${plist}" 2>/dev/null || true
  launchctl load "${plist}"
  say "Done. It runs in the background and starts on login."
  echo "  Stop:  launchctl unload ${plist}"
}

install_nohup() {
  say "No systemd/launchd — starting with nohup (won't auto-start on reboot)."
  SITE_URL="${SITE_URL}" WIFI_INGEST_SECRET="${WIFI_INGEST_SECRET}" \
  PIHOLE_URL="${PIHOLE_URL}" PIHOLE_TOKEN="${PIHOLE_TOKEN}" \
  HOUSEHOLD="${HOUSEHOLD}" INTERVAL_SEC="${INTERVAL_SEC}" \
  STATE_FILE="${COLLECTOR_DIR}/.wifi-state.json" \
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
say "All set. Open ${SITE_URL}/command → Home WiFi. The badge turns LIVE within ~a minute."

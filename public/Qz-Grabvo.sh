#!/usr/bin/env bash
# =============================================================================
#   Grabvo QZ Tray Auto-Installer (macOS + Linux)
#   ---------------------------------------------------------------------------
#   Installs QZ Tray and registers the Grabvo certificate for silent
#   printing. Mirrors Qz-Grabvo.cmd (the Windows installer in this same
#   folder) step-for-step, including its UI conventions (borrowed from
#   LinkCatty, github.com/maiz-an/LinkCatty: glyph badges, a live spinner +
#   progress bar, a boxed summary card at the end).
#
#   Usage (once hosted, e.g. at qz.grabvo.app):
#     curl -fsSL https://qz.grabvo.app/Qz-Grabvo.sh | bash
#   Or download and run directly:
#     bash Qz-Grabvo.sh
#
#   Install/uninstall commands below are the ones QZ Tray's own docs give
#   for unattended deployment (https://qz.io/docs/deployment):
#     macOS:  sudo installer -pkg qz-tray-X.pkg -target /
#     Linux:  sudo bash qz-tray-X.run
#   Asset names are confirmed against the current qzind/tray GitHub
#   release. Everything else here (auto-start entries, the override.crt
#   backup, exact per-user trust file paths) is best-effort, written
#   defensively with a warning instead of a hard failure when uncertain -
#   this has been syntax-checked and dry-run tested, but NOT run against
#   real QZ Tray installs on macOS/Linux hardware. Do a real test print
#   before wide rollout.
# =============================================================================

set -uo pipefail

# -----------------------------------------------------------------------
# UI (colors only when stdout is a real terminal; ASCII fallback otherwise)
# -----------------------------------------------------------------------
if [ -t 1 ] && [ "${TERM:-dumb}" != "dumb" ]; then
  C_R=$'\033[0m'; C_B=$'\033[1m'
  C_PU=$'\033[38;5;141m'; C_GR=$'\033[38;5;78m'; C_RD=$'\033[38;5;203m'
  C_AM=$'\033[38;5;214m'; C_SL=$'\033[38;5;245m'; C_WH=$'\033[38;5;231m'; C_DGR=$'\033[38;5;240m'
  G_OK="✔"; G_FAIL="✖"; G_WARN="⚠"; G_ARROW="›"
  G_BAR1="━"; G_BAR2="─"; G_TL="┌"; G_V="│"; G_BL="└"
  SPIN_FRAMES=(⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏)
  CUR_HIDE=$'\033[?25l'; CUR_SHOW=$'\033[?25h'
else
  C_R=""; C_B=""; C_PU=""; C_GR=""; C_RD=""; C_AM=""; C_SL=""; C_WH=""; C_DGR=""
  G_OK="+"; G_FAIL="x"; G_WARN="!"; G_ARROW=">"
  G_BAR1="#"; G_BAR2="."; G_TL="+"; G_V="|"; G_BL="+"
  SPIN_FRAMES=(- '\' '|' /)
  CUR_HIDE=""; CUR_SHOW=""
fi
RULE=$(printf '%*s' 58 '' | tr ' ' '-')

ui_ok()    { printf '  %s%s%s   %s%s%s\n' "${C_GR}${C_B}" "$G_OK" "$C_R" "$C_WH" "$1" "$C_R"; }
ui_warn()  { printf '  %s%s%s   %s%s%s\n' "${C_AM}${C_B}" "$G_WARN" "$C_R" "$C_AM" "$1" "$C_R"; }
ui_fail()  { printf '  %s%s%s   %s%s%s\n' "${C_RD}${C_B}" "$G_FAIL" "$C_R" "${C_RD}${C_B}" "$1" "$C_R"; }
ui_arrow() { printf '  %s%s%s   %s%s%s\n' "$C_PU" "$G_ARROW" "$C_R" "$C_SL" "$1" "$C_R"; }
ui_header(){
  printf '\n  %s%s[%s]%s  %s%s%s%s\n' "$C_PU" "$C_B" "$1" "$C_R" "$C_WH" "$C_B" "$2" "$C_R"
  printf '  %s%s%s\n' "$C_DGR" "$RULE" "$C_R"
}
ui_banner(){
  printf '\n  %s- a Grabvo tool -%s\n' "$C_DGR" "$C_R"
  printf '  %s%sGRABVO%s  %sQZ Tray Setup%s\n' "$C_B" "$C_PU" "$C_R" "$C_DGR" "$C_R"
  printf '  %s%s%s\n' "$C_DGR" "$RULE" "$C_R"
  printf '  %sInstall QZ Tray + trust the Grabvo certificate%s\n' "$C_SL" "$C_R"
  printf '  %sfor silent printing, with no popups.%s\n\n' "$C_SL" "$C_R"
}

BAR_SPIN_I=0
BF_LAST=-1
ui_bar() {
  local done=$1 total=$2 label=$3 text=$4
  local pct=$(( total > 0 ? done * 100 / total : 0 ))
  local filled=$(( total > 0 ? done * 28 / total : 0 ))
  local frame="${SPIN_FRAMES[$((BAR_SPIN_I % ${#SPIN_FRAMES[@]}))]}"
  BAR_SPIN_I=$((BAR_SPIN_I + 1))
  local bar1="" bar2="" i
  for ((i = 0; i < filled; i++)); do bar1+="$G_BAR1"; done
  for ((i = filled; i < 28; i++)); do bar2+="$G_BAR2"; done
  printf '\r\033[2K  %s%s%s %s  %s%s%s%s%s  %s%d%%%s  %s%s%s' \
    "$C_PU" "$frame" "$C_R" "$label" "$C_PU" "$bar1" "$C_R" "$C_DGR" "$bar2" "$C_B" "$pct" "$C_R" "$C_DGR" "$text" "$C_R"
}
ui_bar_done(){ printf '\n'; }

ui_card_top(){ printf '  %s%s%s %s%s\n' "${C_GR}${C_B}" "$G_TL" "$C_R" "$1" "$C_R"; }
ui_row(){ printf '  %s%s%s  %s%s%s  %s\n' "$C_GR" "$G_V" "$C_R" "$C_DGR" "$1" "$C_R" "$2"; }
ui_card_end(){ printf '  %s%s%s\n' "${C_GR}${C_B}" "$G_BL" "$C_R"; }

# -----------------------------------------------------------------------
# Config
# -----------------------------------------------------------------------
CERT_URL="https://qz.grabvo.app/Grabvo.crt"
WORK_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t grabvoqz)"
MAX_RETRIES=3
RETRY_DELAY=4
FINAL_STATE="WARN"
REGISTER_OK=0
STARTUP_OK=0
RUNNING=0
QZ_NUM="?"

trap 'rm -rf "$WORK_DIR" 2>/dev/null' EXIT

OS_RAW="$(uname -s)"
case "$OS_RAW" in
  Darwin) PLATFORM="mac" ;;
  Linux)  PLATFORM="linux" ;;
  *) echo "Unsupported OS: $OS_RAW (this script supports macOS and Linux - use Qz-Grabvo.cmd on Windows)" >&2; exit 1 ;;
esac

ARCH_RAW="$(uname -m)"
case "$ARCH_RAW" in
  x86_64|amd64)  ARCH="x86_64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  riscv64)       ARCH="riscv64" ;;
  *)             ARCH="x86_64" ;;  # best-effort fallback
esac

if [ "$PLATFORM" = "mac" ]; then
  QZ_APP="/Applications/QZ Tray.app"
  QZ_BIN="$QZ_APP/Contents/MacOS/QZ Tray"
  QZ_UNINSTALLER="$QZ_APP/Contents/Resources/uninstall"
  QZ_OVERRIDE_DIR="$QZ_APP/Contents/Resources"
else
  QZ_APP="/opt/qz-tray"
  QZ_BIN="/opt/qz-tray/qz-tray"
  QZ_UNINSTALLER="/opt/qz-tray/uninstall"
  QZ_OVERRIDE_DIR="/opt/qz-tray"
fi

# The real (non-root) user, so the certificate is trusted for the person
# actually printing - not for root, in case this was invoked via sudo.
REAL_USER="${SUDO_USER:-$(id -un)}"
if [ "$PLATFORM" = "mac" ]; then
  REAL_HOME="$(dscl . -read "/Users/$REAL_USER" NFSHomeDirectory 2>/dev/null | awk '{print $2}')"
fi
if [ -z "${REAL_HOME:-}" ]; then
  REAL_HOME="$(eval echo "~$REAL_USER" 2>/dev/null)"
fi
[ -n "${REAL_HOME:-}" ] || REAL_HOME="$HOME"

run_as_user() {
  if [ "$(id -u)" = "0" ] && [ "$REAL_USER" != "root" ]; then
    sudo -u "$REAL_USER" -H "$@"
  else
    "$@"
  fi
}

# Portable "run this, but don't let it hang forever" - GNU `timeout` isn't
# on macOS by default, so this backgrounds + kills instead of relying on it.
run_with_timeout() {
  local secs=$1; shift
  "$@" &
  local pid=$!
  ( sleep "$secs"; kill -0 "$pid" 2>/dev/null && kill "$pid" 2>/dev/null ) &
  local watchdog=$!
  wait "$pid" 2>/dev/null
  local code=$?
  kill "$watchdog" 2>/dev/null
  wait "$watchdog" 2>/dev/null
  return $code
}

filesize() {
  stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null || echo 0
}

# -----------------------------------------------------------------------
# Live-progress download. $1 URL  $2 out file  $3 friendly label
# -----------------------------------------------------------------------
download() {
  local url=$1 out=$2 label=${3:-Downloading}
  local attempt=0
  while [ "$attempt" -lt "$MAX_RETRIES" ]; do
    attempt=$((attempt + 1))
    rm -f "$out" 2>/dev/null

    local total_kb=0
    local cl
    cl="$(curl -sIL --max-time 15 "$url" 2>/dev/null | tr -d '\r' | grep -i '^content-length:' | tail -1 | awk '{print $2}')"
    [ -n "${cl:-}" ] && total_kb=$((cl / 1024))

    curl -fL --connect-timeout 20 --max-time 600 -o "$out" "$url" >/dev/null 2>&1 &
    local pid=$!
    printf '%s' "$CUR_HIDE"
    while kill -0 "$pid" 2>/dev/null; do
      local kb=0
      [ -f "$out" ] && kb=$(( $(filesize "$out") / 1024 ))
      local pct=0
      if [ "$total_kb" -gt 0 ]; then
        pct=$((kb * 100 / total_kb))
        [ "$pct" -gt 99 ] && pct=99
        local mb=$((kb / 1024)) tmb=$((total_kb / 1024))
        ui_bar "$pct" 100 "$label" "${mb} / ${tmb} MB"
      else
        ui_bar 0 100 "$label" "${kb} KB"
      fi
      sleep 0.3
    done
    wait "$pid"
    local code=$?
    ui_bar 100 100 "$label" "done"
    ui_bar_done
    printf '%s' "$CUR_SHOW"

    if [ "$code" -eq 0 ] && [ -f "$out" ] && [ "$(filesize "$out")" -gt 0 ]; then
      return 0
    fi
    rm -f "$out" 2>/dev/null
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      ui_warn "Attempt $attempt/$MAX_RETRIES failed - retrying in ${RETRY_DELAY}s"
      sleep "$RETRY_DELAY"
    fi
  done
  return 1
}

# =========================================================================
clear 2>/dev/null || true
ui_banner

# -------------------------------------------------------------------------
# STEP 1 - Workspace
# -------------------------------------------------------------------------
ui_header "1/8" "Preparing workspace"
if [ ! -d "$WORK_DIR" ]; then
  ui_fail "Could not create a temp folder"
  exit 1
fi
ui_ok "Workspace ready"

# -------------------------------------------------------------------------
# STEP 2 - Find latest QZ Tray version
# -------------------------------------------------------------------------
ui_header "2/8" "Checking for the latest QZ Tray version"
QZ_VERSION="$(curl -fsSL --max-time 20 -H 'User-Agent: Grabvo-Setup' \
  https://api.github.com/repos/qzind/tray/releases/latest 2>/dev/null \
  | grep -m1 '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')"
if [ -z "${QZ_VERSION:-}" ]; then
  QZ_VERSION="v2.2.6"
  ui_warn "Could not reach GitHub - using fallback v2.2.6"
else
  ui_ok "Latest version is $QZ_VERSION"
fi
QZ_NUM="${QZ_VERSION#v}"

# -------------------------------------------------------------------------
# STEP 3 - Download QZ Tray installer
# -------------------------------------------------------------------------
ui_header "3/8" "Downloading QZ Tray"
if [ "$PLATFORM" = "mac" ]; then
  PKG_EXT="pkg"
else
  PKG_EXT="run"
fi
QZ_PKG="$WORK_DIR/qz-tray-installer.$PKG_EXT"
QZ_URL="https://github.com/qzind/tray/releases/download/$QZ_VERSION/qz-tray-$QZ_NUM-$ARCH.$PKG_EXT"
download "$QZ_URL" "$QZ_PKG" "QZ Tray $QZ_NUM"

if [ ! -s "$QZ_PKG" ]; then
  ui_fail "Download failed after all retries"
  exit 1
fi
ui_ok "Downloaded QZ Tray $QZ_NUM"

# -------------------------------------------------------------------------
# STEP 4 - Install QZ Tray
# -------------------------------------------------------------------------
ui_header "4/8" "Installing QZ Tray"
ui_arrow "Setting up QZ Tray - this may take a minute (you may be asked for your password)"
INSTALL_OK=0
if [ "$PLATFORM" = "mac" ]; then
  if sudo installer -pkg "$QZ_PKG" -target / >/dev/null 2>&1; then
    INSTALL_OK=1
  fi
else
  if sudo bash "$QZ_PKG" >/dev/null 2>&1; then
    INSTALL_OK=1
  fi
fi

if [ "$INSTALL_OK" -eq 1 ] && { [ -e "$QZ_BIN" ] || [ -d "$QZ_APP" ]; }; then
  ui_ok "QZ Tray installed"
else
  ui_fail "Install did not complete - see above for any installer output"
  exit 1
fi

# -------------------------------------------------------------------------
# STEP 5 - Download the Grabvo certificate
# -------------------------------------------------------------------------
ui_header "5/8" "Downloading the Grabvo certificate"
CERT_FILE="$WORK_DIR/Grabvo.crt"
download "$CERT_URL" "$CERT_FILE" "Grabvo certificate"

if [ ! -s "$CERT_FILE" ]; then
  ui_fail "Could not download $CERT_URL"
  exit 1
fi
if grep -q "BEGIN CERTIFICATE" "$CERT_FILE" 2>/dev/null; then
  ui_ok "Certificate downloaded and verified"
else
  ui_warn "File doesn't look like a certificate - QZ Tray will validate it"
fi

# -------------------------------------------------------------------------
# STEP 6 - Register the certificate with QZ Tray
# -------------------------------------------------------------------------
ui_header "6/8" "Registering the certificate with QZ Tray"

if [ "$PLATFORM" = "mac" ]; then
  USER_ALLOWED="$REAL_HOME/Library/Application Support/qz/allowed.dat"
else
  # QZ Tray's own docs give this exact (slightly unusual) path for Linux;
  # the more common "~/.qz/allowed.dat" convention is checked too, in
  # case a given QZ Tray build differs from the docs.
  USER_ALLOWED="$REAL_HOME/qz/qz/allowed.dat"
  USER_ALLOWED_ALT="$REAL_HOME/.qz/allowed.dat"
fi

before_size=0
[ -f "$USER_ALLOWED" ] && before_size=$(filesize "$USER_ALLOWED")
before_size_alt=0
[ -n "${USER_ALLOWED_ALT:-}" ] && [ -f "$USER_ALLOWED_ALT" ] && before_size_alt=$(filesize "$USER_ALLOWED_ALT")

if [ -e "$QZ_BIN" ]; then
  ui_arrow "Registering with QZ Tray"
  run_with_timeout 12 run_as_user "$QZ_BIN" --allow "$CERT_FILE" >/dev/null 2>&1
  sleep 1

  after_size=0
  [ -f "$USER_ALLOWED" ] && after_size=$(filesize "$USER_ALLOWED")
  after_size_alt=0
  [ -n "${USER_ALLOWED_ALT:-}" ] && [ -f "$USER_ALLOWED_ALT" ] && after_size_alt=$(filesize "$USER_ALLOWED_ALT")

  if [ "$after_size" -gt "$before_size" ] || { [ -n "${USER_ALLOWED_ALT:-}" ] && [ "$after_size_alt" -gt "$before_size_alt" ]; }; then
    REGISTER_OK=1
    ui_ok "Certificate registered with QZ Tray"
  else
    ui_warn "Whitelist didn't change allowed.dat - using backups"
  fi
else
  ui_warn "QZ Tray binary not found at $QZ_BIN - using backups"
fi

# Backup: override.crt next to the app (best-effort - mirrors the
# Windows installer's own override.crt fallback, unverified on this OS).
if [ -d "$QZ_OVERRIDE_DIR" ]; then
  if sudo cp "$CERT_FILE" "$QZ_OVERRIDE_DIR/override.crt" 2>/dev/null; then
    [ "$REGISTER_OK" -eq 0 ] && REGISTER_OK=1
    ui_ok "Backup registered ($QZ_OVERRIDE_DIR)"
  fi
fi

if [ "$REGISTER_OK" -eq 0 ]; then
  ui_fail "Could not register the certificate"
  exit 1
fi

# -------------------------------------------------------------------------
# STEP 7 - Auto-start on login (best-effort)
# -------------------------------------------------------------------------
ui_header "7/8" "Setting up auto-start"
if [ "$PLATFORM" = "mac" ]; then
  AGENT_DIR="$REAL_HOME/Library/LaunchAgents"
  AGENT_PLIST="$AGENT_DIR/com.grabvo.qztray.plist"
  if run_as_user mkdir -p "$AGENT_DIR" 2>/dev/null; then
    run_as_user tee "$AGENT_PLIST" >/dev/null 2>&1 <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.grabvo.qztray</string>
    <key>ProgramArguments</key>
    <array>
        <string>$QZ_BIN</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
PLIST
    if [ -f "$AGENT_PLIST" ]; then
      run_as_user launchctl unload "$AGENT_PLIST" >/dev/null 2>&1
      run_as_user launchctl load "$AGENT_PLIST" >/dev/null 2>&1
      STARTUP_OK=1
      ui_ok "QZ Tray will start automatically on login"
    fi
  fi
else
  AUTOSTART_DIR="$REAL_HOME/.config/autostart"
  AUTOSTART_FILE="$AUTOSTART_DIR/qz-tray.desktop"
  if run_as_user mkdir -p "$AUTOSTART_DIR" 2>/dev/null; then
    run_as_user tee "$AUTOSTART_FILE" >/dev/null 2>&1 <<DESKTOP
[Desktop Entry]
Type=Application
Name=QZ Tray
Exec=$QZ_BIN
X-GNOME-Autostart-enabled=true
DESKTOP
    if [ -f "$AUTOSTART_FILE" ]; then
      STARTUP_OK=1
      ui_ok "QZ Tray will start automatically on login"
    fi
  fi
fi
if [ "$STARTUP_OK" -eq 0 ]; then
  ui_warn "Could not set up auto-start - QZ Tray may need to be launched manually"
fi

# -------------------------------------------------------------------------
# STEP 8 - Start QZ Tray and verify
# -------------------------------------------------------------------------
ui_header "8/8" "Starting QZ Tray"
LAUNCHED=0
if [ "$PLATFORM" = "mac" ]; then
  if run_as_user open -a "QZ Tray" >/dev/null 2>&1; then
    LAUNCHED=1
  fi
else
  if [ -x "$QZ_BIN" ]; then
    run_as_user nohup "$QZ_BIN" >/dev/null 2>&1 &
    disown 2>/dev/null || true
    LAUNCHED=1
  fi
fi

if [ "$LAUNCHED" -eq 1 ]; then
  ui_ok "QZ Tray started"
  sleep 3
  if [ "$PLATFORM" = "mac" ]; then
    pgrep -f "QZ Tray" >/dev/null 2>&1 && RUNNING=1
  else
    pgrep -f "qz-tray" >/dev/null 2>&1 && RUNNING=1
  fi
  if [ "$RUNNING" -eq 1 ]; then
    ui_ok "QZ Tray is running"
    FINAL_STATE="OK"
  else
    ui_warn "QZ Tray didn't stay running - check manually"
    FINAL_STATE="WARN"
  fi
else
  ui_warn "Could not start QZ Tray automatically"
  FINAL_STATE="WARN"
fi

# =========================================================================
# COMPLETION - one boxed summary
# =========================================================================
clear 2>/dev/null || true
echo
if [ "$FINAL_STATE" = "OK" ]; then
  printf '  %s%s%s SETUP COMPLETE%s\n' "${C_GR}${C_B}" "$G_OK" "" "$C_R"
  printf '  %sQZ Tray is installed and ready to print%s\n' "$C_SL" "$C_R"
else
  printf '  %s%s%s FINISHED WITH WARNINGS%s\n' "${C_AM}${C_B}" "$G_WARN" "" "$C_R"
  printf '  %sQZ Tray didn'"'"'t stay running after setup%s\n' "$C_SL" "$C_R"
fi
printf '  %s%s%s\n\n' "$C_DGR" "$RULE" "$C_R"

ui_card_top "SUMMARY"
ui_row "Version    " "$QZ_NUM"
ui_row "Location   " "$QZ_APP"
if [ "$REGISTER_OK" -eq 1 ]; then ui_row "Certificate" "trusted"; else ui_row "Certificate" "not confirmed - retry this installer"; fi
if [ "$STARTUP_OK" -eq 1 ]; then ui_row "Auto-start " "on login"; else ui_row "Auto-start " "not set - launch QZ Tray manually"; fi
if [ "$RUNNING" -eq 1 ]; then ui_row "Status     " "running"; else ui_row "Status     " "not confirmed"; fi
ui_card_end
echo

if [ "$FINAL_STATE" = "OK" ]; then
  printf '  %sPrinting will now run without any popups or prompts.%s\n\n' "$C_WH" "$C_R"
  printf '  %sVerify: open QZ Tray, then Advanced -> Site Manager%s\n' "$C_SL" "$C_R"
else
  printf '  %sQZ Tray was installed and the certificate was registered,%s\n' "$C_WH" "$C_R"
  printf '  %sbut QZ Tray didn'"'"'t stay running after it was started.%s\n\n' "$C_WH" "$C_R"
  printf '  %sTry this:%s\n' "$C_SL" "$C_R"
  printf '  %s  1. Launch QZ Tray from Applications / your app menu%s\n' "$C_SL" "$C_R"
  printf '  %s  2. Open it, then Advanced -> Site Manager - confirm Grabvo is listed%s\n' "$C_SL" "$C_R"
  printf '  %s  3. If it isn'"'"'t, run this installer again%s\n' "$C_SL" "$C_R"
fi
echo

[ "$FINAL_STATE" = "OK" ]

#!/usr/bin/env bash
# =============================================================================
#   Grabvo QZ Tray Uninstaller (macOS + Linux)
#   ---------------------------------------------------------------------------
#   Removes QZ Tray, its auto-start entry, and the Grabvo certificate trust.
#   Mirrors Qz-Grabvo-Uninstall.cmd (the Windows uninstaller in this same
#   folder) step-for-step, same UI conventions as Qz-Grabvo.sh.
#
#   Usage:
#     curl -fsSL https://qz.grabvo.app/Qz-Grabvo-Uninstall.sh | bash
#   Or download and run directly:
#     bash Qz-Grabvo-Uninstall.sh
#
#   Uninstall commands are the ones QZ Tray's own docs give
#   (https://qz.io/docs/deployment):
#     macOS (2.2+): sudo bash "/Applications/QZ Tray.app/Contents/Resources/uninstall"
#     Linux:        sudo bash /opt/qz-tray/uninstall
#   The auto-start entry removed here is the one Qz-Grabvo.sh creates
#   (~/Library/LaunchAgents/com.grabvo.qztray.plist on macOS,
#   ~/.config/autostart/qz-tray.desktop on Linux) - it won't know about a
#   different auto-start mechanism QZ Tray's own installer may add.
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

BAR_SPIN_I=0
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

ui_card_top(){ printf '  %s%s%s %s%s\n' "${C_GR}${C_B}" "$G_TL" "$C_R" "$1" "$C_R"; }
ui_row(){ printf '  %s%s%s  %s%s%s  %s\n' "$C_GR" "$G_V" "$C_R" "$C_DGR" "$1" "$C_R" "$2"; }
ui_card_end(){ printf '  %s%s%s\n' "${C_GR}${C_B}" "$G_BL" "$C_R"; }

# -----------------------------------------------------------------------
OS_RAW="$(uname -s)"
case "$OS_RAW" in
  Darwin) PLATFORM="mac" ;;
  Linux)  PLATFORM="linux" ;;
  *) echo "Unsupported OS: $OS_RAW (this script supports macOS and Linux - use Qz-Grabvo-Uninstall.cmd on Windows)" >&2; exit 1 ;;
esac

if [ "$PLATFORM" = "mac" ]; then
  QZ_APP="/Applications/QZ Tray.app"
  QZ_UNINSTALLER="$QZ_APP/Contents/Resources/uninstall"
  QZ_UNINSTALLER_LEGACY="$QZ_APP/Contents/uninstall"
else
  QZ_APP="/opt/qz-tray"
  QZ_UNINSTALLER="/opt/qz-tray/uninstall"
fi

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

if [ "$PLATFORM" = "mac" ]; then
  USER_ALLOWED="$REAL_HOME/Library/Application Support/qz/allowed.dat"
  USER_DATA_DIR="$REAL_HOME/Library/Application Support/qz"
  AGENT_PLIST="$REAL_HOME/Library/LaunchAgents/com.grabvo.qztray.plist"
else
  USER_DATA_DIR="$REAL_HOME/qz"
  USER_DATA_DIR_ALT="$REAL_HOME/.qz"
  AUTOSTART_FILE="$REAL_HOME/.config/autostart/qz-tray.desktop"
fi

FINAL_STATE="WARN"
VERIFY_OK=1

# =========================================================================
clear 2>/dev/null || true
echo
printf '  %s- a Grabvo tool -%s\n' "$C_DGR" "$C_R"
printf '  %s%sGRABVO%s  %sQZ Tray Uninstaller%s\n' "$C_B" "$C_PU" "$C_R" "$C_DGR" "$C_R"
printf '  %s%s%s\n' "$C_DGR" "$RULE" "$C_R"
printf '  %sThis will remove QZ Tray and its trust data from this%s\n' "$C_AM" "$C_R"
printf '  %scomputer. You can always reinstall with the Grabvo%s\n' "$C_AM" "$C_R"
printf '  %sinstaller if you change your mind.%s\n\n' "$C_AM" "$C_R"
printf '%s' "$CUR_HIDE"
for i in 1 2 3; do
  ui_bar "$i" 3 "Starting" "${i} s"
  sleep 1
done
printf '\n%s\n\n' "$CUR_SHOW"

# -------------------------------------------------------------------------
# STEP 1 - Stop QZ Tray processes
# -------------------------------------------------------------------------
ui_header "1/6" "Stopping QZ Tray"
if [ "$PLATFORM" = "mac" ]; then
  pkill -f "QZ Tray" >/dev/null 2>&1 || true
else
  pkill -f "qz-tray" >/dev/null 2>&1 || true
fi
sleep 1
ui_ok "QZ Tray processes stopped"

# -------------------------------------------------------------------------
# STEP 2 - Auto-start entry (the one Qz-Grabvo.sh creates)
# -------------------------------------------------------------------------
ui_header "2/6" "Removing the auto-start entry"
if [ "$PLATFORM" = "mac" ]; then
  if [ -f "$AGENT_PLIST" ]; then
    run_as_user launchctl unload "$AGENT_PLIST" >/dev/null 2>&1
    run_as_user rm -f "$AGENT_PLIST" >/dev/null 2>&1
    if [ ! -f "$AGENT_PLIST" ]; then
      ui_ok "Removed the login item"
    else
      ui_warn "Could not remove $AGENT_PLIST"
    fi
  else
    ui_ok "No login item present"
  fi
else
  if [ -f "$AUTOSTART_FILE" ]; then
    run_as_user rm -f "$AUTOSTART_FILE" >/dev/null 2>&1
    if [ ! -f "$AUTOSTART_FILE" ]; then
      ui_ok "Removed the autostart entry"
    else
      ui_warn "Could not remove $AUTOSTART_FILE"
    fi
  else
    ui_ok "No autostart entry present"
  fi
fi

# -------------------------------------------------------------------------
# STEP 3 - Run the official uninstaller
# -------------------------------------------------------------------------
ui_header "3/6" "Removing the QZ Tray application"
UNINSTALLER_FOUND=""
if [ -f "$QZ_UNINSTALLER" ]; then
  UNINSTALLER_FOUND="$QZ_UNINSTALLER"
elif [ "$PLATFORM" = "mac" ] && [ -f "$QZ_UNINSTALLER_LEGACY" ]; then
  UNINSTALLER_FOUND="$QZ_UNINSTALLER_LEGACY"
fi

if [ -n "$UNINSTALLER_FOUND" ]; then
  ui_arrow "Running the QZ Tray uninstaller (you may be asked for your password)"
  # QZ Tray's own uninstaller commonly exits non-zero even on success
  # (the Windows uninstaller has the exact same documented quirk) - the
  # STEP 4 folder check below is what actually decides success here.
  sudo bash "$UNINSTALLER_FOUND" >/dev/null 2>&1 || true
  sleep 2
  if [ ! -d "$QZ_APP" ]; then
    ui_ok "QZ Tray removed"
  else
    ui_warn "Uninstaller finished but $QZ_APP is still present - removing directly"
  fi
else
  ui_warn "No uninstaller found - will remove the application folder directly"
fi

# -------------------------------------------------------------------------
# STEP 4 - Clean up the application folder
# -------------------------------------------------------------------------
ui_header "4/6" "Cleaning up the application folder"
if [ -d "$QZ_APP" ]; then
  sudo rm -rf "$QZ_APP" >/dev/null 2>&1
fi
if [ -d "$QZ_APP" ]; then
  ui_warn "Could not fully remove $QZ_APP"
  VERIFY_OK=0
else
  ui_ok "Removed $QZ_APP"
fi

# -------------------------------------------------------------------------
# STEP 5 - Remove certificate trust
# -------------------------------------------------------------------------
ui_header "5/6" "Removing certificate trust"
if [ -d "$USER_DATA_DIR" ]; then
  run_as_user rm -rf "$USER_DATA_DIR" >/dev/null 2>&1
  if [ ! -d "$USER_DATA_DIR" ]; then
    ui_ok "Removed per-user trust data"
  else
    ui_warn "Could not remove $USER_DATA_DIR"
    VERIFY_OK=0
  fi
else
  ui_ok "No per-user trust data present"
fi
if [ "$PLATFORM" = "linux" ] && [ -d "${USER_DATA_DIR_ALT:-/nonexistent}" ]; then
  run_as_user rm -rf "$USER_DATA_DIR_ALT" >/dev/null 2>&1
  [ ! -d "$USER_DATA_DIR_ALT" ] && ui_ok "Removed per-user trust data (alt path)"
fi

# -------------------------------------------------------------------------
# STEP 6 - Verify
# -------------------------------------------------------------------------
ui_header "6/6" "Verifying removal"
if [ -d "$QZ_APP" ]; then VERIFY_OK=0; fi
if [ "$PLATFORM" = "mac" ]; then
  pgrep -f "QZ Tray" >/dev/null 2>&1 && VERIFY_OK=0
else
  pgrep -f "qz-tray" >/dev/null 2>&1 && VERIFY_OK=0
fi

if [ "$VERIFY_OK" -eq 1 ]; then
  ui_ok "Verified: QZ Tray is fully removed"
  FINAL_STATE="OK"
else
  ui_warn "Some QZ Tray files or processes are still present"
  FINAL_STATE="WARN"
fi

# =========================================================================
# COMPLETION - one boxed summary
# =========================================================================
clear 2>/dev/null || true
echo
if [ "$FINAL_STATE" = "OK" ]; then
  printf '  %s%s%s UNINSTALL COMPLETE%s\n' "${C_GR}${C_B}" "$G_OK" "" "$C_R"
  printf '  %sQZ Tray has been removed from this computer%s\n' "$C_SL" "$C_R"
else
  printf '  %s%s%s CLEANUP FINISHED WITH WARNINGS%s\n' "${C_AM}${C_B}" "$G_WARN" "" "$C_R"
  printf '  %sSome QZ Tray files could not be removed%s\n' "$C_SL" "$C_R"
fi
printf '  %s%s%s\n\n' "$C_DGR" "$RULE" "$C_R"

ui_card_top "SUMMARY"
if [ "$VERIFY_OK" -eq 1 ]; then ui_row "Application" "removed"; else ui_row "Application" "some files remain"; fi
ui_row "Trust data " "$USER_DATA_DIR"
ui_row "Auto-start " "cleared"
ui_card_end
echo

if [ "$FINAL_STATE" = "OK" ]; then
  printf '  %sQZ Tray and the Grabvo certificate trust have been%s\n' "$C_WH" "$C_R"
  printf '  %sremoved from this computer.%s\n' "$C_WH" "$C_R"
else
  printf '  %sSome QZ Tray files or processes are still present on this%s\n' "$C_WH" "$C_R"
  printf '  %scomputer. This usually means QZ Tray was still running when%s\n' "$C_WH" "$C_R"
  printf '  %sthis script started.%s\n\n' "$C_WH" "$C_R"
  printf '  %sTry this:%s\n' "$C_SL" "$C_R"
  printf '  %s  1. Quit QZ Tray from its menu bar / tray icon%s\n' "$C_SL" "$C_R"
  printf '  %s  2. Run this uninstaller again%s\n' "$C_SL" "$C_R"
  printf '  %s  3. If it still fails, restart and run it once more%s\n' "$C_SL" "$C_R"
fi
echo

[ "$FINAL_STATE" = "OK" ]

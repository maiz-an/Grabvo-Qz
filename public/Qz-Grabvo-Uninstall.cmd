@echo off
chcp 65001 >nul 2>&1
setlocal EnableExtensions EnableDelayedExpansion
title Grabvo - QZ Tray Uninstaller

:: =========================================================================
::   Grabvo QZ Tray Uninstaller (v6)
::   ------------------------------------------------------------------------
::   Removes QZ Tray, its auto-start entries, and the Grabvo certificate
::   trust. Handles the QZ Tray 2.1.1+ silent-uninstall quirk via
::   qz-print_silent=1 and a detached launch.
::
::   UI conventions match Qz-Grabvo.cmd - see that file for the source
::   of the glyph/spinner/bar toolkit (borrowed from LinkCatty,
::   github.com/maiz-an/LinkCatty). Pure ASCII on disk, CRLF endings, but
::   chcp 65001 is required up front since it PRINTS real UTF-8 glyphs -
::   without it a real console window shows mojibake (OEM code page).
:: =========================================================================

:: -------------------------------------------------------------------------
:: 1. Enable VT escape sequences
:: -------------------------------------------------------------------------
reg add "HKCU\Console" /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

:: -------------------------------------------------------------------------
:: 2. Self-elevate
:: -------------------------------------------------------------------------
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo   Requesting administrator privileges...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" >nul 2>&1
    exit /b
)

:: -------------------------------------------------------------------------
:: 3. Force a TrueType console font
:: -------------------------------------------------------------------------
:: See the matching comment in Qz-Grabvo.cmd - a freshly-elevated console
:: window can default to the legacy "Raster Fonts" bitmap font, which has
:: no glyphs for the box-drawing/braille characters below.
call :ensure_truetype_font

:: -------------------------------------------------------------------------
:: 4. UI init (glyphs, spinner, colors)
:: -------------------------------------------------------------------------
call :ui_init

set "R=!ESC![0m"
set "B=!ESC![1m"
set "PU=!ESC![38;5;141m"
set "GR=!ESC![38;5;78m"
set "RD=!ESC![38;5;203m"
set "AM=!ESC![38;5;214m"
set "SL=!ESC![38;5;245m"
set "WH=!ESC![38;5;231m"
set "DGR=!ESC![38;5;240m"

:: -------------------------------------------------------------------------
:: 5. Config
:: -------------------------------------------------------------------------
set "QZ_INSTALL_DIR=%PROGRAMFILES%\QZ Tray"
set "QZ_INSTALL_DIR_X86=%PROGRAMFILES(X86)%\QZ Tray"
set "QZ_USER_DATA=%APPDATA%\qz"
set "QZ_MACHINE_DATA=%PROGRAMDATA%\qz"
set "QZ_UNINSTALLER=%QZ_INSTALL_DIR%\uninstall.exe"

set "PROC_KILL=Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.ExecutablePath -like '*QZ Tray*' -or $_.CommandLine -like '*qz-tray.jar*' -or $_.Name -eq 'qz-tray.exe' -or $_.Name -eq 'qz-tray-console.exe' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Get-Process -Name 'qz-tray','qz-tray-console' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"

cls
call :banner

call :step1
call :step2
call :step3
call :step4
call :step5
call :step6
call :step7

goto :cleanup

:: =========================================================================
::   STEP 1 - Stop QZ Tray processes
:: =========================================================================
:step1
call :header "1/7" "Stopping QZ Tray"
powershell -NoProfile -Command "!PROC_KILL!" >nul 2>&1
timeout /t 2 /nobreak >nul 2>&1
call :ok "All QZ Tray processes stopped"
exit /b 0

:: =========================================================================
::   STEP 2 - Auto-start entries
:: =========================================================================
:step2
call :header "2/7" "Removing auto-start entries"

reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "QZ Tray" /f >nul 2>&1
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v "QZ Tray" /f >nul 2>&1
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\QZ Tray.lnk" >nul 2>&1
del /f /q "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\Startup\QZ Tray.lnk" >nul 2>&1
schtasks /Delete /TN "QZ Tray" /F >nul 2>&1
schtasks /Delete /TN "QZTray" /F >nul 2>&1
net stop "QZ Tray" >nul 2>&1
sc delete "QZ Tray" >nul 2>&1
call :ok "Auto-start, service, and scheduled tasks cleared"
exit /b 0

:: =========================================================================
::   STEP 3 - Run the official uninstaller
:: =========================================================================
:step3
call :header "3/7" "Removing QZ Tray application"

if not exist "%QZ_UNINSTALLER%" (
    call :warn "No uninstaller found - will remove folders directly"
    exit /b 0
)

set "qz-print_silent=1"
call :arrow "Running QZ Tray uninstaller"
powershell -NoProfile -Command "Start-Process -FilePath '%QZ_UNINSTALLER%' -ArgumentList '/S' -WindowStyle Hidden" >nul 2>&1

set /a POLL=0
set "BAR_LABEL=Waiting for uninstall"
set "BAR_TOTAL=30"
call :poll_uninstall
exit /b 0

:poll_uninstall
set "BAR_DONE=!POLL!"
call :ui_bar
timeout /t 2 /nobreak >nul 2>&1
set /a POLL+=1
if not exist "%QZ_INSTALL_DIR%\uninstall.exe" goto :poll_uninstall_gone
if !POLL! GEQ 30 goto :poll_uninstall_timeout
goto :poll_uninstall

:poll_uninstall_gone
set "BAR_DONE=30"
call :ui_bar
call :ui_cursor_show
echo.
call :ok "QZ Tray removed"
exit /b 0

:poll_uninstall_timeout
set "BAR_DONE=30"
call :ui_bar
call :ui_cursor_show
echo.
call :warn "Uninstaller timed out - removing folders directly"
exit /b 0

:: =========================================================================
::   STEP 4 - Clean up install folders
:: =========================================================================
:step4
call :header "4/7" "Cleaning up application folders"

powershell -NoProfile -Command "!PROC_KILL!" >nul 2>&1
timeout /t 2 /nobreak >nul 2>&1

if exist "%QZ_INSTALL_DIR%" (
    rd /s /q "%QZ_INSTALL_DIR%" >nul 2>&1
)
if exist "%QZ_INSTALL_DIR%" (
    call :warn "Could not fully remove: %QZ_INSTALL_DIR%"
) else (
    call :ok "Removed %QZ_INSTALL_DIR%"
)

if exist "%QZ_INSTALL_DIR_X86%" (
    rd /s /q "%QZ_INSTALL_DIR_X86%" >nul 2>&1
    if not exist "%QZ_INSTALL_DIR_X86%" (
        call :ok "Removed %QZ_INSTALL_DIR_X86%"
    )
)
exit /b 0

:: =========================================================================
::   STEP 5 - Remove certificate trust
:: =========================================================================
:step5
call :header "5/7" "Removing certificate trust"

if exist "%QZ_USER_DATA%" (
    rd /s /q "%QZ_USER_DATA%" >nul 2>&1
    if not exist "%QZ_USER_DATA%" (
        call :ok "Removed per-user trust data"
    ) else (
        call :warn "Could not remove %QZ_USER_DATA%"
    )
) else (
    call :ok "No per-user trust data present"
)

if exist "%QZ_MACHINE_DATA%" (
    rd /s /q "%QZ_MACHINE_DATA%" >nul 2>&1
    if not exist "%QZ_MACHINE_DATA%" (
        call :ok "Removed machine-wide trust data"
    ) else (
        call :warn "Could not remove %QZ_MACHINE_DATA%"
    )
) else (
    call :ok "No machine-wide trust data present"
)

if exist "%QZ_INSTALL_DIR%\override.crt" (
    del /f /q "%QZ_INSTALL_DIR%\override.crt" >nul 2>&1
)
exit /b 0

:: =========================================================================
::   STEP 6 - Shortcuts
:: =========================================================================
:step6
call :header "6/7" "Removing shortcuts"

rd /s /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\QZ Tray" >nul 2>&1
rd /s /q "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\QZ Tray" >nul 2>&1
del /f /q "%PUBLIC%\Desktop\QZ Tray.lnk" >nul 2>&1
del /f /q "%USERPROFILE%\Desktop\QZ Tray.lnk" >nul 2>&1
call :ok "Shortcut cleanup complete"
exit /b 0

:: =========================================================================
::   STEP 7 - Verify
:: =========================================================================
:step7
call :header "7/7" "Verifying removal"

set "VERIFY_OK=1"

if exist "%QZ_INSTALL_DIR%\qz-tray.jar" set "VERIFY_OK=0"
if exist "%QZ_INSTALL_DIR%\qz-tray.exe" set "VERIFY_OK=0"
if exist "%QZ_INSTALL_DIR%\uninstall.exe" set "VERIFY_OK=0"

tasklist /FI "IMAGENAME eq qz-tray.exe" 2>nul | find /I "qz-tray.exe" >nul
if !errorLevel! equ 0 set "VERIFY_OK=0"
tasklist /FI "IMAGENAME eq qz-tray-console.exe" 2>nul | find /I "qz-tray-console.exe" >nul
if !errorLevel! equ 0 set "VERIFY_OK=0"

if "!VERIFY_OK!"=="1" (
    call :ok "Verified: QZ Tray is fully removed"
    set "FINAL_STATE=OK"
) else (
    call :warn "Some QZ Tray files or processes are still present"
    set "FINAL_STATE=WARN"
)
call :complete
exit /b 0

:: =========================================================================
::   UI (pure ASCII on disk - real glyphs decoded from hex at runtime)
:: =========================================================================

:: Forces the CURRENT console window to a TrueType font (Consolas) via
:: the Win32 console API - see the matching subroutine in Qz-Grabvo.cmd
:: for the full explanation. Silent and best-effort.
:ensure_truetype_font
set "FONTFIX_PS1=%TEMP%\grabvo_fontfix_%RANDOM%.ps1"
> "%FONTFIX_PS1%" (
    echo $sig = @'
    echo using System;
    echo using System.Runtime.InteropServices;
    echo public static class GrabvoFontFix {
    echo     [StructLayout^(LayoutKind.Sequential^)]
    echo     public struct COORD { public short X; public short Y; }
    echo     [StructLayout^(LayoutKind.Sequential, CharSet = CharSet.Unicode^)]
    echo     public struct CONSOLE_FONT_INFO_EX {
    echo         public uint cbSize;
    echo         public uint nFont;
    echo         public COORD dwFontSize;
    echo         public int FontFamily;
    echo         public int FontWeight;
    echo         [MarshalAs^(UnmanagedType.ByValTStr, SizeConst = 32^)]
    echo         public string FontName;
    echo     }
    echo     [DllImport^("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode^)]
    echo     public static extern IntPtr CreateFile^(string fileName, uint desiredAccess, uint shareMode, IntPtr securityAttributes, uint creationDisposition, uint flagsAndAttributes, IntPtr templateFile^);
    echo     [DllImport^("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode^)]
    echo     public static extern bool SetCurrentConsoleFontEx^(IntPtr hConsoleOutput, bool bMaximumWindow, ref CONSOLE_FONT_INFO_EX lpConsoleCurrentFontEx^);
    echo     public static void Apply^(^) {
    echo         IntPtr h = CreateFile^("CONOUT$", 0xC0000000, 0x3, IntPtr.Zero, 3, 0, IntPtr.Zero^);
    echo         if ^(h == IntPtr.Zero ^|^| h.ToInt64^(^) == -1^) return;
    echo         CONSOLE_FONT_INFO_EX info = new CONSOLE_FONT_INFO_EX^(^);
    echo         info.cbSize = ^(uint^)Marshal.SizeOf^(info^);
    echo         info.FontFamily = 4;
    echo         info.FontName = "Consolas";
    echo         info.dwFontSize.X = 0;
    echo         info.dwFontSize.Y = 16;
    echo         SetCurrentConsoleFontEx^(h, false, ref info^);
    echo     }
    echo }
    echo '@
    echo Add-Type -TypeDefinition $sig -Language CSharp
    echo [GrabvoFontFix]::Apply^(^)
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%FONTFIX_PS1%" >nul 2>&1
del "%FONTFIX_PS1%" 2>nul
exit /b 0

:ui_init
set "ESC="
set "WINVER=0"
for /f "tokens=4 delims=. " %%v in ('ver') do set "WINVER=%%v"
if %WINVER% GEQ 10 (
    for /f %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
)
set "G_OK="
set "G_DOT="
if not defined ESC goto :ui_glyph_fallback
set "GL=%TEMP%\grabvoui_glyphs_%RANDOM%"
> "%GL%.hex" (
    echo e29c940d0a
    echo e29c960d0a
    echo e29aa00d0a
    echo e280ba0d0a
    echo e294810d0a
    echo e294800d0a
    echo e2948c0d0a
    echo e294820d0a
    echo e294940d0a
    echo e280a20d0a
    echo e2a08b0d0a
    echo e2a0990d0a
    echo e2a0b90d0a
    echo e2a0b80d0a
    echo e2a0bc0d0a
    echo e2a0b40d0a
    echo e2a0a60d0a
    echo e2a0a70d0a
    echo e2a0870d0a
    echo e2a08f0d0a
)
certutil -f -decodehex "%GL%.hex" "%GL%.txt" >nul 2>&1
if exist "%GL%.txt" (
    < "%GL%.txt" (
        set /p G_OK=
        set /p G_FAIL=
        set /p G_WARN=
        set /p G_ARROW=
        set /p G_BAR1=
        set /p G_BAR2=
        set /p G_TL=
        set /p G_V=
        set /p G_BL=
        set /p G_DOT=
        set /p G_SP0=
        set /p G_SP1=
        set /p G_SP2=
        set /p G_SP3=
        set /p G_SP4=
        set /p G_SP5=
        set /p G_SP6=
        set /p G_SP7=
        set /p G_SP8=
        set /p G_SP9=
    )
)
del "%GL%.hex" "%GL%.txt" 2>nul
:ui_glyph_fallback
if not defined G_DOT (
    set "G_OK=+"
    set "G_FAIL=x"
    set "G_WARN=*"
    set "G_ARROW=>"
    set "G_BAR1=#"
    set "G_BAR2=."
    set "G_TL=+"
    set "G_V=|"
    set "G_BL=+"
    set "G_DOT=-"
    set "G_SP0=-"
    set "G_SP1=\"
    set "G_SP2=|"
    set "G_SP3=/"
    set "G_SP4=-"
    set "G_SP5=\"
    set "G_SP6=|"
    set "G_SP7=/"
    set "G_SP8=-"
    set "G_SP9=\"
)
set "RULE="
for /l %%k in (1,1,58) do set "RULE=!RULE!!G_BAR2!"
set "SPIN_I=0"
set "BF_LAST=-1"
set "CUR_HIDDEN="
set "CUR_HIDE="
set "CUR_SHOW="
if defined ESC set "CUR_HIDE=%ESC%[?25l"
if defined ESC set "CUR_SHOW=%ESC%[?25h"
:: a run that was interrupted earlier may have left the cursor hidden
if defined ESC <nul set /p "=%CUR_SHOW%"
exit /b

:banner
echo.
echo   %DGR%- a Grabvo tool -%R%
echo   %B%%PU%GRABVO%R%  %DGR%QZ Tray Uninstaller%R%
echo   %DGR%!RULE!%R%
echo   %AM%This will remove QZ Tray and its trust data from this%R%
echo   %AM%computer. You can always reinstall with the Grabvo%R%
echo   %AM%installer if you change your mind.%R%
echo.
set "BAR_LABEL=Starting"
set "BAR_TOTAL=3"
for /l %%i in (1,1,3) do (
    set "BAR_DONE=%%i"
    set "BAR_TEXT=%%i s"
    call :ui_bar
    timeout /t 1 /nobreak >nul 2>&1
)
call :ui_cursor_show
echo.
echo.
exit /b 0

:header
echo.
echo   %PU%%B%[%~1]%R%  %WH%%B%%~2%R%
echo   %DGR%!RULE!%R%
exit /b 0

:ok
echo   %GR%%B%!G_OK!%R%   %WH%%~1%R%
exit /b 0

:warn
echo   %AM%%B%!G_WARN!%R%   %AM%%~1%R%
exit /b 0

:fail
echo   %RD%%B%!G_FAIL!%R%   %RD%%B%%~1%R%
exit /b 1

:arrow
echo   %PU%!G_ARROW!%R%   %SL%%~1%R%
exit /b 0

:: One in-place progress line from BAR_LABEL, BAR_DONE and BAR_TOTAL: a
:: spinner frame, the label, a 28-cell bar, the percent, and BAR_TEXT
:: (or done/total when it isn't set). Redrawn with ANSI cursor codes
:: (erase line + go to column 1). Consoles without ANSI only print a
:: single "done" line once BAR_DONE reaches BAR_TOTAL.
:ui_bar
set /a BP=BAR_DONE*100/BAR_TOTAL
set /a BF=BAR_DONE*28/BAR_TOTAL
set /a SPIN_I=(SPIN_I+1)%%10
for %%n in (!SPIN_I!) do set "SPIN_CH=!G_SP%%n!"
if not defined ESC goto :ui_bar_plain
if not defined CUR_HIDDEN (
    <nul set /p "=%CUR_HIDE%"
    set "CUR_HIDDEN=1"
)
if not "!BF!"=="!BF_LAST!" (
    set "BB1="
    set "BB2="
    for /l %%k in (1,1,28) do (
        if %%k leq !BF! (set "BB1=!BB1!!G_BAR1!") else (set "BB2=!BB2!!G_BAR2!")
    )
    set "BF_LAST=!BF!"
)
set "BT=!BAR_DONE!/!BAR_TOTAL!"
if defined BAR_TEXT set "BT=!BAR_TEXT!"
<nul set /p "=%ESC%[2K%ESC%[1G  %PU%!SPIN_CH!%R% !BAR_LABEL!  %PU%!BB1!%R%%DGR%!BB2!%R%  %B%!BP!%%%R%  %DGR%!BT!%R%"
exit /b
:ui_bar_plain
if "!BAR_DONE!"=="!BAR_TOTAL!" <nul set /p "=  !BAR_LABEL!  done"
exit /b

:ui_cursor_show
if defined CUR_HIDDEN (
    <nul set /p "=%CUR_SHOW%"
    set "CUR_HIDDEN="
)
exit /b

:: Boxed summary card for the completion screen.
:ui_card_top
echo   %GR%%B%!G_TL! !MSG!%R%
exit /b

:ui_row
echo   %GR%!G_V!%R%  %DGR%!ROW_K!%R%  !ROW_V!
exit /b

:ui_card_end
echo   %GR%!G_BL!%R%
exit /b

:: =========================================================================
::   COMPLETION - one boxed summary
:: =========================================================================
:complete
cls
echo.
if "!FINAL_STATE!"=="OK" (
    echo   %GR%%B%!G_OK! UNINSTALL COMPLETE%R%
    echo   %SL%QZ Tray has been removed from this computer%R%
) else (
    echo   %AM%%B%!G_WARN! CLEANUP FINISHED WITH WARNINGS%R%
    echo   %SL%Some QZ Tray files could not be removed%R%
)
echo   %DGR%!RULE!%R%
echo.

set "MSG=SUMMARY"
call :ui_card_top
set "ROW_K=Application"
if "!VERIFY_OK!"=="1" (set "ROW_V=removed") else (set "ROW_V=some files remain")
call :ui_row
set "ROW_K=Trust data "
set "ROW_V=%QZ_USER_DATA% and %QZ_MACHINE_DATA%"
call :ui_row
set "ROW_K=Auto-start "
set "ROW_V=cleared"
call :ui_row
call :ui_card_end
echo.

if "!FINAL_STATE!"=="OK" (
    echo   %WH%QZ Tray and the Grabvo certificate trust have been%R%
    echo   %WH%removed from this computer.%R%
    echo.
    echo   %SL%Note: the QZ Tray system tray icon may remain until you%R%
    echo   %SL%log out and back in. That is normal on Windows - Windows%R%
    echo   %SL%caches tray icons for a few minutes after an app exits.%R%
) else (
    echo   %WH%Some QZ Tray files or processes are still present on%R%
    echo   %WH%this computer. This usually means QZ Tray was still%R%
    echo   %WH%running when the script started.%R%
    echo.
    echo   %SL%Try this:%R%
    echo   %SL%  1. Right-click the QZ Tray tray icon and choose Exit%R%
    echo   %SL%  2. Run this uninstaller again%R%
    echo   %SL%  3. If it still fails, restart Windows and run it once more%R%
)
echo.
exit /b 0

:cleanup
cd /d "%TEMP%" >nul 2>&1
pause
endlocal
exit /b 0

@echo off
chcp 65001 >nul 2>&1
setlocal EnableExtensions EnableDelayedExpansion
title Grabvo - QZ Tray Setup

:: =========================================================================
::   Grabvo QZ Tray Auto-Installer (v8)
::   ------------------------------------------------------------------------
::   Installs QZ Tray and registers the Grabvo certificate.
::   Tries multiple whitelist invocation styles and verifies each by
::   checking whether allowed.dat actually grew.
::
::   UI conventions borrowed from LinkCatty (github.com/maiz-an/LinkCatty):
::   real glyphs decoded from hex at runtime (certutil), a live spinner +
::   progress bar for downloads/waits, and a boxed summary card at the end.
::   The file itself is pure ASCII with CRLF endings (see .gitattributes),
::   but it PRINTS real UTF-8 glyphs, so the console's code page has to be
::   switched to UTF-8 (chcp 65001) before anything is echoed - without
::   it, a real console window (not a redirected/piped one) renders those
::   bytes as mojibake using the old OEM code page.
:: =========================================================================

:: -------------------------------------------------------------------------
:: 1. Enable VT escape sequences
:: -------------------------------------------------------------------------
reg add "HKCU\Console" /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

:: -------------------------------------------------------------------------
:: 2. No upfront elevation.
:: -------------------------------------------------------------------------
:: This script deliberately does NOT relaunch itself elevated at the top
:: anymore. That used to relaunch the ENTIRE script in a brand-new UAC
:: console window and exit the one the user was looking at - so whatever
:: window they pasted the install command into just vanished, replaced by
:: a second window with all the UI in it. Confusing, and the extra window
:: is why :ensure_truetype_font existed in the first place.
::
:: Instead, this window keeps running unelevated the whole time and owns
:: the UI from the first line to the last. The ONE step that genuinely
:: needs admin - installing into Program Files (step 4) - is elevated on
:: its own via :elevate_run, which launches just that one command hidden
:: and waits for it, without opening a visible second window. That's the
:: only place a UAC prompt appears. (If this .cmd was itself launched
:: already-elevated - e.g. the user right-clicked "Run as administrator"
:: - Windows doesn't re-prompt for the inner elevation at all.)
:: -------------------------------------------------------------------------
:: 3. Force a TrueType console font
:: -------------------------------------------------------------------------
:: Best-effort fix for consoles that default to the legacy "Raster Fonts"
:: bitmap font, which has no glyphs for the box-drawing/braille characters
:: below - they'd render as "?" even though chcp 65001 already has the
:: encoding right. Registry tweaks only affect *new* console windows, not
:: the one already open, so this calls the Win32 console API directly to
:: fix the font of THIS window live. Printing still works either way.
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
set "CERT_URL=https://qz.grabvo.app/Grabvo.crt"
set "CERT_FILENAME=Grabvo.crt"
set "TEMP_DIR=%TEMP%\grabvo_qz_setup"
set "QZ_INSTALL_DIR=%PROGRAMFILES%\QZ Tray"
set "QZ_CONSOLE=%QZ_INSTALL_DIR%\qz-tray-console.exe"
set "QZ_TRAY_EXE=%QZ_INSTALL_DIR%\qz-tray.exe"
set "QZ_JAR=%QZ_INSTALL_DIR%\qz-tray.jar"
set "QZ_JAVA=%QZ_INSTALL_DIR%\runtime\bin\javaw.exe"
set "MAX_RETRIES=3"
set "RETRY_DELAY=4"
set "FINAL_STATE=WARN"
set "QZ_NUM=?"
set "REGISTER_OK=0"
set "STARTUP_OK=0"
set "RUNNING=0"

set "qz-print_silent=1"

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
call :step8

call :complete
goto :cleanup

:: =========================================================================
::   STEP 1 - Workspace
:: =========================================================================
:step1
call :header "1/8" "Preparing workspace"
if exist "%TEMP_DIR%" rd /s /q "%TEMP_DIR%" >nul 2>&1
mkdir "%TEMP_DIR%" >nul 2>&1
if not exist "%TEMP_DIR%" (
    call :fail "Could not create temp folder: %TEMP_DIR%"
    goto :cleanup
)
cd /d "%TEMP_DIR%" >nul 2>&1
if errorlevel 1 (
    call :fail "Could not change directory to %TEMP_DIR%"
    goto :cleanup
)
call :ok "Workspace ready"
exit /b 0

:: =========================================================================
::   STEP 2 - Find latest QZ Tray version
:: =========================================================================
:step2
call :header "2/8" "Checking for the latest QZ Tray version"
set "QZ_VERSION="
for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "try { (Invoke-RestMethod -Uri 'https://api.github.com/repos/qzind/tray/releases/latest' -Headers @{'User-Agent'='Grabvo-Setup'} -TimeoutSec 20).tag_name } catch { exit 1 }" 2^>nul`) do set "QZ_VERSION=%%v"

if not defined QZ_VERSION (
    set "QZ_VERSION=v2.2.6"
    call :warn "Could not reach GitHub - using fallback v2.2.6"
) else (
    call :ok "Latest version is !QZ_VERSION!"
)
set "QZ_NUM=!QZ_VERSION:v=!"
exit /b 0

:: =========================================================================
::   STEP 3 - Download QZ Tray installer
:: =========================================================================
:step3
call :header "3/8" "Downloading QZ Tray"

powershell -NoProfile -Command "!PROC_KILL!" >nul 2>&1
timeout /t 1 /nobreak >nul 2>&1

set "QZ_EXE=%TEMP_DIR%\qz-tray-setup.exe"
set "QZ_URL=https://github.com/qzind/tray/releases/download/!QZ_VERSION!/qz-tray-!QZ_NUM!-x86_64.exe"
call :download "!QZ_URL!" "!QZ_EXE!" "QZ Tray !QZ_NUM!"

if not exist "!QZ_EXE!" (
    call :warn "Primary asset missing - trying alternate name"
    set "QZ_URL=https://github.com/qzind/tray/releases/download/!QZ_VERSION!/qz-tray-!QZ_NUM!.exe"
    call :download "!QZ_URL!" "!QZ_EXE!" "QZ Tray !QZ_NUM!"
)

if not exist "!QZ_EXE!" (
    call :fail "Download failed after all retries"
    goto :cleanup
)
call :ok "Downloaded QZ Tray !QZ_NUM!"
exit /b 0

:: =========================================================================
::   STEP 4 - Install QZ Tray
:: =========================================================================
:step4
call :header "4/8" "Installing QZ Tray"

set "QZ_OK=0"

:: The installer writes into Program Files, so it's the one step in this
:: whole script that needs admin. Its command is written to a tiny helper
:: .cmd and run through :elevate_run, which is the only place a UAC
:: prompt appears - this window stays unelevated and visible the whole
:: time, before and after.
set "INSTALL_HELPER=%TEMP%\grabvo_install_helper_%RANDOM%.cmd"
> "!INSTALL_HELPER!" (
    echo @echo off
    echo set "qz-print_silent=1"
    echo "!QZ_EXE!" /S
)

call :arrow "Setting up QZ Tray - approve the Windows prompt if one appears"
call :elevate_run "!INSTALL_HELPER!"
if "!errorLevel!"=="1223" (
    del /f /q "!INSTALL_HELPER!" >nul 2>&1
    call :fail "Administrator access was declined - installation needs it to continue"
    goto :cleanup
)

set /a POLL=0
set "BAR_LABEL=Waiting for install"
set "BAR_TOTAL=30"
call :poll_install

if "!QZ_OK!"=="0" (
    call :warn "First pass didn't complete - retrying once"
    call :elevate_run "!INSTALL_HELPER!"
    set /a POLL=0
    call :poll_install
)

del /f /q "!INSTALL_HELPER!" >nul 2>&1

if "!QZ_OK!"=="0" (
    call :fail "Install did not complete after two attempts"
    goto :cleanup
)
call :ok "QZ Tray installed"

powershell -NoProfile -Command "!PROC_KILL!" >nul 2>&1
exit /b 0

:poll_install
set "BAR_DONE=!POLL!"
call :ui_bar
timeout /t 2 /nobreak >nul 2>&1
set /a POLL+=1
if exist "%QZ_CONSOLE%" set "QZ_OK=1"
if exist "%QZ_TRAY_EXE%" set "QZ_OK=1"
if exist "%QZ_JAR%" set "QZ_OK=1"
if "!QZ_OK!"=="1" goto :poll_install_done
if !POLL! GEQ 30 goto :poll_install_done
goto :poll_install
:poll_install_done
set "BAR_DONE=30"
call :ui_bar
call :ui_cursor_show
echo.
exit /b 0

:: =========================================================================
::   STEP 5 - Download Grabvo certificate
:: =========================================================================
:step5
call :header "5/8" "Downloading the Grabvo certificate"
set "CERT_FILE=%TEMP_DIR%\%CERT_FILENAME%"
call :download "%CERT_URL%" "%CERT_FILE%" "Grabvo certificate"

if not exist "%CERT_FILE%" (
    call :fail "Could not download %CERT_URL%"
    goto :cleanup
)

set "PEM_OK=0"
findstr /C:"BEGIN CERTIFICATE" "%CERT_FILE%" >nul 2>&1
if !errorLevel! equ 0 set "PEM_OK=1"

if "!PEM_OK!"=="0" (
    call :warn "File doesn't look like a certificate - QZ Tray will validate it"
) else (
    call :ok "Certificate downloaded and verified"
)
exit /b 0

:: =========================================================================
::   STEP 6 - Register the certificate with QZ Tray
:: =========================================================================
:step6
call :header "6/8" "Registering the certificate with QZ Tray"

set "REGISTER_OK=0"
set "USER_ALLOWED=%APPDATA%\qz\allowed.dat"

:: Snapshot allowed.dat BEFORE we run anything, so we can prove a
:: whitelist command actually wrote to it.
set "ALLOWED_BEFORE=0"
if exist "%USER_ALLOWED%" (
    for %%F in ("%USER_ALLOWED%") do set "ALLOWED_BEFORE=%%~zF"
)

:: -------------------------------------------------------------------
:: 6a - PRIMARY: qz-tray-console --whitelist
:: -------------------------------------------------------------------
:: Try three argument forms in order. The equals form (`--whitelist=`)
:: is the one that triggers "The system cannot find the drive specified"
:: on some Launch4j builds, so it's tried LAST.
if exist "%QZ_CONSOLE%" (
    call :arrow "Registering with QZ Tray"

    :: --- Attempt 1: space-separated, full path quoted ---
    "%QZ_CONSOLE%" --whitelist "%CERT_FILE%" >nul 2>&1
    timeout /t 2 /nobreak >nul 2>&1
    taskkill /IM "qz-tray-console.exe" /F >nul 2>&1

    set "ALLOWED_AFTER=0"
    if exist "%USER_ALLOWED%" (
        for %%F in ("%USER_ALLOWED%") do set "ALLOWED_AFTER=%%~zF"
    )
    if !ALLOWED_AFTER! GTR !ALLOWED_BEFORE! set "REGISTER_OK=1"

    :: --- Attempt 2: cwd = cert folder, pass bare filename ---
    if "!REGISTER_OK!"=="0" (
        pushd "%TEMP_DIR%" >nul 2>&1
        "%QZ_CONSOLE%" --whitelist "%CERT_FILENAME%" >nul 2>&1
        popd >nul 2>&1
        timeout /t 2 /nobreak >nul 2>&1
        taskkill /IM "qz-tray-console.exe" /F >nul 2>&1

        set "ALLOWED_AFTER=0"
        if exist "%USER_ALLOWED%" (
            for %%F in ("%USER_ALLOWED%") do set "ALLOWED_AFTER=%%~zF"
        )
        if !ALLOWED_AFTER! GTR !ALLOWED_BEFORE! set "REGISTER_OK=1"
    )

    :: --- Attempt 3: equals form (last resort) ---
    if "!REGISTER_OK!"=="0" (
        "%QZ_CONSOLE%" --whitelist="%CERT_FILE%" >nul 2>&1
        timeout /t 2 /nobreak >nul 2>&1
        taskkill /IM "qz-tray-console.exe" /F >nul 2>&1

        set "ALLOWED_AFTER=0"
        if exist "%USER_ALLOWED%" (
            for %%F in ("%USER_ALLOWED%") do set "ALLOWED_AFTER=%%~zF"
        )
        if !ALLOWED_AFTER! GTR !ALLOWED_BEFORE! set "REGISTER_OK=1"
    )

    :: Report
    if "!REGISTER_OK!"=="1" (
        call :ok "Certificate registered with QZ Tray"
    ) else (
        call :warn "Whitelist didn't change allowed.dat - using backups"
    )
) else (
    call :warn "qz-tray-console.exe not found - using backups"
)

:: -------------------------------------------------------------------
:: 6b - BACKUP: override.crt in the install directory
:: -------------------------------------------------------------------
:: This runs unelevated on purpose - it's a backup on top of 6a (which
:: already succeeded in the common case) and 6c/6d below, not the primary
:: mechanism, so it isn't worth a second UAC prompt. On a system where
:: Program Files denies writes to standard users this copy just silently
:: no-ops, same as it already did whenever 6a's whitelist call failed for
:: other reasons.
if exist "%QZ_INSTALL_DIR%" (
    copy /Y "%CERT_FILE%" "%QZ_INSTALL_DIR%\override.crt" >nul 2>&1
    if exist "%QZ_INSTALL_DIR%\override.crt" (
        if "!REGISTER_OK!"=="0" set "REGISTER_OK=1"
        call :ok "Backup registered (install folder)"
    )
)

:: -------------------------------------------------------------------
:: 6c - BACKUP: override.crt in ProgramData (all users)
:: -------------------------------------------------------------------
if not exist "%PROGRAMDATA%\qz" mkdir "%PROGRAMDATA%\qz" >nul 2>&1
copy /Y "%CERT_FILE%" "%PROGRAMDATA%\qz\override.crt" >nul 2>&1
if exist "%PROGRAMDATA%\qz\override.crt" (
    if "!REGISTER_OK!"=="0" set "REGISTER_OK=1"
    call :ok "Backup registered (all users)"
)

:: -------------------------------------------------------------------
:: 6d - Mirror user trust to the machine-wide location
:: -------------------------------------------------------------------
if exist "%USER_ALLOWED%" (
    if not exist "%PROGRAMDATA%\qz" mkdir "%PROGRAMDATA%\qz" >nul 2>&1
    copy /Y "%USER_ALLOWED%" "%PROGRAMDATA%\qz\allowed.dat" >nul 2>&1
    if !errorLevel! equ 0 (
        call :ok "Trust mirrored to all users"
    )
)

if "!REGISTER_OK!"=="0" (
    call :fail "Could not register the certificate"
    goto :cleanup
)
exit /b 0

:: =========================================================================
::   STEP 7 - Enable auto-start on login
:: =========================================================================
:step7
call :header "7/8" "Setting up auto-start"

set "STARTUP_OK=0"

if exist "%QZ_TRAY_EXE%" (
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "QZ Tray" /t REG_SZ /d "\"%QZ_TRAY_EXE%\"" /f >nul 2>&1
    if !errorLevel! equ 0 (
        set "STARTUP_OK=1"
        call :ok "QZ Tray will start automatically on login"
    )
)

if "!STARTUP_OK!"=="0" (
    call :warn "Could not set up auto-start - QZ Tray may need to be launched manually"
)
exit /b 0

:: =========================================================================
::   STEP 8 - Start QZ Tray and verify
:: =========================================================================
:step8
call :header "8/8" "Starting QZ Tray"

powershell -NoProfile -Command "!PROC_KILL!" >nul 2>&1
timeout /t 2 /nobreak >nul 2>&1

set "LAUNCHED=0"
if exist "%QZ_JAVA%" (
    if exist "%QZ_JAR%" (
        start "" "%QZ_JAVA%" -Xms512M -jar "%QZ_JAR%"
        set "LAUNCHED=1"
        call :ok "QZ Tray started"
    )
)
if "!LAUNCHED!"=="0" (
    if exist "%QZ_TRAY_EXE%" (
        start "" "%QZ_TRAY_EXE%"
        set "LAUNCHED=1"
        call :ok "QZ Tray started"
    )
)

if "!LAUNCHED!"=="0" (
    call :warn "Could not start QZ Tray automatically"
    set "FINAL_STATE=WARN"
    exit /b 0
)

timeout /t 3 /nobreak >nul 2>&1

set "RUNNING=0"
tasklist /FI "IMAGENAME eq qz-tray.exe" 2>nul | find /I "qz-tray.exe" >nul
if !errorLevel! equ 0 set "RUNNING=1"
powershell -NoProfile -Command "if (Get-CimInstance Win32_Process -Filter \"Name='javaw.exe'\" | Where-Object { $_.CommandLine -like '*qz-tray.jar*' }) { exit 0 } else { exit 1 }" >nul 2>&1
if !errorLevel! equ 0 set "RUNNING=1"

if "!RUNNING!"=="1" (
    call :ok "QZ Tray is running"
    set "FINAL_STATE=OK"
) else (
    call :warn "QZ Tray didn't stay running - check manually"
    set "FINAL_STATE=WARN"
)
exit /b 0

:: =========================================================================
::   SUBROUTINES - functional
:: =========================================================================

:: Live-progress download. in: %1 URL  %2 OUT_FILE  %3 friendly label
:: Runs curl (or PowerShell) as a detached background process so this
:: script can keep redrawing a spinner + byte-based progress bar while
:: it waits, instead of sitting on a blocking call with no feedback.
:download
set "DL_URL=%~1"
set "DL_OUT=%~2"
set "DL_LABEL=%~3"
if not defined DL_LABEL set "DL_LABEL=Downloading"
set "DL_ATTEMPT=0"

:download_loop
set /a DL_ATTEMPT+=1
if exist "%DL_OUT%" del /f /q "%DL_OUT%" >nul 2>&1

:: Content-Length for a real percentage bar; 0 (indeterminate) if
:: it can't be read. Written to a file and parsed as a plain file - a
:: `for /f` reading directly off a piped command here has been observed
:: to corrupt this script's own label table on some systems, so that
:: form is deliberately avoided.
set "DL_TOTAL_KB=0"
set "DL_HDR=%TEMP%\grabvo_dl_hdr_%RANDOM%.txt"
del "%DL_HDR%" 2>nul
curl -sIL --max-time 15 "%DL_URL%" > "%DL_HDR%" 2>nul
if exist "%DL_HDR%" (
    for /f "usebackq tokens=1,2 delims=: " %%A in ("%DL_HDR%") do if /i "%%A"=="content-length" set /a DL_TOTAL_KB=%%B/1024
    del "%DL_HDR%" 2>nul
)

set "DL_DONE_FILE=%TEMP%\grabvo_dl_done_%RANDOM%.txt"
set "DL_HELPER=%TEMP%\grabvo_dl_helper_%RANDOM%.cmd"
del "%DL_DONE_FILE%" 2>nul
> "%DL_HELPER%" (
    echo @echo off
    echo where curl.exe ^>nul 2^>^&1
    echo if not errorlevel 1 ^(
    echo   curl.exe -L -f -s -S --connect-timeout 20 --max-time 600 -o "%DL_OUT%" "%DL_URL%" 2^>nul
    echo ^) else ^(
    echo   powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%DL_URL%' -OutFile '%DL_OUT%' -UseBasicParsing -TimeoutSec 300 -ErrorAction Stop; exit 0 } catch { exit 1 }"
    echo ^)
    echo ^>"%DL_DONE_FILE%" echo %%errorlevel%%
)
start "" /b cmd /c "%DL_HELPER%" <nul >nul 2>&1

set "BAR_LABEL=%DL_LABEL%"
set "BAR_TOTAL=100"
:download_wait
if not exist "%DL_DONE_FILE%" goto :download_progress
for %%s in ("%DL_DONE_FILE%") do if %%~zs GTR 0 goto :download_done
:download_progress
set "DL_KB=0"
if exist "%DL_OUT%" for %%s in ("%DL_OUT%") do set /a DL_KB=%%~zs/1024
set "BAR_DONE=0"
if %DL_TOTAL_KB% GTR 0 set /a BAR_DONE=DL_KB*100/DL_TOTAL_KB
if %BAR_DONE% GTR 99 set "BAR_DONE=99"
set /a DL_MB=DL_KB/1024
if %DL_TOTAL_KB% GTR 0 (
    set /a DL_TMB=DL_TOTAL_KB/1024
    set "BAR_TEXT=!DL_MB! / !DL_TMB! MB"
) else (
    set "BAR_TEXT=!DL_KB! KB"
)
call :ui_bar
ping 127.0.0.1 -n 1 >nul
ping 127.0.0.1 -n 1 >nul
ping 127.0.0.1 -n 1 >nul
goto :download_wait

:download_done
set "DL_CODE=1"
set /p DL_CODE=<"%DL_DONE_FILE%"
set "BAR_DONE=100"
set "BAR_TEXT=done"
call :ui_bar
call :ui_cursor_show
echo.
del "%DL_DONE_FILE%" "%DL_HELPER%" 2>nul

if "!DL_CODE!"=="0" if exist "%DL_OUT%" (
    for %%A in ("%DL_OUT%") do set "DL_SIZE=%%~zA"
    if !DL_SIZE! GTR 0 exit /b 0
)
if exist "%DL_OUT%" del /f /q "%DL_OUT%" >nul 2>&1

if !DL_ATTEMPT! lss %MAX_RETRIES% (
    call :warn "Attempt !DL_ATTEMPT!/%MAX_RETRIES% failed - retrying in %RETRY_DELAY%s"
    timeout /t %RETRY_DELAY% /nobreak >nul 2>&1
    goto :download_loop
)
exit /b 1

:: Runs a helper .cmd file elevated and with no visible window, waits for
:: it to finish, and exits with its exit code - the ONLY UAC prompt in
:: this script happens here. The window the user is looking at is never
:: replaced or hidden; only the (windowless) elevated child is.
:: in: %1 helper .cmd path.  out: errorlevel = the helper's exit code,
:: or 1223 (ERROR_CANCELLED) if the UAC prompt was declined.
:elevate_run
set "ELEV_FILE=%~1"
powershell -NoProfile -Command "try { $p = Start-Process -FilePath '!ELEV_FILE!' -Verb RunAs -WindowStyle Hidden -Wait -PassThru; exit $p.ExitCode } catch { exit 1223 }" >nul 2>&1
exit /b !errorLevel!

:: =========================================================================
::   UI (pure ASCII on disk - real glyphs decoded from hex at runtime)
:: =========================================================================

:: Forces the CURRENT console window to a TrueType font (Consolas) via
:: the Win32 console API, so box-drawing/braille glyphs actually have a
:: glyph to render (see the comment above the call site). Builds a small
:: C# P/Invoke snippet into a temp .ps1 - CreateFile("CONOUT$") is used
:: instead of GetStdHandle so this still gets a real console handle even
:: if stdout itself is redirected. Silent and best-effort: any failure
:: here is swallowed, since the only downside is the ASCII-glyph look.
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
echo   %B%%PU%GRABVO%R%  %DGR%QZ Tray Setup%R%
echo   %DGR%!RULE!%R%
echo   %SL%Install QZ Tray + trust the Grabvo certificate%R%
echo   %SL%for silent printing, with no popups.%R%
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
::   COMPLETION - one boxed summary instead of a repeated banner
:: =========================================================================
:complete
cls
echo.
if "!FINAL_STATE!"=="OK" (
    echo   %GR%%B%!G_OK! SETUP COMPLETE%R%
    echo   %SL%QZ Tray is installed and ready to print%R%
) else (
    echo   %AM%%B%!G_WARN! FINISHED WITH WARNINGS%R%
    echo   %SL%QZ Tray didn't stay running after setup%R%
)
echo   %DGR%!RULE!%R%
echo.

set "MSG=SUMMARY"
call :ui_card_top
set "ROW_K=Version    "
set "ROW_V=!QZ_NUM!"
call :ui_row
set "ROW_K=Location   "
set "ROW_V=%QZ_INSTALL_DIR%"
call :ui_row
set "ROW_K=Certificate"
if "!REGISTER_OK!"=="1" (set "ROW_V=trusted") else (set "ROW_V=not confirmed - retry this installer")
call :ui_row
set "ROW_K=Auto-start "
if "!STARTUP_OK!"=="1" (set "ROW_V=on login") else (set "ROW_V=not set - launch QZ Tray manually")
call :ui_row
set "ROW_K=Status     "
if "!RUNNING!"=="1" (set "ROW_V=running") else (set "ROW_V=not confirmed")
call :ui_row
call :ui_card_end
echo.

if "!FINAL_STATE!"=="OK" (
    echo   %WH%Printing will now run without any popups or prompts.%R%
    echo.
    echo   %SL%Verify: right-click the QZ Tray tray icon, then%R%
    echo   %SL%        Advanced  -^>  Site Manager%R%
) else (
    echo   %WH%QZ Tray was installed and the certificate was registered,%R%
    echo   %WH%but QZ Tray didn't stay running after it was started.%R%
    echo.
    echo   %SL%Try this:%R%
    echo   %SL%  1. Open the Start menu and launch QZ Tray%R%
    echo   %SL%  2. Right-click the tray icon, then Advanced - Site Manager%R%
    echo   %SL%     - confirm Grabvo is listed%R%
    echo   %SL%  3. If it isn't, run this installer again%R%
)
echo.
exit /b 0

:cleanup
cd /d "%TEMP%" >nul 2>&1
rd /s /q "%TEMP_DIR%" >nul 2>&1
pause
endlocal
exit /b 0

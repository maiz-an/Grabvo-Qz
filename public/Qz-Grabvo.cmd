@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Grabvo - QZ Tray Setup

:: =========================================================================
::   Grabvo QZ Tray Auto-Installer (v2 - robust)
::   ------------------------------------------------------------------------
::   Installs QZ Tray and trusts the Grabvo certificate for silent printing.
::   - Handles QZ Tray 2.1.1+ silent-install quirks via qz-print_silent=1
::   - Launches everything DETACHED so no secondary console appears
::   - Verifies the install actually registered before claiming success
::   - 100%% ASCII output - works on any Windows console, font, codepage
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
:: 3. Colors
:: -------------------------------------------------------------------------
for /f "delims=" %%a in ('powershell -NoProfile -Command "[char]27" 2^>nul') do set "ESC=%%a"
if not defined ESC (
    set "R="  & set "B="  & set "PU=" & set "GR="
    set "RD=" & set "AM=" & set "SL=" & set "WH=" & set "DGR="
) else (
    set "R=!ESC![0m"
    set "B=!ESC![1m"
    set "PU=!ESC![38;5;141m"
    set "GR=!ESC![38;5;78m"
    set "RD=!ESC![38;5;203m"
    set "AM=!ESC![38;5;214m"
    set "SL=!ESC![38;5;245m"
    set "WH=!ESC![38;5;231m"
    set "DGR=!ESC![38;5;240m"
)

:: -------------------------------------------------------------------------
:: 4. Config
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

:: qz-print_silent=1 is the documented workaround for QZ Tray 2.1.1+,
:: where /S is dropped when the installer respawns itself. Keep this
:: set for the whole script - harmless if the version doesn't need it.
set "qz-print_silent=1"

:: PowerShell one-liner that kills every QZ Tray process. Uses
:: Get-CimInstance (WMIC is deprecated on Windows 11 24H2+).
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
call :header "2/8" "Looking up latest QZ Tray release"
set "QZ_VERSION="
for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "try { (Invoke-RestMethod -Uri 'https://api.github.com/repos/qzind/tray/releases/latest' -Headers @{'User-Agent'='Grabvo-Setup'} -TimeoutSec 20).tag_name } catch { exit 1 }" 2^>nul`) do set "QZ_VERSION=%%v"

if not defined QZ_VERSION (
    set "QZ_VERSION=v2.2.6"
    call :warn "GitHub unreachable - using fallback v2.2.6"
) else (
    call :ok "Latest release: !QZ_VERSION!"
)
set "QZ_NUM=!QZ_VERSION:v=!"
exit /b 0

:: =========================================================================
::   STEP 3 - Download QZ Tray installer
:: =========================================================================
:step3
call :header "3/8" "Downloading QZ Tray installer"

:: Kill any existing QZ Tray first, so the installer isn't blocked by
:: file locks or by an old instance holding ports.
powershell -NoProfile -Command "!PROC_KILL!" >nul 2>&1
timeout /t 1 /nobreak >nul 2>&1

set "QZ_EXE=%TEMP_DIR%\qz-tray-setup.exe"
set "QZ_URL=https://github.com/qzind/tray/releases/download/!QZ_VERSION!/qz-tray-!QZ_NUM!-x86_64.exe"
call :download "!QZ_URL!" "!QZ_EXE!"

if not exist "!QZ_EXE!" (
    call :warn "Primary asset missing - trying alternate name"
    set "QZ_URL=https://github.com/qzind/tray/releases/download/!QZ_VERSION!/qz-tray-!QZ_NUM!.exe"
    call :download "!QZ_URL!" "!QZ_EXE!"
)

if not exist "!QZ_EXE!" (
    call :fail "Download failed after all retries"
    goto :cleanup
)
call :ok "Downloaded QZ Tray !QZ_NUM!"
exit /b 0

:: =========================================================================
::   STEP 4 - Silent install
:: =========================================================================
:step4
call :header "4/8" "Installing QZ Tray (silent)"

:: Launch the NSIS installer DETACHED with a hidden window, so it
:: cannot grab our console. qz-print_silent=1 (set globally at the top)
:: tells the respawned child to keep /S behavior.
set "QZ_OK=0"

echo   !SL!Running installer (hidden, this takes ~30s)...
powershell -NoProfile -Command "$env:qz_print_silent='1'; Start-Process -FilePath '!QZ_EXE!' -ArgumentList '/S' -WindowStyle Hidden -Wait" >nul 2>&1

:: Wait for the NSIS installer to actually drop the files (up to 60s)
set /a POLL=0
call :poll_install

:: Retry once if the first pass didn't register anything
if "!QZ_OK!"=="0" (
    call :warn "First pass didn't register - retrying once"
    powershell -NoProfile -Command "$env:qz_print_silent='1'; Start-Process -FilePath '!QZ_EXE!' -ArgumentList '/S' -WindowStyle Hidden -Wait" >nul 2>&1
    set /a POLL=0
    call :poll_install
)

if "!QZ_OK!"=="0" (
    call :fail "Install did not complete after two attempts"
    goto :cleanup
)
call :ok "Installed to %QZ_INSTALL_DIR%"
exit /b 0

:poll_install
timeout /t 2 /nobreak >nul 2>&1
set /a POLL+=1
if exist "%QZ_CONSOLE%" set "QZ_OK=1"
if exist "%QZ_TRAY_EXE%" set "QZ_OK=1"
if exist "%QZ_JAR%" set "QZ_OK=1"
if "!QZ_OK!"=="1" exit /b 0
if !POLL! GEQ 30 exit /b 0
goto :poll_install

:: =========================================================================
::   STEP 5 - Download Grabvo certificate
:: =========================================================================
:step5
call :header "5/8" "Downloading Grabvo certificate"
set "CERT_FILE=%TEMP_DIR%\%CERT_FILENAME%"
call :download "%CERT_URL%" "%CERT_FILE%"

if not exist "%CERT_FILE%" (
    call :fail "Could not download %CERT_URL%"
    goto :cleanup
)

set "PEM_OK=0"
findstr /C:"BEGIN CERTIFICATE" "%CERT_FILE%" >nul 2>&1
if !errorLevel! equ 0 set "PEM_OK=1"

if "!PEM_OK!"=="0" (
    call :warn "File doesn't look like a PEM cert - QZ Tray will validate"
) else (
    call :ok "Certificate saved and verified"
)
exit /b 0

:: =========================================================================
::   STEP 6 - Trust the certificate
:: =========================================================================
:step6
call :header "6/8" "Trusting the Grabvo certificate"

set "WHITELIST_OK=0"

:: 6a - primary: qz-tray-console --whitelist, launched HIDDEN.
:: We do NOT use `start /B /WAIT` anymore - some builds of the console
:: stub respawn a child even for --whitelist, and /B leaks that child
:: into our console. Start-Process -Wait with -WindowStyle Hidden keeps
:: it fully detached.
if exist "%QZ_CONSOLE%" (
    echo   !SL!Running qz-tray-console --whitelist (hidden)...
    powershell -NoProfile -Command "$env:qz_print_silent='1'; try { $p = Start-Process -FilePath '%QZ_CONSOLE%' -ArgumentList '--whitelist','\"%CERT_FILE%\"' -WindowStyle Hidden -PassThru -Wait; exit $p.ExitCode } catch { exit 1 }" >nul 2>&1
    if !errorLevel! equ 0 (
        set "WHITELIST_OK=1"
        call :ok "Trusted via qz-tray-console"
    ) else (
        call :warn "Console whitelist returned non-zero - trying jar fallback"
    )
    :: Sweep any lingering console process
    powershell -NoProfile -Command "!PROC_KILL!" >nul 2>&1
)

:: 6b - fallback: bundled javaw + jar --whitelist
if "!WHITELIST_OK!"=="0" (
    if exist "%QZ_JAVA%" (
        if exist "%QZ_JAR%" (
            powershell -NoProfile -Command "try { $p = Start-Process -FilePath '%QZ_JAVA%' -ArgumentList '-jar','\"%QZ_JAR%\"','--whitelist','\"%CERT_FILE%\"' -WindowStyle Hidden -PassThru -Wait; exit $p.ExitCode } catch { exit 1 }" >nul 2>&1
            if !errorLevel! equ 0 (
                set "WHITELIST_OK=1"
                call :ok "Trusted via bundled javaw + qz-tray.jar"
            )
        )
    )
)

:: 6c - last resort: system java on PATH
if "!WHITELIST_OK!"=="0" (
    if exist "%QZ_JAR%" (
        where java >nul 2>&1
        if !errorLevel! equ 0 (
            java -jar "%QZ_JAR%" --whitelist "%CERT_FILE%" >nul 2>&1
            if !errorLevel! equ 0 (
                set "WHITELIST_OK=1"
                call :ok "Trusted via system java + qz-tray.jar"
            )
        )
    )
)

:: 6d - backup: override.crt (read at every QZ Tray startup, always works)
if exist "%QZ_INSTALL_DIR%" (
    copy /Y "%CERT_FILE%" "%QZ_INSTALL_DIR%\override.crt" >nul 2>&1
    if !errorLevel! equ 0 (
        call :ok "Backup trust written to override.crt"
    )
)

:: 6e - mirror user allow-list to machine-wide location
set "USER_ALLOWED=%APPDATA%\qz\allowed.dat"
if exist "%USER_ALLOWED%" (
    if not exist "%PROGRAMDATA%\qz" mkdir "%PROGRAMDATA%\qz" >nul 2>&1
    copy /Y "%USER_ALLOWED%" "%PROGRAMDATA%\qz\allowed.dat" >nul 2>&1
    if !errorLevel! equ 0 (
        call :ok "Trust mirrored for all users"
    )
)

if "!WHITELIST_OK!"=="0" (
    call :warn "Primary trust didn't succeed - relying on override.crt"
)
exit /b 0

:: =========================================================================
::   STEP 7 - Auto-start QZ Tray on login
:: =========================================================================
:step7
call :header "7/8" "Enabling QZ Tray auto-start"

:: QZ Tray writes its own auto-start entry on first run, but if the user
:: has disabled it or the fresh install didn't register it, we set it
:: here so printing works after every reboot without manual launching.
set "STARTUP_OK=0"

if exist "%QZ_TRAY_EXE%" (
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "QZ Tray" /t REG_SZ /d "\"%QZ_TRAY_EXE%\"" /f >nul 2>&1
    if !errorLevel! equ 0 (
        set "STARTUP_OK=1"
        call :ok "Auto-start registered in HKCU\...\Run"
    )
)

if "!STARTUP_OK!"=="0" (
    call :warn "Could not register auto-start - QZ Tray may need to be launched manually"
)
exit /b 0

:: =========================================================================
::   STEP 8 - Launch QZ Tray (hidden) and verify
:: =========================================================================
:step8
call :header "8/8" "Starting QZ Tray"

powershell -NoProfile -Command "!PROC_KILL!" >nul 2>&1
timeout /t 2 /nobreak >nul 2>&1

:: Launch HIDDEN. Prefer the bundled javaw + jar (no console window at
:: all), fall back to the tray launcher.
set "LAUNCHED=0"
if exist "%QZ_JAVA%" (
    if exist "%QZ_JAR%" (
        powershell -NoProfile -Command "try { Start-Process -FilePath '%QZ_JAVA%' -ArgumentList '-Xms512M','-jar','\"%QZ_JAR%\"' -WindowStyle Hidden; exit 0 } catch { exit 1 }" >nul 2>&1
        if !errorLevel! equ 0 (
            set "LAUNCHED=1"
            call :ok "QZ Tray launched via bundled javaw"
        )
    )
)
if "!LAUNCHED!"=="0" (
    if exist "%QZ_TRAY_EXE%" (
        powershell -NoProfile -Command "try { Start-Process -FilePath '%QZ_TRAY_EXE%' -WindowStyle Hidden; exit 0 } catch { exit 1 }" >nul 2>&1
        if !errorLevel! equ 0 (
            set "LAUNCHED=1"
            call :ok "QZ Tray launched via tray launcher"
        )
    )
)

if "!LAUNCHED!"=="0" (
    call :warn "Could not auto-launch - start QZ Tray from the Start menu"
    exit /b 0
)

:: Wait a couple seconds for QZ Tray to actually bind its port, then
:: verify the process is alive. This is the truth-check that turns the
:: "SETUP COMPLETE" banner into an honest statement.
timeout /t 3 /nobreak >nul 2>&1

set "RUNNING=0"
tasklist /FI "IMAGENAME eq qz-tray.exe" 2>nul | find /I "qz-tray.exe" >nul
if !errorLevel! equ 0 set "RUNNING=1"
tasklist /FI "IMAGENAME eq javaw.exe" 2>nul | find /I "javaw.exe" >nul
if !errorLevel! equ 0 (
    :: Only count javaw if it's the QZ Tray jar (checked via command line)
    powershell -NoProfile -Command "if (Get-CimInstance Win32_Process -Filter \"Name='javaw.exe'\" | Where-Object { $_.CommandLine -like '*qz-tray.jar*' }) { exit 0 } else { exit 1 }" >nul 2>&1
    if !errorLevel! equ 0 set "RUNNING=1"
)

if "!RUNNING!"=="1" (
    call :ok "QZ Tray is running"
    set "FINAL_STATE=OK"
) else (
    call :warn "QZ Tray did not stay running - check manually"
    set "FINAL_STATE=WARN"
)
exit /b 0

:: =========================================================================
::   SUBROUTINES
:: =========================================================================

:download
:: Args: URL, output_path. Retries MAX_RETRIES times.
set "DL_URL=%~1"
set "DL_OUT=%~2"
set "DL_ATTEMPT=0"

:download_loop
set /a DL_ATTEMPT+=1
if exist "%DL_OUT%" del /f /q "%DL_OUT%" >nul 2>&1

where curl.exe >nul 2>&1
if !errorLevel! equ 0 (
    curl.exe -L -f -s -S --connect-timeout 20 -o "%DL_OUT%" "%DL_URL%" >nul 2>&1
) else (
    powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%DL_URL%' -OutFile '%DL_OUT%' -UseBasicParsing -TimeoutSec 60 -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1
)

if exist "%DL_OUT%" (
    for %%A in ("%DL_OUT%") do set "DL_SIZE=%%~zA"
    if !DL_SIZE! GTR 0 exit /b 0
    del /f /q "%DL_OUT%" >nul 2>&1
)

if !DL_ATTEMPT! lss %MAX_RETRIES% (
    call :warn "Attempt !DL_ATTEMPT!/%MAX_RETRIES% failed - retrying in %RETRY_DELAY%s"
    timeout /t %RETRY_DELAY% /nobreak >nul 2>&1
    goto :download_loop
)

exit /b 1

:: =========================================================================
::   UI (all ASCII)
:: =========================================================================

:banner
echo.
echo   %PU%%B%============================================================%R%
echo.
echo   %PU%%B%        ####  ####     #    ####   #   #   ####%R%
echo   %PU%%B%        #     #   #   # #   #   #  #   #  #   #%R%
echo   %PU%%B%        # ### ####   ##### ####    #   #  #   #%R%
echo   %PU%%B%        #   # #  #   #   # #   #    # #   #   #%R%
echo   %PU%%B%        ### # #   #  #   # ####      #     ####%R%
echo.
echo   %WH%%B%                  QZ Tray Auto-Installer%R%
echo   %SL%             Install QZ Tray + trust the%R%
echo   %SL%             Grabvo certificate for silent printing%R%
echo.
echo   %PU%%B%============================================================%R%
echo.
exit /b 0

:header
echo.
echo   %PU%%B%[%~1]%R%   %WH%%B%%~2%R%
echo   %DGR%         -------------------------------------------------%R%
exit /b 0

:ok
echo   %GR%%B%[OK]%R%   %WH%%~1%R%
exit /b 0

:warn
echo   %AM%%B%[!!]%R%   %AM%%~1%R%
exit /b 0

:fail
echo   %RD%%B%[XX]%R%   %RD%%B%%~1%R%
exit /b 1

:complete
if "!FINAL_STATE!"=="OK" (
    echo.
    echo   %PU%%B%============================================================%R%
    echo.
    echo   %GR%%B%        ####  ####  ####  #   #  ####%R%
    echo   %GR%%B%       #     #     #     #   #  #   #%R%
    echo   %GR%%B%        ###  ###   ###  #   #  ####%R%
    echo   %GR%%B%           # #     #     #   #  #%R%
    echo   %GR%%B%        ####  ####  ####   ###   #%R%
    echo.
    echo   %GR%%B%             SETUP COMPLETE%R%
    echo.
    echo   %PU%%B%============================================================%R%
    echo.
    echo   %WH%QZ Tray is installed, trusted, running, and set to%R%
    echo   %WH%start automatically on login.%R%
    echo.
    echo   %WH%Printing will now run silently - no more popups.%R%
    echo.
    echo   %SL%Verify: right-click the QZ Tray tray icon, then%R%
    echo   %SL%        Advanced  -^>  Site Manager%R%
    echo.
) else (
    echo.
    echo   %AM%%B%============================================================%R%
    echo.
    echo   %AM%%B%              FINISHED WITH WARNINGS%R%
    echo.
    echo   %AM%%B%============================================================%R%
    echo.
    echo   %WH%QZ Tray was installed and the certificate was trusted,%R%
    echo   %WH%but QZ Tray didn't stay running after the last start.%R%
    echo.
    echo   %SL%Try this:%R%
    echo   %SL%  1. Open the Start menu and launch QZ Tray%R%
    echo   %SL%  2. Right-click the tray icon, confirm Advanced - Site Manager%R%
    echo   %SL%     lists Grabvo%R%
    echo   %SL%  3. If not, run this installer again%R%
    echo.
)
exit /b 0

:cleanup
cd /d "%TEMP%" >nul 2>&1
rd /s /q "%TEMP_DIR%" >nul 2>&1
echo   ============================================================
echo    Press any key to close this window.
echo   ============================================================
echo.
pause
endlocal
exit /b 0
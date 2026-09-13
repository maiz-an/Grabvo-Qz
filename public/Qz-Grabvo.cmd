@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Grabvo - QZ Tray Setup

:: =========================================================================
::   Grabvo QZ Tray Auto-Installer (v4)
::   ------------------------------------------------------------------------
::   Installs QZ Tray and registers the Grabvo certificate via override.crt
::   (the officially-supported "always trust" mechanism). Avoids the CLI
::   --whitelist path, which is flaky across QZ Tray versions and can
::   hang if launched via the console wrapper.
::   100%% ASCII output.
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

:: qz-print_silent=1 tells the QZ Tray installer to keep /S behavior
:: even when it respawns itself (upstream issue #713).
set "qz-print_silent=1"

:: Kill every QZ Tray process. Uses Get-CimInstance because WMIC is
:: deprecated on Windows 11 24H2+.
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

:: Stop any existing QZ Tray first, so the installer isn't blocked by
:: file locks or a stale instance holding ports.
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
::   STEP 4 - Install QZ Tray
:: =========================================================================
:step4
call :header "4/8" "Installing QZ Tray"

set "QZ_OK=0"

echo   !SL!Setting up QZ Tray... this may take a minute
powershell -NoProfile -Command "$env:qz_print_silent='1'; Start-Process -FilePath '!QZ_EXE!' -ArgumentList '/S' -WindowStyle Hidden -Wait" >nul 2>&1

:: Wait for the installer to drop its files (up to 60s).
set /a POLL=0
call :poll_install

:: Retry once if the first pass didn't register anything.
if "!QZ_OK!"=="0" (
    call :warn "First pass didn't complete - retrying once"
    powershell -NoProfile -Command "$env:qz_print_silent='1'; Start-Process -FilePath '!QZ_EXE!' -ArgumentList '/S' -WindowStyle Hidden -Wait" >nul 2>&1
    set /a POLL=0
    call :poll_install
)

if "!QZ_OK!"=="0" (
    call :fail "Install did not complete after two attempts"
    goto :cleanup
)
call :ok "QZ Tray installed"

:: Sweep anything the installer may have auto-launched.
powershell -NoProfile -Command "!PROC_KILL!" >nul 2>&1
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
call :header "5/8" "Downloading the Grabvo certificate"
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
    call :warn "File doesn't look like a certificate - QZ Tray will validate it"
) else (
    call :ok "Certificate downloaded and verified"
)
exit /b 0

:: =========================================================================
::   STEP 6 - Register the certificate via override.crt
:: =========================================================================
:step6
call :header "6/8" "Registering the certificate with QZ Tray"

:: override.crt is QZ Tray's officially-supported "always trust this
:: certificate" mechanism. QZ Tray reads it at every startup. It doesn't
:: depend on any CLI flag, doesn't need a console, and cannot hang.
::
:: This replaces the old qz-tray-console.exe --whitelist approach, which
:: broke in a couple of ways: (a) the argument escaping passed literal
:: backslash-quotes, so the flag was ignored and the console launched the
:: full GUI instead; (b) the console wrapper then never exited.

set "REGISTER_OK=0"

:: Primary: install directory
if exist "%QZ_INSTALL_DIR%" (
    copy /Y "%CERT_FILE%" "%QZ_INSTALL_DIR%\override.crt" >nul 2>&1
    if exist "%QZ_INSTALL_DIR%\override.crt" (
        set "REGISTER_OK=1"
        call :ok "Certificate registered"
    )
)

:: Backup: machine-wide location (all users)
if not exist "%PROGRAMDATA%\qz" mkdir "%PROGRAMDATA%\qz" >nul 2>&1
copy /Y "%CERT_FILE%" "%PROGRAMDATA%\qz\override.crt" >nul 2>&1
if exist "%PROGRAMDATA%\qz\override.crt" (
    if "!REGISTER_OK!"=="0" set "REGISTER_OK=1"
    call :ok "Backup registration saved"
)

:: If the user already has an allow-list from a previous QZ Tray install,
:: mirror it to the machine-wide location so it applies to all users.
set "USER_ALLOWED=%APPDATA%\qz\allowed.dat"
if exist "%USER_ALLOWED%" (
    if not exist "%PROGRAMDATA%\qz" mkdir "%PROGRAMDATA%\qz" >nul 2>&1
    copy /Y "%USER_ALLOWED%" "%PROGRAMDATA%\qz\allowed.dat" >nul 2>&1
    if !errorLevel! equ 0 (
        call :ok "Trust set up for all users"
    )
)

if "!REGISTER_OK!"=="0" (
    call :fail "Could not register the certificate - check permissions"
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

:: Launch via javaw (no console) if we can, fall back to the tray exe.
set "LAUNCHED=0"
if exist "%QZ_JAVA%" (
    if exist "%QZ_JAR%" (
        powershell -NoProfile -Command "try { Start-Process -FilePath '%QZ_JAVA%' -ArgumentList '-Xms512M','-jar','%QZ_JAR%' -WindowStyle Hidden; exit 0 } catch { exit 1 }" >nul 2>&1
        if !errorLevel! equ 0 (
            set "LAUNCHED=1"
            call :ok "QZ Tray started"
        )
    )
)
if "!LAUNCHED!"=="0" (
    if exist "%QZ_TRAY_EXE%" (
        powershell -NoProfile -Command "try { Start-Process -FilePath '%QZ_TRAY_EXE%' -WindowStyle Hidden; exit 0 } catch { exit 1 }" >nul 2>&1
        if !errorLevel! equ 0 (
            set "LAUNCHED=1"
            call :ok "QZ Tray started"
        )
    )
)

if "!LAUNCHED!"=="0" (
    call :warn "Could not start QZ Tray automatically"
    set "FINAL_STATE=WARN"
    exit /b 0
)

:: Wait a few seconds for QZ Tray to actually bind its port.
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
::   SUBROUTINES
:: =========================================================================

:download
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
    cls
    echo.
    echo   %GR%%B%============================================================%R%
    echo.
    echo   %PU%%B%        ####  ####     #    ####   #   #   ####%R%
    echo   %PU%%B%        #     #   #   # #   #   #  #   #  #   #%R%
    echo   %PU%%B%        # ### ####   ##### ####    #   #  #   #%R%
    echo   %PU%%B%        #   # #  #   #   # #   #    # #   #   #%R%
    echo   %PU%%B%        ### # #   #  #   # ####      #     ####%R%
    echo.
    echo   %GR%%B%              SETUP COMPLETE%R%
    echo   %SL%      QZ Tray is installed and ready to print%R%
    echo.
    echo   %GR%%B%============================================================%R%
    echo.
    echo   %WH%QZ Tray is installed, the Grabvo certificate is%R%
    echo   %WH%trusted, and everything is set to start on login.%R%
    echo.
    echo   %WH%Printing will now run without any popups or prompts.%R%
    echo.
    echo   %SL%Verify: right-click the QZ Tray tray icon, then%R%
    echo   %SL%        Advanced  -^>  Site Manager%R%
    echo.
) else (
    cls
    echo.
    echo   %AM%%B%============================================================%R%
    echo.
    echo   %PU%%B%        ####  ####     #    ####   #   #   ####%R%
    echo   %PU%%B%        #     #   #   # #   #   #  #   #  #   #%R%
    echo   %PU%%B%        # ### ####   ##### ####    #   #  #   #%R%
    echo   %PU%%B%        #   # #  #   #   # #   #    # #   #   #%R%
    echo   %PU%%B%        ### # #   #  #   # ####      #     ####%R%
    echo.
    echo   %AM%%B%          FINISHED WITH WARNINGS%R%
    echo   %SL%      QZ Tray didn't stay running after startup%R%
    echo.
    echo   %AM%%B%============================================================%R%
    echo.
    echo   %WH%QZ Tray was installed and the certificate was registered,%R%
    echo   %WH%but QZ Tray didn't stay running after it was started.%R%
    echo.
    echo   %SL%Try this:%R%
    echo   %SL%  1. Open the Start menu and launch QZ Tray%R%
    echo   %SL%  2. Right-click the tray icon, then Advanced - Site Manager%R%
    echo   %SL%     - confirm Grabvo is listed%R%
    echo   %SL%  3. If it isn't, run this installer again%R%
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
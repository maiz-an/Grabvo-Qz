@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Grabvo - QZ Tray Setup

:: =========================================================================
::   Grabvo QZ Tray Auto-Installer
::   Installs QZ Tray and trusts the Grabvo certificate for silent printing.
::   100%% ASCII output - works on any Windows console, font, and codepage.
:: =========================================================================

:: -------------------------------------------------------------------------
:: 1. Enable VT escape sequences (harmless if unsupported)
:: -------------------------------------------------------------------------
reg add "HKCU\Console" /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

:: -------------------------------------------------------------------------
:: 2. Self-elevate to Administrator
:: -------------------------------------------------------------------------
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo   Requesting administrator privileges...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" >nul 2>&1
    exit /b
)

:: -------------------------------------------------------------------------
:: 3. Capture ESC char once; fall back to plain text if unavailable
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

cls
call :banner

:: =========================================================================
::   STEP 1 - Workspace
:: =========================================================================
call :header "1/7" "Preparing workspace"
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

:: =========================================================================
::   STEP 2 - Find latest QZ Tray version
:: =========================================================================
call :header "2/7" "Looking up latest QZ Tray release"
set "QZ_VERSION="
for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "try { (Invoke-RestMethod -Uri 'https://api.github.com/repos/qzind/tray/releases/latest' -Headers @{'User-Agent'='Grabvo-Setup'} -TimeoutSec 20).tag_name } catch { exit 1 }" 2^>nul`) do set "QZ_VERSION=%%v"

if not defined QZ_VERSION (
    set "QZ_VERSION=v2.2.6"
    call :warn "GitHub unreachable - using fallback v2.2.6"
) else (
    call :ok "Latest release: !QZ_VERSION!"
)
set "QZ_NUM=!QZ_VERSION:v=!"

:: =========================================================================
::   STEP 3 - Download QZ Tray installer
:: =========================================================================
call :header "3/7" "Downloading QZ Tray installer"

:: Kill any running QZ Tray first, so the installer isn't blocked by file locks
taskkill /IM "qz-tray.exe" /F >nul 2>&1
taskkill /IM "qz-tray-console.exe" /F >nul 2>&1
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

:: =========================================================================
::   STEP 4 - Silent install
:: =========================================================================
call :header "4/7" "Installing QZ Tray (silent)"
start /wait "" "!QZ_EXE!" /S
timeout /t 2 /nobreak >nul 2>&1

set "QZ_OK=0"
if exist "%QZ_CONSOLE%" set "QZ_OK=1"
if exist "%QZ_TRAY_EXE%" set "QZ_OK=1"
if exist "%QZ_JAR%" set "QZ_OK=1"

if "!QZ_OK!"=="0" (
    call :warn "First pass didn't register - retrying once"
    start /wait "" "!QZ_EXE!" /S
    timeout /t 3 /nobreak >nul 2>&1
    if exist "%QZ_CONSOLE%" set "QZ_OK=1"
    if exist "%QZ_TRAY_EXE%" set "QZ_OK=1"
    if exist "%QZ_JAR%" set "QZ_OK=1"
)

if "!QZ_OK!"=="0" (
    call :fail "Install did not complete"
    goto :cleanup
)
call :ok "Installed to %QZ_INSTALL_DIR%"

:: =========================================================================
::   STEP 5 - Download Grabvo certificate
:: =========================================================================
call :header "5/7" "Downloading Grabvo certificate"
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

:: =========================================================================
::   STEP 6 - Trust the certificate
:: =========================================================================
call :header "6/7" "Trusting the Grabvo certificate"

:: 6a - primary: qz-tray-console --whitelist, run IN THIS console (start /B)
set "WHITELIST_OK=0"
if exist "%QZ_CONSOLE%" (
    start "" /B /WAIT "%QZ_CONSOLE%" --whitelist "%CERT_FILE%" >nul 2>&1
    if !errorLevel! equ 0 (
        set "WHITELIST_OK=1"
        call :ok "Trusted via qz-tray-console"
    ) else (
        call :warn "Console whitelist returned non-zero - trying jar fallback"
    )
    :: Kill any lingering console process (some versions stay open)
    taskkill /IM "qz-tray-console.exe" /F >nul 2>&1
)

:: 6b - fallback: java -jar qz-tray.jar --whitelist
if "!WHITELIST_OK!"=="0" (
    if exist "%QZ_JAR%" (
        where java >nul 2>&1
        if !errorLevel! equ 0 (
            java -jar "%QZ_JAR%" --whitelist "%CERT_FILE%" >nul 2>&1
            if !errorLevel! equ 0 (
                set "WHITELIST_OK=1"
                call :ok "Trusted via qz-tray.jar"
            )
        )
    )
)

:: 6c - backup: override.crt (read at every QZ Tray startup)
if exist "%QZ_INSTALL_DIR%" (
    copy /Y "%CERT_FILE%" "%QZ_INSTALL_DIR%\override.crt" >nul 2>&1
    if !errorLevel! equ 0 (
        call :ok "Backup trust written to override.crt"
    )
)

:: 6d - mirror user allow-list to machine-wide location
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

:: =========================================================================
::   STEP 7 - Launch QZ Tray (hidden, no console window)
:: =========================================================================
call :header "7/7" "Starting QZ Tray"

taskkill /IM "qz-tray.exe" /F >nul 2>&1
taskkill /IM "qz-tray-console.exe" /F >nul 2>&1
timeout /t 2 /nobreak >nul 2>&1

:: Launch HIDDEN so no secondary console window appears.
:: Try javaw first (jar directly), then the tray launcher.
set "LAUNCHED=0"
if exist "%QZ_JAVA%" (
    powershell -NoProfile -Command "Start-Process -FilePath '%QZ_JAVA%' -ArgumentList '-Xms512M','-jar','%QZ_JAR%' -WindowStyle Hidden" >nul 2>&1
    if !errorLevel! equ 0 set "LAUNCHED=1"
)
if "!LAUNCHED!"=="0" (
    if exist "%QZ_TRAY_EXE%" (
        powershell -NoProfile -Command "Start-Process -FilePath '%QZ_TRAY_EXE%' -WindowStyle Hidden" >nul 2>&1
        if !errorLevel! equ 0 set "LAUNCHED=1"
    )
)

if "!LAUNCHED!"=="1" (
    call :ok "QZ Tray launched (hidden)"
) else (
    call :warn "Could not auto-launch - start QZ Tray from the Start menu"
)

:: =========================================================================
::   DONE
:: =========================================================================
call :complete
goto :cleanup

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
::   UI (all ASCII - zero special characters to break)
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
echo   %WH%QZ Tray is installed and the Grabvo certificate is trusted.%R%
echo   %WH%Printing will run silently from now on - no prompts.%R%
echo.
echo   %SL%Verify: right-click the QZ Tray tray icon, then%R%
echo   %SL%        Advanced  -^>  Site Manager%R%
echo.
exit /b 0

:cleanup
cd /d "%TEMP%" >nul 2>&1
rd /s /q "%TEMP_DIR%" >nul 2>&1
echo.
pause
endlocal
exit /b 0
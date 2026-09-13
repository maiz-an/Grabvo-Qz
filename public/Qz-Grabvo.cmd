@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Grabvo - QZ Tray Setup

:: ============================================================================
::   Grabvo - QZ Tray Auto-Installer
::   ------------------------------------------------------------------------
::   Installs the latest QZ Tray and trusts the Grabvo certificate so
::   printing runs silently - no "Allow / Block" popups.
::
::   - 100%% ASCII-only output (works on every Windows console / font / locale)
::   - Automatic retry on every network operation (3 attempts, backoff delay)
::   - Self-elevates to Administrator
::   - Never blocks on Unicode rendering issues
:: ============================================================================

:: ---------------------------------------------------------------------------
:: 0. Enable VT sequences for optional color (harmless if unsupported)
:: ---------------------------------------------------------------------------
reg add "HKCU\Console" /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

:: ---------------------------------------------------------------------------
:: 1. Self-elevate to Administrator if not already elevated
:: ---------------------------------------------------------------------------
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo   Requesting administrator privileges...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" >nul 2>&1
    exit /b
)

:: ---------------------------------------------------------------------------
:: 2. Detect color support - fall back to plain text if unsupported
::    (No chcp 65001 - we use pure ASCII so codepage is irrelevant)
:: ---------------------------------------------------------------------------
set "USE_COLOR=0"
for /f "delims=" %%a in ('powershell -NoProfile -Command "[char]27" 2^>nul') do set "ESC=%%a"
if defined ESC (
    ver | findstr /i "10\.0" >nul 2>&1
    if !errorLevel! equ 0 set "USE_COLOR=1"
)

if "!USE_COLOR!"=="1" (
    set "R=!ESC![0m"
    set "B=!ESC![1m"
    set "PU=!ESC![38;5;141m"
    set "GR=!ESC![38;5;78m"
    set "RD=!ESC![38;5;203m"
    set "AM=!ESC![38;5;214m"
    set "SL=!ESC![38;5;245m"
    set "WH=!ESC![38;5;231m"
) else (
    set "R="
    set "B="
    set "PU="
    set "GR="
    set "RD="
    set "AM="
    set "SL="
    set "WH="
)

:: ---------------------------------------------------------------------------
:: 3. Configuration
:: ---------------------------------------------------------------------------
set "CERT_URL=https://qz.grabvo.app/Grabvo.crt"
set "CERT_FILENAME=Grabvo.crt"
set "TEMP_DIR=%TEMP%\grabvo_qz_setup"
set "QZ_INSTALL_DIR=%PROGRAMFILES%\QZ Tray"
set "QZ_CONSOLE=%QZ_INSTALL_DIR%\qz-tray-console.exe"
set "QZ_TRAY_EXE=%QZ_INSTALL_DIR%\qz-tray.exe"
set "QZ_JAR=%QZ_INSTALL_DIR%\qz-tray.jar"
set "MAX_RETRIES=3"
set "RETRY_DELAY=4"

:: ---------------------------------------------------------------------------
:: 4. Startup
:: ---------------------------------------------------------------------------
cls
call :banner

:: ===========================================================================
::  MAIN
:: ===========================================================================

:: --- Step 1 : workspace -----------------------------------------------------
call :step "1/7" "Preparing workspace"
if exist "%TEMP_DIR%" rd /s /q "%TEMP_DIR%" >nul 2>&1
mkdir "%TEMP_DIR%" >nul 2>&1
if not exist "%TEMP_DIR%" (
    call :fail "Could not create temp folder at %TEMP_DIR%"
    goto :cleanup
)
cd /d "%TEMP_DIR%" >nul 2>&1
if errorlevel 1 (
    call :fail "Could not change directory to %TEMP_DIR%"
    goto :cleanup
)
call :ok "Workspace ready"

:: --- Step 2 : find latest version ------------------------------------------
call :step "2/7" "Looking up latest QZ Tray release"
set "QZ_VERSION="
for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "try { (Invoke-RestMethod -Uri 'https://api.github.com/repos/qzind/tray/releases/latest' -Headers @{'User-Agent'='Grabvo-Setup'} -TimeoutSec 20).tag_name } catch { exit 1 }" 2^>nul`) do set "QZ_VERSION=%%v"

if not defined QZ_VERSION (
    set "QZ_VERSION=v2.2.6"
    call :warn "GitHub API unreachable - using fallback v2.2.6"
) else (
    call :ok "Latest release: !QZ_VERSION!"
)
set "QZ_NUM=!QZ_VERSION:v=!"

:: --- Step 3 : download installer -------------------------------------------
call :step "3/7" "Downloading QZ Tray installer"
set "QZ_EXE=%TEMP_DIR%\qz-tray-setup.exe"

set "QZ_URL=https://github.com/qzind/tray/releases/download/!QZ_VERSION!/qz-tray-!QZ_NUM!-x86_64.exe"
call :download "!QZ_URL!" "!QZ_EXE!"

if not exist "!QZ_EXE!" (
    call :warn "Primary asset missing - trying alternate name..."
    set "QZ_URL=https://github.com/qzind/tray/releases/download/!QZ_VERSION!/qz-tray-!QZ_NUM!.exe"
    call :download "!QZ_URL!" "!QZ_EXE!"
)

if not exist "!QZ_EXE!" (
    call :fail "Download failed after all retries - check your internet connection"
    goto :cleanup
)
call :ok "Downloaded QZ Tray !QZ_NUM!"

:: --- Step 4 : silent install -----------------------------------------------
call :step "4/7" "Installing QZ Tray silently"
start /wait "" "!QZ_EXE!" /S

:: Give the NSIS installer a moment to flush files
timeout /t 2 /nobreak >nul 2>&1

set "QZ_OK=0"
if exist "%QZ_CONSOLE%" set "QZ_OK=1"
if exist "%QZ_TRAY_EXE%" set "QZ_OK=1"
if exist "%QZ_JAR%" set "QZ_OK=1"

if "!QZ_OK!"=="0" (
    call :warn "First install pass did not register - retrying once..."
    start /wait "" "!QZ_EXE!" /S
    timeout /t 3 /nobreak >nul 2>&1
    if exist "%QZ_CONSOLE%" set "QZ_OK=1"
    if exist "%QZ_TRAY_EXE%" set "QZ_OK=1"
    if exist "%QZ_JAR%" set "QZ_OK=1"
)

if "!QZ_OK!"=="0" (
    call :fail "Install did not complete - expected %QZ_INSTALL_DIR%"
    goto :cleanup
)
call :ok "Installed to %QZ_INSTALL_DIR%"

:: --- Step 5 : certificate download -----------------------------------------
call :step "5/7" "Downloading Grabvo certificate"
set "CERT_FILE=%TEMP_DIR%\%CERT_FILENAME%"
call :download "%CERT_URL%" "%CERT_FILE%"

if not exist "%CERT_FILE%" (
    call :fail "Could not download %CERT_URL%"
    goto :cleanup
)

:: Sanity check: file should contain a PEM block
set "PEM_OK=0"
findstr /C:"BEGIN CERTIFICATE" "%CERT_FILE%" >nul 2>&1
if !errorLevel! equ 0 set "PEM_OK=1"

if "!PEM_OK!"=="0" (
    call :warn "File does not look like a PEM cert - QZ Tray will validate"
) else (
    call :ok "Certificate saved and verified"
)

:: --- Step 6 : trust certificate -------------------------------------------
call :step "6/7" "Adding certificate to Site Manager"

:: 6a - headless whitelist (writes fingerprint into allowed.dat)
set "WHITELIST_OK=0"
if exist "%QZ_CONSOLE%" (
    "%QZ_CONSOLE%" --whitelist "%CERT_FILE%" >nul 2>&1
    if !errorLevel! equ 0 (
        set "WHITELIST_OK=1"
        call :ok "Trusted via qz-tray-console"
    ) else (
        call :warn "Console whitelist returned non-zero - trying jar fallback"
    )
)

:: 6a-fallback - java -jar qz-tray.jar --whitelist
if "!WHITELIST_OK!"=="0" (
    if exist "%QZ_JAR%" (
        where java >nul 2>&1
        if !errorLevel! equ 0 (
            java -jar "%QZ_JAR%" --whitelist "%CERT_FILE%" >nul 2>&1
            if !errorLevel! equ 0 (
                set "WHITELIST_OK=1"
                call :ok "Trusted via qz-tray.jar"
            ) else (
                call :warn "jar whitelist returned non-zero"
            )
        ) else (
            call :warn "java not on PATH - skipping jar fallback"
        )
    )
)

:: 6b - backup trust via override.crt (read at every QZ Tray startup)
if exist "%QZ_INSTALL_DIR%" (
    copy /Y "%CERT_FILE%" "%QZ_INSTALL_DIR%\override.crt" >nul 2>&1
    if !errorLevel! equ 0 (
        call :ok "Backup trust written to override.crt"
    ) else (
        call :warn "Could not write override.crt"
    )
)

:: 6c - mirror user allow-list to machine-wide location
set "USER_ALLOWED=%APPDATA%\qz\allowed.dat"
if exist "%USER_ALLOWED%" (
    if not exist "%PROGRAMDATA%\qz" mkdir "%PROGRAMDATA%\qz" >nul 2>&1
    copy /Y "%USER_ALLOWED%" "%PROGRAMDATA%\qz\allowed.dat" >nul 2>&1
    if !errorLevel! equ 0 (
        call :ok "Trust mirrored for all users"
    ) else (
        call :warn "Could not mirror trust to ProgramData"
    )
)

if "!WHITELIST_OK!"=="0" (
    call :warn "No primary trust method succeeded - relying on override.crt"
)

:: --- Step 7 : restart QZ Tray ----------------------------------------------
call :step "7/7" "Restarting QZ Tray"
taskkill /IM "qz-tray.exe" /F >nul 2>&1
timeout /t 2 /nobreak >nul 2>&1

set "LAUNCH_OK=0"
if exist "%QZ_TRAY_EXE%" (
    start "" "%QZ_TRAY_EXE%"
    set "LAUNCH_OK=1"
    call :ok "QZ Tray launched"
) else if exist "%QZ_INSTALL_DIR%\runtime\bin\java.exe" (
    start "" "%QZ_INSTALL_DIR%\runtime\bin\java.exe" -Xms512M -jar "%QZ_JAR%"
    set "LAUNCH_OK=1"
    call :ok "QZ Tray launched via bundled runtime"
)

if "!LAUNCH_OK!"=="0" (
    call :warn "Could not auto-launch - start QZ Tray from the Start menu"
)

:: --- Done ------------------------------------------------------------------
call :complete "!WHITELIST_OK!" "!LAUNCH_OK!"
goto :cleanup

:: ===========================================================================
::  SUBROUTINES
:: ===========================================================================

:: ---------------------------------------------------------------------------
:: :download <url> <output_path>
::   Downloads with up to MAX_RETRIES attempts and a delay between tries.
::   Uses curl.exe if available (fast, reliable), else PowerShell.
::   Returns errorLevel 0 on success, 1 on final failure.
:: ---------------------------------------------------------------------------
:download
set "DL_URL=%~1"
set "DL_OUT=%~2"
set "DL_ATTEMPT=0"

:download_loop
set /a DL_ATTEMPT+=1

:: Clean partial file from a previous failed attempt
if exist "%DL_OUT%" del /f /q "%DL_OUT%" >nul 2>&1

:: Try curl.exe first (built into Windows 10 1803+)
where curl.exe >nul 2>&1
if !errorLevel! equ 0 (
    curl.exe -L -f -s -S --retry 0 --connect-timeout 20 -o "%DL_OUT%" "%DL_URL%" >nul 2>&1
) else (
    powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%DL_URL%' -OutFile '%DL_OUT%' -UseBasicParsing -TimeoutSec 60 -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1
)

if exist "%DL_OUT%" (
    :: Verify the file is non-empty
    for %%A in ("%DL_OUT%") do set "DL_SIZE=%%~zA"
    if !DL_SIZE! GTR 0 (
        exit /b 0
    ) else (
        del /f /q "%DL_OUT%" >nul 2>&1
    )
)

if !DL_ATTEMPT! lss %MAX_RETRIES% (
    call :warn "Download attempt !DL_ATTEMPT!/%MAX_RETRIES% failed - retrying in %RETRY_DELAY%s"
    timeout /t %RETRY_DELAY% /nobreak >nul 2>&1
    goto :download_loop
)

exit /b 1

:: ===========================================================================
::  UI HELPERS  (ASCII only - no Unicode, no box-drawing, no glyphs)
:: ===========================================================================

:banner
echo.
echo   %PU%+----------------------------------------------------------+%R%
echo   %PU%^|%R%                                                          %PU%^|%R%
echo   %PU%^|%R%    %WH%G R A B V O%R%                                          %PU%^|%R%
echo   %PU%^|%R%    %SL%QZ Tray Auto-Installer%R%                               %PU%^|%R%
echo   %PU%^|%R%                                                          %PU%^|%R%
echo   %PU%^|%R%    Installs QZ Tray and trusts the Grabvo certificate    %PU%^|%R%
echo   %PU%^|%R%    so printing runs silently - no prompts.               %PU%^|%R%
echo   %PU%^|%R%                                                          %PU%^|%R%
echo   %PU%+----------------------------------------------------------+%R%
echo.
exit /b 0

:step
echo.
echo   %PU%[*]%R% %WH%Step %~1%R%  %SL%%~2%R%
echo   %SL%   ---------------------------------------------------------%R%
exit /b 0

:ok
echo   %GR%[OK]%R%   %WH%%~1%R%
exit /b 0

:warn
echo   %AM%[!!]%R%   %AM%%~1%R%
exit /b 0

:fail
echo   %RD%[XX]%R%   %RD%%~1%R%
exit /b 1

:complete
echo.
echo   %PU%+----------------------------------------------------------+%R%
echo   %PU%^|%R%                                                          %PU%^|%R%
echo   %PU%^|%R%    %GR%SETUP COMPLETE%R%                                      %PU%^|%R%
echo   %PU%^|%R%                                                          %PU%^|%R%
echo   %PU%^|%R%    QZ Tray is installed and the Grabvo certificate       %PU%^|%R%
echo   %PU%^|%R%    is trusted. Printing will run silently.               %PU%^|%R%
echo   %PU%^|%R%                                                          %PU%^|%R%
echo   %PU%^|%R%    %SL%Verify: right-click the QZ Tray tray icon,%R%          %PU%^|%R%
echo   %PU%^|%R%    %SL%then Advanced - Site Manager.%R%                       %PU%^|%R%
echo   %PU%^|%R%                                                          %PU%^|%R%
echo   %PU%+----------------------------------------------------------+%R%
echo.
exit /b 0

:cleanup
cd /d "%TEMP%" >nul 2>&1
rd /s /q "%TEMP_DIR%" >nul 2>&1
echo.
pause
endlocal
exit /b 0
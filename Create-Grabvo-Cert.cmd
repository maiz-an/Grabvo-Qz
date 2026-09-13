@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Grabvo - Certificate Generator

:: =========================================================================
::   Grabvo Certificate Generator
::   ------------------------------------------------------------------------
::   Creates a self-signed certificate named "Grabvo" for use with QZ Tray.
::   Files are saved to %USERPROFILE%\Downloads\certificate
::   All output is pure ASCII - no chcp needed, no encoding issues.
:: =========================================================================

:: Enable VT escape sequences
reg add "HKCU\Console" /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

:: Self-elevate (winget install of OpenSSL may need admin)
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo   Requesting administrator privileges...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" >nul 2>&1
    exit /b
)

:: Colors
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
:: Configuration - the certificate's identity
:: -------------------------------------------------------------------------
:: Files are saved to Downloads\certificate — created if it doesn't exist.
set "CERT_DIR=%USERPROFILE%\Downloads\certificate"
set "CERT_C=QA"
set "CERT_ST=Doha"
set "CERT_L=Doha"
set "CERT_O=Grabvo"
set "CERT_CN=qz.grabvo.app"
set "CERT_DAYS=7300"
set "OPENSSL_EXE="

cls
call :banner

:: =========================================================================
:: STEP 1 - Workspace
:: =========================================================================
call :header "1/5" "Preparing workspace"

:: If the parent Downloads folder doesn't exist for some reason, create it.
if not exist "%USERPROFILE%\Downloads" mkdir "%USERPROFILE%\Downloads" >nul 2>&1

if not exist "%CERT_DIR%" mkdir "%CERT_DIR%" >nul 2>&1
if not exist "%CERT_DIR%" (
    call :fail "Could not create folder: %CERT_DIR%"
    goto :cleanup
)
cd /d "%CERT_DIR%"
if errorlevel 1 (
    call :fail "Could not change into: %CERT_DIR%"
    goto :cleanup
)
call :ok "Workspace ready"
echo   !SL!   %CERT_DIR%

:: =========================================================================
:: STEP 2 - Locate or install OpenSSL
:: =========================================================================
call :header "2/5" "Locating OpenSSL"

:: 2a - PATH
for /f "delims=" %%p in ('where openssl 2^>nul') do (
    if not defined OPENSSL_EXE set "OPENSSL_EXE=%%p"
)

:: 2b - Common install locations
if not defined OPENSSL_EXE (
    for %%p in (
        "C:\Program Files\OpenSSL-Win64\bin\openssl.exe"
        "C:\Program Files (x86)\OpenSSL-Win32\bin\openssl.exe"
        "C:\Program Files\Git\usr\bin\openssl.exe"
        "C:\Program Files\Git\mingw64\bin\openssl.exe"
        "C:\ProgramData\chocolatey\bin\openssl.exe"
        "C:\ProgramData\chocolatey\lib\openssl.light\tools\OpenSSL-Win64\bin\openssl.exe"
    ) do (
        if not defined OPENSSL_EXE if exist %%p set "OPENSSL_EXE=%%~p"
    )
)

if defined OPENSSL_EXE (
    call :ok "Found: !OPENSSL_EXE!"
    goto :step3
)

:: 2c - Not found - try winget
call :warn "OpenSSL not found - installing via winget"

where winget >nul 2>&1
if errorlevel 1 (
    call :fail "winget is not available on this system"
    echo.
    echo   Please install OpenSSL manually:
    echo     https://slproweb.com/products/Win32OpenSSL.html
    echo   Choose "Win64 OpenSSL v3 Light" and re-run this script.
    echo.
    goto :cleanup
)

echo   !SL!Installing OpenSSL (this may take 1-2 minutes)...
echo.
winget install --id ShiningLight.OpenSSL.Light --accept-package-agreements --accept-source-agreements --disable-interactivity

:: Give winget a moment to finalize
timeout /t 3 /nobreak >nul 2>&1

:: Re-check standard install paths
for %%p in (
    "C:\Program Files\OpenSSL-Win64\bin\openssl.exe"
    "C:\Program Files (x86)\OpenSSL-Win32\bin\openssl.exe"
) do (
    if not defined OPENSSL_EXE if exist %%p set "OPENSSL_EXE=%%~p"
)

:: Try PATH again as a last resort
if not defined OPENSSL_EXE (
    for /f "delims=" %%p in ('where openssl 2^>nul') do (
        if not defined OPENSSL_EXE set "OPENSSL_EXE=%%p"
    )
)

if not defined OPENSSL_EXE (
    call :fail "OpenSSL installed but binary not found"
    echo.
    echo   Try closing this window and running the script again.
    echo   If it still fails, install OpenSSL manually:
    echo     https://slproweb.com/products/Win32OpenSSL.html
    echo.
    goto :cleanup
)
call :ok "Installed: !OPENSSL_EXE!"

:: =========================================================================
:: STEP 3 - Back up any existing files
:: =========================================================================
:step3
call :header "3/5" "Checking for existing files"

set "BACKED_UP=0"

if exist "grabvo-private-key.pem" (
    ren "grabvo-private-key.pem" "grabvo-private-key.pem.bak-%RANDOM%%RANDOM%" >nul 2>&1
    set "BACKED_UP=1"
)
if exist "grabvo-digital-certificate.txt" (
    ren "grabvo-digital-certificate.txt" "grabvo-digital-certificate.txt.bak-%RANDOM%%RANDOM%" >nul 2>&1
    set "BACKED_UP=1"
)
if exist "override.crt" (
    ren "override.crt" "override.crt.bak-%RANDOM%%RANDOM%" >nul 2>&1
    set "BACKED_UP=1"
)

if "!BACKED_UP!"=="1" (
    call :warn "Existing files renamed to *.bak-XXXXXX"
) else (
    call :ok "No existing files to back up"
)

:: =========================================================================
:: STEP 4 - Generate the certificate
:: =========================================================================
call :header "4/5" "Generating Grabvo certificate"
echo   !SL!Organization: !CERT_O!
echo   !SL!Common name:  !CERT_CN!
echo   !SL!Valid for:    !CERT_DAYS! days (20 years)
echo.

set "SUBJ=/C=!CERT_C!/ST=!CERT_ST!/L=!CERT_L!/O=!CERT_O!/CN=!CERT_CN!"

"!OPENSSL_EXE!" req -x509 -newkey rsa:2048 -keyout "grabvo-private-key.pem" -out "grabvo-digital-certificate.txt" -days !CERT_DAYS! -nodes -subj "!SUBJ!" 2>nul

if not exist "grabvo-private-key.pem" (
    call :fail "Private key was not created"
    goto :cleanup
)
if not exist "grabvo-digital-certificate.txt" (
    call :fail "Certificate was not created"
    goto :cleanup
)

:: Sanity check - ensure the output is a real PEM
findstr /C:"BEGIN CERTIFICATE" "grabvo-digital-certificate.txt" >nul 2>&1
if errorlevel 1 (
    call :fail "Certificate file is not a valid PEM"
    goto :cleanup
)
findstr /C:"BEGIN PRIVATE KEY" "grabvo-private-key.pem" >nul 2>&1
if errorlevel 1 (
    call :fail "Private key file is not a valid PEM"
    goto :cleanup
)

call :ok "Private key created (grabvo-private-key.pem)"
call :ok "Certificate created (grabvo-digital-certificate.txt)"

:: =========================================================================
:: STEP 5 - Create the override.crt copy for QZ Tray
:: =========================================================================
call :header "5/5" "Creating override.crt for QZ Tray"

copy /Y "grabvo-digital-certificate.txt" "override.crt" >nul 2>&1
if exist "override.crt" (
    call :ok "override.crt created"
) else (
    call :warn "Could not create override.crt - rename the .txt manually"
)

:: =========================================================================
:: Done
:: =========================================================================
call :complete
goto :cleanup

:: =========================================================================
:: UI subroutines
:: =========================================================================

:banner
echo.
echo   %PU%%B%============================================================%R%
echo.
echo   %PU%%B%.d8888b.                    888                        %R%
echo   %PU%%B%d88P  Y88b                  888                        %R%
echo   %PU%%B%888    888                  888                        %R%
echo   %PU%%B%888        888d888  8888b.  88888b.  888  888  .d88b.  %R%
echo   %PU%%B%888  88888 888P"       "88b 888 "88b 888  888 d88""88b %R%
echo   %PU%%B%888    888 888     .d888888 888  888 Y88  88P 888  888 %R%
echo   %PU%%B%Y88b  d88P 888     888  888 888 d88P  Y8bd8P  Y88..88P %R%
echo   %PU%%B% "Y8888P88 888     "Y888888 88888P"    Y88P    "Y88P"  %R%
echo.
echo   %WH%%B%             Certificate Generator%R%
echo   %SL%        Create a self-signed Grabvo certificate%R%
echo   %SL%        for QZ Tray - no purchase required%R%
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
echo   %GR%%B%[OK]%R%    %WH%%~1%R%
exit /b 0

:warn
setlocal DisableDelayedExpansion
echo   %AM%%B%[!!]%R%    %AM%%~1%R%
endlocal
exit /b 0

:fail
echo   %RD%%B%[XX]%R%    %RD%%B%%~1%R%
exit /b 1

:complete
cls
echo.
echo   %GR%%B%============================================================%R%
echo.
echo   %GR%%B%             CERTIFICATE CREATED%R%
echo.
echo   %GR%%B%============================================================%R%
echo.
echo   %WH%Files created in:%R%
echo   %SL%   %CERT_DIR%%R%
echo.
echo   %WH%1. grabvo-private-key.pem%R%
echo   %SL%   Private signing key. KEEP SECRET.%R%
echo   %SL%   Upload to your server as QZ_PRIVATE_KEY.%R%
echo.
echo   %WH%2. grabvo-digital-certificate.txt%R%
echo   %SL%   Public certificate.%R%
echo   %SL%   Upload to your server as QZ_CERTIFICATE.%R%
echo.
echo   %WH%3. override.crt%R%
echo   %SL%   Ready-to-drop copy for each printing PC.%R%
echo.
echo   %GR%%B%------------------------------------------------------------%R%
echo.
echo   %SL%To open this folder:%R%
echo   %SL%   explorer "%CERT_DIR%"%R%
echo.
echo   %WH%Next steps:%R%
echo.
echo   %SL%1. Upload the two files to Vercel as environment vars%R%
echo   %SL%   (Settings -^> Environment Variables -^> add QZ_PRIVATE_KEY%R%
echo   %SL%   and QZ_CERTIFICATE, then redeploy)%R%
echo.
echo   %SL%2. On each printing PC, copy override.crt into%R%
echo   %SL%   C:\Program Files\QZ Tray\ and add this last line%R%
echo   %SL%   to qz-tray.properties:%R%
echo.
echo   %WH%     authcert.override=override.crt%R%
echo.
echo   %SL%3. Right-click the QZ Tray tray icon -^> Exit, then%R%
echo   %SL%   relaunch. Site Manager will now show "Grabvo".%R%
echo.
exit /b 0

:cleanup
cd /d "%USERPROFILE%" >nul 2>&1
echo   ============================================================
echo    Press any key to close this window.
echo   ============================================================
echo.
pause
endlocal
exit /b 0
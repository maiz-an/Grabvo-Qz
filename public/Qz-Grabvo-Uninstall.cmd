@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Grabvo - QZ Tray Uninstaller

:: =========================================================================
::   Grabvo QZ Tray Uninstaller
::   Removes everything the installer created:
::     - QZ Tray application
::     - Grabvo certificate from the trust list (allowed.dat)
::     - override.crt backup trust file
::     - Per-user and machine-wide QZ data folders
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
set "QZ_INSTALL_DIR=%PROGRAMFILES%\QZ Tray"
set "QZ_INSTALL_DIR_X86=%PROGRAMFILES(X86)%\QZ Tray"
set "QZ_USER_DATA=%APPDATA%\qz"
set "QZ_MACHINE_DATA=%PROGRAMDATA%\qz"
set "QZ_UNINSTALLER=%QZ_INSTALL_DIR%\uninstall.exe"

cls
call :banner

:: =========================================================================
::   STEP 1 - Stop all QZ Tray processes
:: =========================================================================
call :header "1/5" "Stopping QZ Tray processes"

taskkill /IM "qz-tray.exe" /F >nul 2>&1
taskkill /IM "qz-tray-console.exe" /F >nul 2>&1
:: Kill any java processes running from the QZ Tray folder
for /f "tokens=2" %%p in ('tasklist /FI "IMAGENAME eq java.exe" /FO LIST 2^>nul ^| findstr /I "PID:"') do (
    wmic process where "ProcessId=%%p" get ExecutablePath 2>nul | findstr /I "QZ Tray" >nul && taskkill /PID %%p /F >nul 2>&1
)
for /f "tokens=2" %%p in ('tasklist /FI "IMAGENAME eq javaw.exe" /FO LIST 2^>nul ^| findstr /I "PID:"') do (
    wmic process where "ProcessId=%%p" get ExecutablePath 2>nul | findstr /I "QZ Tray" >nul && taskkill /PID %%p /F >nul 2>&1
)

timeout /t 2 /nobreak >nul 2>&1
call :ok "All QZ Tray processes stopped"

:: =========================================================================
::   STEP 2 - Run the QZ Tray uninstaller
:: =========================================================================
call :header "2/5" "Removing QZ Tray application"

set "UNINSTALLED=0"

:: Preferred path: the official silent uninstaller
if exist "%QZ_UNINSTALLER%" (
    start /wait "" "%QZ_UNINSTALLER%" /S
    timeout /t 3 /nobreak >nul 2>&1
    set "UNINSTALLED=1"
)

:: Fallback: look up the uninstall string in the registry
if "!UNINSTALLED!"=="0" (
    for /f "usebackq tokens=*" %%u in (`powershell -NoProfile -Command "try { $p = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like '*QZ Tray*' } | Select-Object -First 1; if ($p) { $p.UninstallString } } catch {}" 2^>nul`) do (
        echo   !SL!Found registry uninstall entry: %%u
        start /wait "" cmd /c "%%u /S"
        timeout /t 3 /nobreak >nul 2>&1
        set "UNINSTALLED=1"
    )
)

if "!UNINSTALLED!"=="1" (
    call :ok "QZ Tray uninstaller executed"
) else (
    call :warn "No QZ Tray uninstaller found - will remove folders manually"
)

:: =========================================================================
::   STEP 3 - Remove leftover QZ Tray folders
:: =========================================================================
call :header "3/5" "Removing leftover application folders"

if exist "%QZ_INSTALL_DIR%" (
    rd /s /q "%QZ_INSTALL_DIR%" >nul 2>&1
    if exist "%QZ_INSTALL_DIR%" (
        call :warn "Could not fully remove: %QZ_INSTALL_DIR%"
    ) else (
        call :ok "Removed %QZ_INSTALL_DIR%"
    )
)

if exist "%QZ_INSTALL_DIR_X86%" (
    rd /s /q "%QZ_INSTALL_DIR_X86%" >nul 2>&1
    if not exist "%QZ_INSTALL_DIR_X86%" (
        call :ok "Removed %QZ_INSTALL_DIR_X86%"
    )
)

:: =========================================================================
::   STEP 4 - Remove trust files (certificate + allow-list)
:: =========================================================================
call :header "4/5" "Removing Grabvo certificate trust"

:: Per-user QZ data folder (contains allowed.dat, override.crt, cache)
if exist "%QZ_USER_DATA%" (
    rd /s /q "%QZ_USER_DATA%" >nul 2>&1
    if exist "%QZ_USER_DATA%" (
        call :warn "Could not fully remove: %QZ_USER_DATA%"
    ) else (
        call :ok "Removed per-user trust: %QZ_USER_DATA%"
    )
) else (
    call :ok "No per-user trust data to remove"
)

:: Machine-wide QZ data folder (mirrored allowed.dat)
if exist "%QZ_MACHINE_DATA%" (
    rd /s /q "%QZ_MACHINE_DATA%" >nul 2>&1
    if exist "%QZ_MACHINE_DATA%" (
        call :warn "Could not fully remove: %QZ_MACHINE_DATA%"
    ) else (
        call :ok "Removed machine-wide trust: %QZ_MACHINE_DATA%"
    )
) else (
    call :ok "No machine-wide trust data to remove"
)

:: Leftover override.crt in either install dir (belt and braces —
:: the folder removal above usually takes this with it)
if exist "%QZ_INSTALL_DIR%\override.crt" (
    del /f /q "%QZ_INSTALL_DIR%\override.crt" >nul 2>&1
    call :ok "Removed override.crt"
)

:: =========================================================================
::   STEP 5 - Remove leftover shortcuts
:: =========================================================================
call :header "5/5" "Removing leftover shortcuts"

del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\QZ Tray\*.lnk" >nul 2>&1
rd /s /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\QZ Tray" >nul 2>&1
del /f /q "%PUBLIC%\Desktop\QZ Tray.lnk" >nul 2>&1
del /f /q "%USERPROFILE%\Desktop\QZ Tray.lnk" >nul 2>&1
call :ok "Shortcut cleanup complete"

:: =========================================================================
::   DONE
:: =========================================================================
call :complete
goto :cleanup

:: =========================================================================
::   UI (all ASCII)
:: =========================================================================

:banner
echo.
echo   %RD%%B%============================================================%R%
echo.
echo   %PU%%B%        ####  ####     #    ####   #   #   ####%R%
echo   %PU%%B%        #     #   #   # #   #   #  #   #  #   #%R%
echo   %PU%%B%        # ### ####   ##### ####    #   #  #   #%R%
echo   %PU%%B%        #   # #  #   #   # #   #    # #   #   #%R%
echo   %PU%%B%        ### # #   #  #   # ####      #     ####%R%
echo.
echo   %WH%%B%              QZ Tray Uninstaller%R%
echo   %SL%      Remove QZ Tray + the Grabvo certificate%R%
echo.
echo   %RD%%B%============================================================%R%
echo.
echo   %AM%%B%This will remove QZ Tray and its trust data from%R%
echo   %AM%%B%this computer. You can always reinstall with the%R%
echo   %AM%%B%Grabvo installer if you change your mind.%R%
echo.
call :ok "Starting uninstall in 3 seconds..."
timeout /t 3 /nobreak >nul 2>&1
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
echo   %RD%%B%        #   # #   # #  ####  #     ####  ####  ####%R%
echo   %RD%%B%        #   # ##  # #  #     #     #  #  #     #   #%R%
echo   %RD%%B%        #   # # # # #   ##   #     #  #  ###   ####%R%
echo   %RD%%B%        #   # #  ## #     #  #     #  #  #     # #%R%
echo   %RD%%B%         ###  #   # #  ###   ####  ####  ####  #  #%R%
echo.
echo   %RD%%B%             UNINSTALL COMPLETE%R%
echo.
echo   %PU%%B%============================================================%R%
echo.
echo   %WH%QZ Tray has been removed from this computer.%R%
echo   %WH%The Grabvo certificate trust has been cleared.%R%
echo.
echo   %SL%Notes:%R%
echo   %SL%  - Any printers previously set up in this browser%R%
echo   %SL%    will show "no printer assigned" until you reinstall.%R%
echo   %SL%  - If a QZ Tray icon is still in your system tray,%R%
echo   %SL%    right-click it and choose "Exit", or log out and%R%
echo   %SL%    back in to clear it.%R%
echo.
exit /b 0

:cleanup
echo.
pause
endlocal
exit /b 0
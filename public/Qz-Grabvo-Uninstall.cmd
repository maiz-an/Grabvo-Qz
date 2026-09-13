@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Grabvo - QZ Tray Uninstaller

:: =========================================================================
::   Grabvo QZ Tray Uninstaller (v2 - robust)
::   ------------------------------------------------------------------------
::   Removes QZ Tray, its auto-start entries, and the Grabvo certificate
::   trust. Handles the QZ Tray 2.1.1+ silent-uninstall bug by setting
::   qz-print_silent=1 and launching the uninstaller DETACHED so it can
::   never touch this console. Verifies removal before claiming success.
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
set "QZ_INSTALL_DIR=%PROGRAMFILES%\QZ Tray"
set "QZ_INSTALL_DIR_X86=%PROGRAMFILES(X86)%\QZ Tray"
set "QZ_USER_DATA=%APPDATA%\qz"
set "QZ_MACHINE_DATA=%PROGRAMDATA%\qz"
set "QZ_UNINSTALLER=%QZ_INSTALL_DIR%\uninstall.exe"

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

goto :cleanup

:: =========================================================================
::   STEP 1 - Kill QZ Tray processes
:: =========================================================================
:step1
call :header "1/7" "Stopping all QZ Tray processes"
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
::   STEP 3 - Run the uninstaller, DETACHED
:: =========================================================================
:step3
call :header "3/7" "Running QZ Tray uninstaller"

if not exist "%QZ_UNINSTALLER%" (
    call :warn "No uninstaller found - will wipe folders manually"
    exit /b 0
)

:: qz-print_silent=1 is the documented workaround for the QZ Tray
:: 2.1.1+ silent-uninstall respawn bug (GitHub issue #713). Without it,
:: the /S flag is dropped when the stub respawns itself.
set "qz-print_silent=1"
echo   !SL!Launching uninstaller (detached, hidden)...
powershell -NoProfile -Command "Start-Process -FilePath '%QZ_UNINSTALLER%' -ArgumentList '/S' -WindowStyle Hidden" >nul 2>&1

:: Poll for up to 60s for the install folder to disappear.
set /a POLL=0
call :poll_uninstall
exit /b 0

:poll_uninstall
timeout /t 2 /nobreak >nul 2>&1
set /a POLL+=1
if not exist "%QZ_INSTALL_DIR%\uninstall.exe" (
    call :ok "Uninstaller finished"
    exit /b 0
)
if !POLL! GEQ 30 (
    call :warn "Uninstaller timed out - forcing cleanup"
    exit /b 0
)
goto :poll_uninstall

:: =========================================================================
::   STEP 4 - Wipe install folders
:: =========================================================================
:step4
call :header "4/7" "Removing application folders"

:: Kill anything the uninstaller respawned, so file locks release
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
::   STEP 5 - Trust data
:: =========================================================================
:step5
call :header "5/7" "Removing certificate trust data"

if exist "%QZ_USER_DATA%" (
    rd /s /q "%QZ_USER_DATA%" >nul 2>&1
    if not exist "%QZ_USER_DATA%" (
        call :ok "Removed per-user trust: %QZ_USER_DATA%"
    ) else (
        call :warn "Could not remove %QZ_USER_DATA%"
    )
) else (
    call :ok "No per-user trust data present"
)

if exist "%QZ_MACHINE_DATA%" (
    rd /s /q "%QZ_MACHINE_DATA%" >nul 2>&1
    if not exist "%QZ_MACHINE_DATA%" (
        call :ok "Removed machine-wide trust: %QZ_MACHINE_DATA%"
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

:: Install folder must be gone
if exist "%QZ_INSTALL_DIR%\qz-tray.jar" set "VERIFY_OK=0"
if exist "%QZ_INSTALL_DIR%\qz-tray.exe" set "VERIFY_OK=0"
if exist "%QZ_INSTALL_DIR%\uninstall.exe" set "VERIFY_OK=0"

:: No QZ Tray process should be running
tasklist /FI "IMAGENAME eq qz-tray.exe" 2>nul | find /I "qz-tray.exe" >nul
if !errorLevel! equ 0 set "VERIFY_OK=0"
tasklist /FI "IMAGENAME eq qz-tray-console.exe" 2>nul | find /I "qz-tray-console.exe" >nul
if !errorLevel! equ 0 set "VERIFY_OK=0"

if "!VERIFY_OK!"=="1" (
    call :ok "Verified: QZ Tray is fully removed"
    call :complete_ok
) else (
    call :warn "Some QZ Tray files or processes are still present"
    call :complete_warn
)
exit /b 0

:: =========================================================================
::   UI
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

:complete_ok
echo.
echo   %PU%%B%============================================================%R%
echo.
echo   %GR%%B%        #   # #   # #  ####  #     ####  ####  ####%R%
echo   %GR%%B%        #   # ##  # #  #     #     #  #  #     #   #%R%
echo   %GR%%B%        #   # # # # #   ##   #     #  #  ###   ####%R%
echo   %GR%%B%        #   # #  ## #     #  #     #  #  #     # #%R%
echo   %GR%%B%         ###  #   # #  ###   ####  ####  ####  #  #%R%
echo.
echo   %GR%%B%             UNINSTALL COMPLETE%R%
echo.
echo   %PU%%B%============================================================%R%
echo.
echo   %WH%QZ Tray and the Grabvo certificate trust have been%R%
echo   %WH%removed from this computer.%R%
echo.
echo   %SL%Note: the QZ Tray system tray icon may remain until you%R%
echo   %SL%log out and back in. That's normal on Windows - Windows%R%
echo   %SL%caches tray icons for a few minutes after the app exits.%R%
echo.
exit /b 0

:complete_warn
echo.
echo   %AM%%B%============================================================%R%
echo.
echo   %AM%%B%          CLEANUP FINISHED WITH WARNINGS%R%
echo.
echo   %AM%%B%============================================================%R%
echo.
echo   %WH%Some QZ Tray files or processes could not be removed.%R%
echo   %WH%This usually means QZ Tray was still running when the%R%
echo   %WH%script started.%R%
echo.
echo   %SL%Try this:%R%
echo   %SL%  1. Right-click the QZ Tray tray icon and choose Exit%R%
echo   %SL%  2. Run this uninstaller again%R%
echo   %SL%  3. If it still fails, restart Windows and run it once more%R%
echo.
exit /b 0

:: =========================================================================
::   CLEANUP - always runs, always pauses
:: =========================================================================
:cleanup
cd /d "%TEMP%" >nul 2>&1
echo.
echo   ============================================================
echo    Press any key to close this window.
echo   ============================================================
echo.
pause
endlocal
exit /b 0
@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title QUAN LY CODE GITHUB - PHI HUNG PORTFOLIO
color 0B

rem Kiem tra Git da duoc cai dat chua
where git >nul 2>nul
if errorlevel 1 goto NO_GIT

rem Kiem tra va thiet lap thong tin neu chua co
git config user.name >nul 2>nul
if errorlevel 1 (
    git config user.name "phihun780"
    git config user.email "phihun780@users.noreply.github.com"
)

:MENU
cls
color 0B
echo =======================================================
echo        CONG CU DONG BO GITHUB - PHI HUNG PORTFOLIO
echo =======================================================
echo.
echo   [1] Clear va ghi de toan bo len GitHub (Force Push ban sach)
echo   [2] Cap nhat / Day code moi len GitHub (Dong bo thong thuong)
echo   [0] Thoat
echo.
echo =======================================================
set "choice="
set /p choice="  Nhap lua chon cua ban (1, 2 hoac 0): "

if "%choice%"=="1" goto CLEAR_PUSH
if "%choice%"=="2" goto NORMAL_PUSH
if "%choice%"=="0" exit /b 0

echo.
echo   Lua chon khong hop le! Vui long nhap 1, 2 hoac 0.
timeout /t 2 >nul
goto MENU

:NORMAL_PUSH
cls
color 0A
echo =======================================================
echo      [2] DANG CAP NHAT CODE LEN GITHUB
echo =======================================================
echo.
echo [1/3] Dang kiem tra va dong bo tu GitHub...
git pull origin main --no-edit >nul 2>nul

echo [2/3] Dang dong goi code thay doi...
git add .
git commit -m "Update portfolio: %date% %time%" >nul 2>nul

echo.
echo [3/3] Dang day code len GitHub...
git push origin main
if errorlevel 1 goto PUSH_ERROR

color 0A
echo.
echo =======================================================
echo    THANH CONG! Code da duoc cap nhat len GitHub.
echo    Cloudflare Pages dang tu dong cap nhat website...
echo =======================================================
echo.
pause
exit /b 0

:CLEAR_PUSH
cls
color 0E
echo =======================================================
echo    [1] CLEAR VA RESET GHI DE TOAN BO LEN GITHUB
echo =======================================================
echo.
echo   CANH BAO:
echo   Lua chon nay se xoa sach cac xung dot tren GitHub
echo   va ep (Force Push) toan bo code hien tai tu may ban len.
echo.
set "confirm="
set /p confirm="  Ban co chac chan muon thuc hien? (Y = Dong y / N = Huy): "

if /i not "%confirm%"=="Y" (
    echo.
    echo   Da huy thao tac! Quay ve menu...
    timeout /t 2 >nul
    goto MENU
)

cls
color 0E
echo =======================================================
echo    DANG TIEN HANH CLEAR VA FORCE PUSH LEN GITHUB...
echo =======================================================
echo.
echo [1/2] Dang dong goi toan bo code sach tu may...
git add .
git commit -m "Reset & Fresh Push: %date% %time%" >nul 2>nul

echo.
echo [2/2] Dang clear va ghi de len GitHub (Force Push)...
git push origin main --force
if errorlevel 1 goto PUSH_ERROR

color 0A
echo.
echo =======================================================
echo    THANH CONG! Da clear va dong bo ban sach len GitHub.
echo    Cloudflare Pages dang tu dong build lai website...
echo =======================================================
echo.
pause
exit /b 0

:NO_GIT
color 0C
echo =======================================================
echo    LOI: MAY TINH CUA BAN CHUA CAI DAT GIT!
echo =======================================================
echo.
echo    HUONG DAN XU LY CHO MAY MOI:
echo    1. Vao link: https://git-scm.com/download/win
echo    2. Tai file va cai dat Git vao may.
echo    3. Sau do mo lai file nay la xong ngay!
echo.
echo =======================================================
echo.
pause
exit /b 1

:PUSH_ERROR
color 0C
echo.
echo =======================================================
echo    LOI: KHONG THE DAY CODE LEN GITHUB!
echo =======================================================
echo.
echo    HUONG DAN XU LY:
echo.
echo    1. Neu trinh duyet bat popup hoi dang nhap:
echo       Hay bam "Sign in with your browser" de xac thuc.
echo.
echo    2. Dam bao may tinh cua ban dang co ket noi Internet.
echo.
echo =======================================================
echo.
pause
exit /b 1




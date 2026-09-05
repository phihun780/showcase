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
echo        CONG CU QUAN LY GITHUB - PHI HUNG PORTFOLIO
echo =======================================================
echo.
echo   [1] Xoa sach toan bo code tren GitHub (Khong up gi ca)
echo   [2] Up lai tu dau toan bo code len GitHub
echo   [0] Thoat
echo.
echo =======================================================
set "choice="
set /p choice="  Nhap lua chon cua ban (1, 2 hoac 0): "

if "%choice%"=="1" goto CLEAR_GITHUB
if "%choice%"=="2" goto UPLOAD_ALL
if "%choice%"=="0" exit /b 0

echo.
echo   Lua chon khong hop le! Vui long nhap 1, 2 hoac 0.
timeout /t 2 >nul
goto MENU

:CLEAR_GITHUB
cls
color 0C
echo =======================================================
echo    [1] XOA SACH TOAN BO CODE TREN GITHUB
echo =======================================================
echo.
echo   CANH BAO:
echo   - Thao tac nay se XOA SACH moi file tren kho GitHub.
echo   - Khong up bat ky code nao len.
echo   - Code tren may tinh cua ban van giu nguyen 100%%.
echo.
set "confirm="
set /p confirm="  Ban co chac muon XOA SACH tren GitHub? (Y = Dong y / N = Huy): "

if /i not "%confirm%"=="Y" (
    echo.
    echo   Da huy thao tac! Quay ve menu...
    timeout /t 2 >nul
    goto MENU
)

cls
color 0C
echo =======================================================
echo    DANG TIEN HANH XOA SACH CODE TREN GITHUB...
echo =======================================================
echo.
for /f "tokens=*" %%i in ('git commit-tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904 -m "Clear all code on GitHub"') do set EMPTY_COMMIT=%%i

echo [1/1] Dang xoa sach kho luu tru tren GitHub...
git push origin %EMPTY_COMMIT%:main --force
if errorlevel 1 goto PUSH_ERROR

color 0A
echo.
echo =======================================================
echo    THANH CONG! Kho GitHub hien da duoc xoa sach hoan toan.
echo    (Code tren may tinh cua ban van an toan 100%%)
echo =======================================================
echo.
pause
exit /b 0

:UPLOAD_ALL
cls
color 0A
echo =======================================================
echo    [2] UP LAI TU DAU TOAN BO CODE LEN GITHUB
echo =======================================================
echo.
echo [1/2] Dang dong goi toan bo code tren may tinh...
git add .
git commit -m "Upload full project: %date% %time%" >nul 2>nul

echo.
echo [2/2] Dang day toan bo code len GitHub...
git push origin main --force
if errorlevel 1 goto PUSH_ERROR

color 0A
echo.
echo =======================================================
echo    THANH CONG! Toan bo code da duoc up len GitHub.
echo    Cloudflare Pages dang tu dong cap nhat website...
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
echo    LOI: KHONG THE KET NOI HOAC DAY LEN GITHUB!
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




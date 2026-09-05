@echo off
cd /d "%~dp0"
title CAP NHAT CODE GITHUB - PHI HUNG PORTFOLIO
color 0A

echo =======================================================
echo    DANG CAP NHAT CODE LEN GITHUB VA CLOUDFLARE
echo =======================================================
echo.

rem Kiem tra Git da duoc cai dat chua
where git >nul 2>nul
if errorlevel 1 goto NO_GIT

rem Kiem tra va thiet lap thong tin neu chua co
git config user.name >nul 2>nul
if errorlevel 1 (
    git config user.name "phihun780"
    git config user.email "phihun780@users.noreply.github.com"
)

echo [1/3] Dang dong bo du lieu moi tu GitHub...
git pull origin main --no-edit >nul 2>nul

echo [2/3] Dang luu thay doi code...
git add .
git commit -m "Update portfolio: %date% %time%" >nul 2>nul

echo.
echo [3/3] Dang day code len GitHub...
git push origin main
if errorlevel 1 goto PUSH_ERROR

color 0A
echo.
echo =======================================================
echo    THANH CONG! Code da duoc day len GitHub.
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
echo    LOI: KHONG THE DAY CODE LEN GITHUB!
echo =======================================================
echo.
echo    HUONG DAN XU LY KHI DOI SANG MAY MOI:
echo.
echo    1. Neu trinh duyet bat popup hoi dang nhap:
echo       Hay bam "Sign in with your browser" de xac thuc.
echo.
echo    2. Dam bao may tinh cua ban dang co ket noi mang.
echo.
echo =======================================================
echo.
pause
exit /b 1




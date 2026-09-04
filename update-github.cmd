@echo off
cd /d "%~dp0"
title DAY CODE LEN GITHUB - PHI HUNG PORTFOLIO
color 0A

echo =======================================================
echo    DANG CAP NHAT CODE LEN GITHUB VA CLOUDFLARE
echo =======================================================
echo.

echo [1/2] Dang luu thay doi code...
git add .
git commit -m "Update portfolio: %date% %time%"

echo.
echo [2/2] Dang day code len GitHub (git push origin main)...
git push origin main

echo.
if %errorlevel% equ 0 (
    echo =======================================================
    echo    THANH CONG! Code da duoc day len GitHub.
    echo    Cloudflare Pages dang tu dong cap nhat website!
    echo =======================================================
) else (
    color 0C
    echo =======================================================
    echo    CO LOI XAY RA KHI DAY LEN GITHUB!
    echo =======================================================
)

echo.
pause


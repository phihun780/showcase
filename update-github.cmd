@echo off
chcp 65001 >nul
title ĐẨY CODE LÊN GITHUB - PHI HÙNG PORTFOLIO
color 0A

echo =======================================================
echo    🚀 TỰ ĐỘNG ĐẨY CODE MỚI LÊN GITHUB ^& CLOUDFLARE
echo =======================================================
echo.

echo [1/3] Đang kiểm tra và đóng gói (build) dự án...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ❌ LỖI: Build thất bại! Vui lòng kiểm tra lại code trước khi đẩy.
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Đang lưu thay đổi (git add ^& commit)...
git add .

set "commitMsg="
set /p "commitMsg=Nhập ghi chú thay đổi (hoặc nhấn ENTER để dùng mặc định): "
if not defined commitMsg (
    set "commitMsg=Update portfolio: %date% %time%"
)

git commit -m "%commitMsg%"

echo.
echo [3/3] Đang đẩy code lên GitHub (git push origin main)...
git push origin main
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ❌ LỖI: Không thể đẩy lên GitHub. Vui lòng kiểm tra kết nối mạng hoặc tài khoản.
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo =======================================================
echo    🎉 ĐÃ ĐẨY CODE LÊN GITHUB THÀNH CÔNG!
echo    ⚡ Cloudflare Pages đang tự động cập nhật website...
echo =======================================================
echo.
pause

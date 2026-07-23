Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Bắt đầu chạy kịch bản xác minh Repository Foundation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Cài đặt packages
Write-Host "1. Đang cài đặt dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Lỗi: Cài đặt dependencies thất bại!" -ForegroundColor Red
    exit 1
}

# 2. Xây dựng các shared packages trước tiên để tạo các build artifact / declaration files
Write-Host "2. Đang xây dựng các shared packages..." -ForegroundColor Yellow
npm run build:all
if ($LASTEXITCODE -ne 0) {
    Write-Host "Lỗi: Xây dựng packages thất bại!" -ForegroundColor Red
    exit 1
}

# 3. Kiểm tra TypeScript Typecheck
Write-Host "3. Đang kiểm tra TypeScript typecheck..." -ForegroundColor Yellow
npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "Lỗi: TypeScript typecheck thất bại!" -ForegroundColor Red
    exit 1
}

# 4. Kiểm tra ESLint
Write-Host "4. Đang kiểm tra Lint..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "Lỗi: Linting thất bại!" -ForegroundColor Red
    exit 1
}

# 5. Chạy Unit Tests
Write-Host "5. Đang chạy Unit Tests..." -ForegroundColor Yellow
npm run test
if ($LASTEXITCODE -ne 0) {
    Write-Host "Lỗi: Unit Tests thất bại!" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================" -ForegroundColor Green
Write-Host "Xác minh hoàn thành: Hợp lệ 100%!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
exit 0

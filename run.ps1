Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Starting College Management System (CMS) ERP" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

Write-Host ""
Write-Host "[1/2] Launching Backend Server (FastAPI + Django ASGI) in a new window..." -ForegroundColor Cyan
Start-Process cmd -ArgumentList "/k", "title CMS Backend Server && cd college && ..\venv\Scripts\uvicorn.exe college.asgi:application --reload"

Write-Host ""
Write-Host "[2/2] Launching Frontend Server..." -ForegroundColor Cyan
cd frontend
npm run dev

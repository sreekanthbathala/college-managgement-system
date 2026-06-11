@echo off
echo ==================================================
echo   Starting College Management System (CMS) ERP
echo ==================================================

echo.
echo [1/2] Launching Backend Server (FastAPI + Django ASGI) in a new window...
start cmd /k "title CMS Backend Server && cd college && ..\venv\Scripts\uvicorn.exe college.asgi:application --reload"

echo.
echo [2/2] Launching Frontend Server (React + Vite)...
cd frontend
npm run dev

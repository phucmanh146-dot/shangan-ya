@echo off
chcp 65001 >nul
cd /d "%~dp0"
python install_local.py
if errorlevel 1 pause
start "" http://127.0.0.1:8901/learning-agent.html

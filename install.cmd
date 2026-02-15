@echo off
REM Dex GitHub-only installer wrapper (Windows CMD)
REM Usage:
REM   powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/<owner>/<repo>/<ref>/install.ps1 | iex"

set "URL=https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm %URL% | iex"

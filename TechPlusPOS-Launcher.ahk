#NoEnv
#SingleInstance Force
SetWorkingDir %A_ScriptDir%

; TechPlusPOS Launcher
; This script launches the TechPlusPOS application

; Set the title for the launcher window
Gui, +AlwaysOnTop +ToolWindow
Gui, Add, Text, x20 y20 w300 h30, TechPlusPOS Launcher
Gui, Add, Text, x20 y50 w300 h20, Starting TechPlusPOS application...
Gui, Add, Progress, x20 y80 w300 h20 vProgressBar, 0
Gui, Show, w340 h120, TechPlusPOS Launcher

; Check if Node.js is installed
RunWait, cmd /c "node --version >nul 2>&1", , Hide
if (ErrorLevel != 0) {
    MsgBox, 16, Error, Node.js is not installed or not in PATH. Please install Node.js first.
    ExitApp
}

; Check if npm is installed
RunWait, cmd /c "npm --version >nul 2>&1", , Hide
if (ErrorLevel != 0) {
    MsgBox, 16, Error, npm is not installed or not in PATH. Please install npm first.
    ExitApp
}

; Check if required files exist
if (!FileExist("package.json")) {
    MsgBox, 16, Error, package.json not found. Please run this launcher from the TechPlusPOS directory.
    ExitApp
}

if (!FileExist("start-dev.bat")) {
    MsgBox, 16, Error, start-dev.bat not found. Please run this launcher from the TechPlusPOS directory.
    ExitApp
}

; Update progress
GuiControl,, ProgressBar, 25

; Kill any existing processes on ports 8000 and 8888
RunWait, cmd /c "for %%P in (8000 8888) do (for /f ""tokens=5"" %%a in ('netstat -ano ^| findstr :%%P') do (echo Killing process on port %%P with PID %%a && taskkill /PID %%a /F >nul 2>&1))", , Hide

; Update progress
GuiControl,, ProgressBar, 50

; Start the development servers
GuiControl,, ProgressBar, 75
Run, start-dev.bat, , Hide

; Update progress
GuiControl,, ProgressBar, 90

; Wait a moment for servers to start
Sleep, 3000

; Update progress
GuiControl,, ProgressBar, 100

; Show success message
Gui, Destroy
MsgBox, 64, Success, TechPlusPOS is starting!`n`nVite server: http://localhost:8000`nProxy server: http://localhost:8888`n`nThe application will open in your browser automatically.

; Open the application in default browser
Sleep, 2000
Run, http://localhost:8000

ExitApp 
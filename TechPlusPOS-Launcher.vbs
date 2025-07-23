' TechPlusPOS Launcher
' This script launches the TechPlusPOS application

Option Explicit

Dim objShell, objFSO, strPath, strNodePath, strNpmPath
Dim strPackageJson, strStartDev, strCommand

' Create objects
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get current directory
strPath = objFSO.GetAbsolutePathName(".")

' Show welcome message
MsgBox "TechPlusPOS Launcher" & vbCrLf & vbCrLf & _
       "This will start the TechPlusPOS application." & vbCrLf & _
       "Please ensure you have Node.js installed.", _
       vbInformation, "TechPlusPOS Launcher"

' Check if Node.js is installed
strNodePath = objShell.ExpandEnvironmentStrings("%PATH%")
If InStr(strNodePath, "node") = 0 Then
    MsgBox "ERROR: Node.js is not installed or not in PATH." & vbCrLf & _
           "Please install Node.js from https://nodejs.org/", _
           vbCritical, "TechPlusPOS Launcher"
    WScript.Quit 1
End If

' Check if required files exist
strPackageJson = strPath & "\package.json"
strStartDev = strPath & "\start-dev.bat"

If Not objFSO.FileExists(strPackageJson) Then
    MsgBox "ERROR: package.json not found." & vbCrLf & _
           "Please run this launcher from the TechPlusPOS directory.", _
           vbCritical, "TechPlusPOS Launcher"
    WScript.Quit 1
End If

If Not objFSO.FileExists(strStartDev) Then
    MsgBox "ERROR: start-dev.bat not found." & vbCrLf & _
           "Please run this launcher from the TechPlusPOS directory.", _
           vbCritical, "TechPlusPOS Launcher"
    WScript.Quit 1
End If

' Kill any existing processes on ports 8000 and 8888
objShell.Run "cmd /c ""for %%P in (8000 8888) do (for /f """"tokens=5"""" %%a in ('netstat -ano ^| findstr :%%P') do (echo Killing process on port %%P with PID %%a && taskkill /PID %%a /F >nul 2>&1))""", 0, True

' Start the development servers
MsgBox "Starting TechPlusPOS application..." & vbCrLf & vbCrLf & _
       "Vite server will be available at: http://localhost:8000" & vbCrLf & _
       "Proxy server will be available at: http://localhost:8888" & vbCrLf & vbCrLf & _
       "Please wait while the servers start...", _
       vbInformation, "TechPlusPOS Launcher"

' Run the start-dev.bat file
strCommand = "cmd /c """ & strStartDev & """"
objShell.Run strCommand, 1, False

' Wait a moment for servers to start
WScript.Sleep 5000

' Open the application in default browser
objShell.Run "http://localhost:8000", 1, False

' Show success message
MsgBox "TechPlusPOS is now running!" & vbCrLf & vbCrLf & _
       "The application should open in your browser automatically." & vbCrLf & _
       "If not, please visit: http://localhost:8000" & vbCrLf & vbCrLf & _
       "To stop the servers, close the command windows that opened.", _
       vbInformation, "TechPlusPOS Launcher"

' Clean up
Set objShell = Nothing
Set objFSO = Nothing 
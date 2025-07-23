using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

namespace TechPlusPOSLauncher
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.Title = "TechPlusPOS Launcher";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("========================================");
            Console.WriteLine("    TechPlusPOS Application Launcher");
            Console.WriteLine("========================================");
            Console.WriteLine();
            Console.ResetColor();

            try
            {
                // Check if Node.js is installed
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[20%] Checking Node.js installation...");
                Console.ResetColor();
                
                if (!IsNodeInstalled())
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("ERROR: Node.js is not installed or not in PATH.");
                    Console.WriteLine("Please install Node.js from https://nodejs.org/");
                    Console.ResetColor();
                    Console.WriteLine();
                    Console.WriteLine("Press any key to exit...");
                    Console.ReadKey();
                    return;
                }
                Console.WriteLine("✓ Node.js found");

                // Check if npm is installed
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[40%] Checking npm installation...");
                Console.ResetColor();
                
                if (!IsNpmInstalled())
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("ERROR: npm is not installed or not in PATH.");
                    Console.WriteLine("Please install npm with Node.js");
                    Console.ResetColor();
                    Console.WriteLine();
                    Console.WriteLine("Press any key to exit...");
                    Console.ReadKey();
                    return;
                }
                Console.WriteLine("✓ npm found");

                // Check if required files exist
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[60%] Checking required files...");
                Console.ResetColor();
                
                if (!File.Exists("package.json"))
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("ERROR: package.json not found.");
                    Console.WriteLine("Please run this launcher from the TechPlusPOS directory.");
                    Console.ResetColor();
                    Console.WriteLine();
                    Console.WriteLine("Press any key to exit...");
                    Console.ReadKey();
                    return;
                }
                Console.WriteLine("✓ package.json found");

                if (!File.Exists("start-dev.bat"))
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("ERROR: start-dev.bat not found.");
                    Console.WriteLine("Please run this launcher from the TechPlusPOS directory.");
                    Console.ResetColor();
                    Console.WriteLine();
                    Console.WriteLine("Press any key to exit...");
                    Console.ReadKey();
                    return;
                }
                Console.WriteLine("✓ start-dev.bat found");

                // Kill any existing processes on ports 8000 and 8888
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[80%] Clearing ports 8000 and 8888...");
                Console.ResetColor();
                
                KillProcessesOnPorts(new int[] { 8000, 8888 });
                Console.WriteLine("✓ Ports cleared");

                // Start the development servers
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[100%] Starting TechPlusPOS application...");
                Console.ResetColor();
                Console.WriteLine();
                Console.WriteLine("Starting development servers...");
                Console.WriteLine("Vite server will be available at: http://localhost:8000");
                Console.WriteLine("Proxy server will be available at: http://localhost:8888");
                Console.WriteLine();
                Console.WriteLine("Please wait while the servers start...");
                Console.WriteLine();

                // Run the start-dev.bat file
                ProcessStartInfo startInfo = new ProcessStartInfo();
                startInfo.FileName = "cmd.exe";
                startInfo.Arguments = "/c start-dev.bat";
                startInfo.UseShellExecute = true;
                startInfo.WindowStyle = ProcessWindowStyle.Normal;

                Process.Start(startInfo);

                // Wait a moment for servers to start
                Thread.Sleep(5000);

                // Open the application in default browser
                Process.Start("http://localhost:8000");

                Console.WriteLine();
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("========================================");
                Console.WriteLine("    TechPlusPOS is now running!");
                Console.WriteLine("========================================");
                Console.ResetColor();
                Console.WriteLine();
                Console.WriteLine("The application should open in your browser automatically.");
                Console.WriteLine("If not, please visit: http://localhost:8000");
                Console.WriteLine();
                Console.WriteLine("To stop the servers, close the command windows that opened.");
                Console.WriteLine();
                Console.WriteLine("Press any key to close this window...");
                Console.ReadKey();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"ERROR: {ex.Message}");
                Console.ResetColor();
                Console.WriteLine();
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
            }
        }

        static bool IsNodeInstalled()
        {
            try
            {
                ProcessStartInfo startInfo = new ProcessStartInfo();
                startInfo.FileName = "node";
                startInfo.Arguments = "--version";
                startInfo.UseShellExecute = false;
                startInfo.RedirectStandardOutput = true;
                startInfo.CreateNoWindow = true;

                using (Process process = Process.Start(startInfo))
                {
                    process.WaitForExit();
                    return process.ExitCode == 0;
                }
            }
            catch
            {
                return false;
            }
        }

        static bool IsNpmInstalled()
        {
            try
            {
                ProcessStartInfo startInfo = new ProcessStartInfo();
                startInfo.FileName = "npm";
                startInfo.Arguments = "--version";
                startInfo.UseShellExecute = false;
                startInfo.RedirectStandardOutput = true;
                startInfo.CreateNoWindow = true;

                using (Process process = Process.Start(startInfo))
                {
                    process.WaitForExit();
                    return process.ExitCode == 0;
                }
            }
            catch
            {
                return false;
            }
        }

        static void KillProcessesOnPorts(int[] ports)
        {
            try
            {
                ProcessStartInfo startInfo = new ProcessStartInfo();
                startInfo.FileName = "cmd.exe";
                startInfo.Arguments = "/c \"for %%P in (8000 8888) do (for /f \"tokens=5\" %%a in ('netstat -ano ^| findstr :%%P') do (echo Killing process on port %%P with PID %%a && taskkill /PID %%a /F >nul 2>&1))\"";
                startInfo.UseShellExecute = false;
                startInfo.CreateNoWindow = true;

                using (Process process = Process.Start(startInfo))
                {
                    process.WaitForExit();
                }
            }
            catch
            {
                // Ignore errors when killing processes
            }
        }
    }
} 
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class WinLauncher {
    [StructLayout(LayoutKind.Sequential)]
    public struct STARTUPINFO {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern bool SetEnvironmentVariable(string lpName, string lpValue);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern bool CreateProcess(
        string lpApplicationName,
        string lpCommandLine,
        IntPtr lpProcessAttributes,
        IntPtr lpThreadAttributes,
        bool bInheritHandles,
        uint dwCreationFlags,
        IntPtr lpEnvironment,
        string lpCurrentDirectory,
        ref STARTUPINFO lpStartupInfo,
        out PROCESS_INFORMATION lpProcessInformation
    );

    public static int Launch(string appPath, string cmdLine, string workDir, string desktop) {
        SetEnvironmentVariable("ELECTRON_RUN_AS_NODE", null);
        Environment.SetEnvironmentVariable("ELECTRON_RUN_AS_NODE", null);

        STARTUPINFO si = new STARTUPINFO();
        si.cb = Marshal.SizeOf(si);
        si.lpDesktop = desktop;
        PROCESS_INFORMATION pi = new PROCESS_INFORMATION();

        bool success = CreateProcess(
            appPath,
            cmdLine,
            IntPtr.Zero,
            IntPtr.Zero,
            false,
            0,
            IntPtr.Zero,
            workDir,
            ref si,
            out pi
        );

        if (!success) {
            return -Marshal.GetLastWin32Error();
        }
        return pi.dwProcessId;
    }
}
"@

$baseDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$electronExe = Join-Path $baseDir "node_modules\electron\dist\electron.exe"
$mainCjs = Join-Path $baseDir "dist-electron\main.cjs"

# Usamos cmd /c para garantir que a variável ELECTRON_RUN_AS_NODE seja eliminada do ambiente filho
$cmdExe = "$env:SystemRoot\System32\cmd.exe"
$cmdLine = "`"$cmdExe`" /c `"set ELECTRON_RUN_AS_NODE=& set ELECTRON_ENABLE_LOGGING=1& `"$electronExe`" `"$mainCjs`"`""

Write-Host "Iniciando janela do Workspace Fiscal em WinSta0\Default..."
$pidOut = [WinLauncher]::Launch($cmdExe, $cmdLine, $baseDir, "WinSta0\Default")

if ($pidOut -gt 0) {
    Write-Host "Processo iniciado no desktop interativo com sucesso! PID: $pidOut"
} else {
    Write-Host "Falha ao iniciar. Codigo de erro: $pidOut"
}

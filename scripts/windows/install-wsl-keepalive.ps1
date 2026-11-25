param(
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Status,
    [switch]$ForceWslConfig,
    [string]$Distro = "Ubuntu",
    [string]$TaskName = "AIM-WSL-Keepalive"
)

$ErrorActionPreference = "Stop"

$WslConfigPath = Join-Path $env:USERPROFILE ".wslconfig"
$StateDir = Join-Path $env:LOCALAPPDATA "AIM-Connect"
$VbsPath = Join-Path $StateDir "wsl-keepalive.vbs"

function Set-WslIdleTimeout {
    param([string]$Path, [bool]$Force)
    if (-not (Test-Path $Path)) {
        Set-Content -Path $Path -Value "[wsl2]`r`nvmIdleTimeout=-1`r`n" -Encoding UTF8
        Write-Host "[wsl-keepalive] Created $Path with vmIdleTimeout=-1"
        return
    }

    $Raw = Get-Content -Path $Path -Raw
    if ($Raw -match '(?im)^\s*vmIdleTimeout\s*=\s*-1\b') {
        Write-Host "[wsl-keepalive] vmIdleTimeout=-1 already present in $Path"
        return
    }

    Copy-Item -Path $Path -Destination "$Path.bak" -Force
    if ($Raw -match '(?im)^\s*\[wsl2\]\s*$') {
        if ($Force -and ($Raw -match '(?im)^\s*vmIdleTimeout\s*=')) {
            $Updated = [regex]::Replace($Raw, '(?im)^\s*vmIdleTimeout\s*=.*$', 'vmIdleTimeout=-1')
        } else {
            $Updated = [regex]::Replace($Raw, '(?im)(^\s*\[wsl2\]\s*$)', "`$1`r`nvmIdleTimeout=-1", 1)
        }
    } else {
        $Trimmed = $Raw.TrimEnd()
        $Updated = "$Trimmed`r`n`r`n[wsl2]`r`nvmIdleTimeout=-1`r`n"
    }
    Set-Content -Path $Path -Value $Updated -Encoding UTF8
    Write-Host "[wsl-keepalive] Updated $Path with vmIdleTimeout=-1 (backup at $Path.bak)"
}

if ($Uninstall) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    if (Test-Path $VbsPath) {
        Remove-Item -Path $VbsPath -Force
    }
    Write-Host "[wsl-keepalive] Removed Scheduled Task '$TaskName' and launcher script."
    exit 0
}

if ($Install) {
    Set-WslIdleTimeout -Path $WslConfigPath -Force $ForceWslConfig

    New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
    $SafeDistro = $Distro -replace '[^a-zA-Z0-9_.-]', ''
    $VbsContent = @"
' Headless zero-window WSL2 keepalive handle for AIM-Connect (#299)
Set sh = CreateObject("WScript.Shell")
sh.Run "wsl.exe -d $SafeDistro --exec sh -c ""pgrep -f 'aim_wsl_keepalive_sleep' >/dev/null 2>&1 || exec -a aim_wsl_keepalive_sleep sleep infinity""", 0, False
"@
    Set-Content -Path $VbsPath -Value $VbsContent -Encoding ASCII

    $Action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "//B //NoLogo `"$VbsPath`""
    $Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $Settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -ExecutionTimeLimit ([TimeSpan]::Zero) `
        -MultipleInstances IgnoreNew

    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force | Out-Null
    Start-Process -FilePath "wscript.exe" -ArgumentList "//B //NoLogo `"$VbsPath`"" -WindowStyle Hidden
    Write-Host "[wsl-keepalive] Installed & started zero-window keepalive task '$TaskName' for distro '$SafeDistro'."
    Write-Host "[wsl-keepalive] NOTE: Active WSL sessions were NOT restarted. vmIdleTimeout=-1 takes full effect on your next host reboot."
    exit 0
}

# Default: Status check
$HasTimeout = (Test-Path $WslConfigPath) -and ((Get-Content -Path $WslConfigPath -Raw) -match '(?im)^\s*vmIdleTimeout\s*=\s*-1\b')
$Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Write-Host ("[wsl-keepalive] .wslconfig vmIdleTimeout=-1 : " + ($(if ($HasTimeout) { "PRESENT" } else { "MISSING" })))
Write-Host ("[wsl-keepalive] Scheduled Task '$TaskName' : " + ($(if ($Task) { $Task.State } else { "NOT INSTALLED" })))

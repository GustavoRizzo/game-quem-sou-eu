# Forwards a Windows port to the WSL2 VM so phones on the LAN can reach
# the dev server. Run in an elevated (Administrator) PowerShell.
# Re-run after a Windows/WSL reboot: the WSL IP changes between boots.

$ErrorActionPreference = 'Stop'
$port = 8443

$wslIp = (wsl hostname -I).Trim().Split(' ')[0]
if (-not $wslIp) {
  Write-Error 'Could not resolve the WSL IP address. Is WSL running?'
}

Write-Host "Forwarding 0.0.0.0:$port -> ${wslIp}:$port"

netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 2>$null
netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIp

$ruleName = "quem-sou-eu dev server ($port)"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow | Out-Null
  Write-Host "Firewall rule created: $ruleName"
}

$lanIp = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -like '192.168.0.*' } |
  Select-Object -First 1).IPAddress

Write-Host ''
Write-Host 'Done. On the phone (same Wi-Fi network), open:'
Write-Host "  https://${lanIp}:$port"

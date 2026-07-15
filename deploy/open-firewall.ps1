param(
  [int]$Port = 8080,
  [string]$RuleName = "VikingCloud Agentic QE Platform"
)

$existing = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Firewall rule already exists: $RuleName"
} else {
  New-NetFirewallRule -DisplayName $RuleName -Direction Inbound -Action Allow `
    -Protocol TCP -LocalPort $Port -Profile Domain,Private | Out-Null
  Write-Host "Created firewall rule: TCP $Port inbound (Domain, Private)" -ForegroundColor Green
}

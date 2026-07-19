[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern("^\d+\.\d+\.\d+([.-][0-9A-Za-z.-]+)?$")]
  [string]$Version,

  [ValidateSet("windows", "all")]
  [string]$Scope = "windows",

  [switch]$DryRun
)

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$gh = Get-Command gh -ErrorAction SilentlyContinue

if ((git -C $repo status --porcelain).Length -ne 0) {
  throw "Commit local changes before dispatching a release."
}

$branch = (git -C $repo branch --show-current).Trim()
if ($branch -ne "main") {
  throw "CLI releases must be dispatched from main, not $branch."
}

$local = (git -C $repo rev-parse HEAD).Trim()
$remote = ((git -C $repo ls-remote origin refs/heads/main) -split "\s+")[0]
if ($local -ne $remote) {
  throw "Push main before dispatching a release."
}

$arguments = @(
  "workflow", "run", "release-cli.yml",
  "--repo", "Wade-DevCode/axon",
  "--ref", "main",
  "-f", "version=$Version",
  "-f", "scope=$Scope"
)

if ($DryRun) {
  Write-Host "gh $($arguments -join ' ')"
  exit 0
}

if (-not $gh) {
  throw "GitHub CLI is required. Install gh and run gh auth login."
}

& $gh.Source @arguments
if ($LASTEXITCODE -ne 0) {
  throw "Failed to dispatch the GitHub Actions release workflow."
}

Write-Host "Dispatched Axon $Version ($Scope)."
Write-Host "Monitor with: gh run watch --repo Wade-DevCode/axon"

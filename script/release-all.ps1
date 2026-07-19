[CmdletBinding()]
param(
  [ValidateSet("patch", "minor", "major")]
  [string]$Bump = "patch",
  [string]$Distro = "Ubuntu",
  [switch]$DryRun
)

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$wsl = Get-Command wsl.exe -ErrorAction SilentlyContinue

if (-not $wsl) {
  throw "WSL is required for an all-platform release. Install Ubuntu with: wsl --install -d Ubuntu"
}

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  throw "Bun is required on Windows. Install Bun, then run this command again."
}

if ($DryRun) {
  Write-Host "Would build all Axon CLI targets in WSL distro '$Distro' and publish npm version bump '$Bump'."
  Write-Host "Repository: $repo"
  exit 0
}

npm whoami | Out-Null

if ((git -C $repo status --porcelain).Length -ne 0) {
  throw "Commit or stash local changes before releasing."
}

$source = (& $wsl.Source -d $Distro -- wslpath -a $repo).Trim()
$dist = "$source/packages/axon/dist"
$build = "/tmp/axon-release-$([guid]::NewGuid().ToString('N'))"
$script = "$source/script/release-all.sh"

& $wsl.Source -d $Distro -- bash -lc "set -e; git clone --local --no-hardlinks '$source' '$build'; cd '$build'; bash '$script' --build-only '$dist' --bump '$Bump'; rm -rf '$build'"
if ($LASTEXITCODE -ne 0) {
  throw "WSL build failed. No npm package was published."
}

$env:AXON_CHANNEL = "latest"
$env:AXON_BUMP = $Bump
Push-Location (Join-Path $repo "packages/axon")
try {
  bun run script/publish.ts
} finally {
  Pop-Location
}

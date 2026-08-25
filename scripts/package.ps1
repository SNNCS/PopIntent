$ErrorActionPreference = 'Stop'

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$distDir = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'dist'))
$releaseDir = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'release'))

if ((Split-Path -Parent $distDir) -ne $projectRoot -or (Split-Path -Leaf $distDir) -ne 'dist') {
  throw "Refusing to package unexpected distribution path: $distDir"
}
if ((Split-Path -Parent $releaseDir) -ne $projectRoot -or (Split-Path -Leaf $releaseDir) -ne 'release') {
  throw "Refusing to write unexpected release path: $releaseDir"
}
if (-not (Test-Path -LiteralPath (Join-Path $distDir 'manifest.json') -PathType Leaf)) {
  throw "Built manifest not found. Run pnpm build first."
}

$package = Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
$zipPath = Join-Path $releaseDir "popintent-$($package.version).zip"
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $distDir '*') -DestinationPath $zipPath -CompressionLevel Optimal
Write-Output "Created $zipPath"

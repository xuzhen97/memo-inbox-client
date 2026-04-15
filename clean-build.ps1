[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$VerboseOutput
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSCommandPath
if ([string]::IsNullOrWhiteSpace($projectRoot)) {
    $projectRoot = (Get-Location).Path
}

$projectRoot = [System.IO.Path]::GetFullPath($projectRoot)
$projectRootPrefix = if ($projectRoot.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $projectRoot
} else {
    $projectRoot + [System.IO.Path]::DirectorySeparatorChar
}

$targets = @(
    "apps/desktop/dist",
    "apps/desktop/src-tauri/target",
    "apps/mobile/dist",
    "apps/mobile/android/build",
    "apps/mobile/android/app/build",
    "apps/mobile/android/.gradle"
)

$resolvedTargets = foreach ($relativePath in $targets) {
    $absolutePath = [System.IO.Path]::GetFullPath((Join-Path -Path $projectRoot -ChildPath $relativePath))
    if (-not $absolutePath.StartsWith($projectRootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to operate outside project root: $absolutePath"
    }

    [PSCustomObject]@{
        RelativePath = $relativePath
        AbsolutePath = $absolutePath
    }
}

$removedCount = 0
$missingCount = 0
$failedCount = 0

Write-Host "Project root: $projectRoot"
Write-Host "Dry run: $DryRun"

foreach ($target in $resolvedTargets) {
    $path = $target.AbsolutePath
    $label = $target.RelativePath

    if (-not (Test-Path -LiteralPath $path)) {
        Write-Host "[Skip] Missing: $label"
        $missingCount++
        continue
    }

    if ($DryRun) {
        Write-Host "[DryRun] Will remove: $label"
        $removedCount++
        continue
    }

    try {
        Remove-Item -LiteralPath $path -Recurse -Force
        Write-Host "[Removed] $label"
        $removedCount++
    } catch {
        Write-Host "[Failed] $label"
        Write-Host "         $($_.Exception.Message)"
        $failedCount++
    }
}

if ($VerboseOutput) {
    Write-Host ""
    Write-Host "Resolved targets:"
    $resolvedTargets | ForEach-Object { Write-Host "- $($_.AbsolutePath)" }
}

Write-Host ""
Write-Host "Summary:"
Write-Host "- Removed (or planned in DryRun): $removedCount"
Write-Host "- Missing: $missingCount"
Write-Host "- Failed: $failedCount"

if ($failedCount -gt 0) {
    exit 1
}

exit 0

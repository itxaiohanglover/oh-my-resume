param(
  [switch]$PersistUserEnv,
  [switch]$VerifyPdf
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PackageRoot = Split-Path -Parent $ScriptDir
$PathSeparator = [IO.Path]::PathSeparator

function Write-Info($Message) {
  Write-Host "[oh-my-resume] $Message"
}

function Split-PathList($Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return @() }
  return $Value.Split($PathSeparator) | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}

function Get-UniquePathList($Items) {
  $seen = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
  $result = New-Object 'System.Collections.Generic.List[string]'
  foreach ($item in $Items) {
    if ([string]::IsNullOrWhiteSpace($item)) { continue }
    if ($seen.Add($item)) { [void]$result.Add($item) }
  }
  return @($result.ToArray())
}

function Get-RegistryPathEntries {
  $entries = @()
  foreach ($scope in @('User', 'Machine')) {
    $value = [Environment]::GetEnvironmentVariable('Path', $scope)
    $entries += Split-PathList $value
  }
  return $entries
}

function Get-ExistingCandidatePaths {
  $texLiveYears = 2020..2028 | ForEach-Object { $_.ToString() }
  $candidates = @(
    "$env:ProgramFiles\MiKTeX\miktex\bin\x64",
    "${env:ProgramFiles(x86)}\MiKTeX\miktex\bin\x64",
    "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64",
    "$env:LOCALAPPDATA\MiKTeX\miktex\bin\x64",
    "D:\MiKTeX\miktex\bin\x64",
    "E:\MiKTeX\miktex\bin\x64",
    "F:\MiKTeX\miktex\bin\x64",
    ($texLiveYears | ForEach-Object { "C:\texlive\$_\bin\windows" }),
    ($texLiveYears | ForEach-Object { "D:\texlive\$_\bin\windows" }),
    ($texLiveYears | ForEach-Object { "E:\texlive\$_\bin\windows" }),
    "C:\Strawberry\c\bin",
    "C:\Strawberry\perl\site\bin",
    "C:\Strawberry\perl\bin"
  )
  return $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
}

function Add-CurrentProcessPath($Entries) {
  $current = Split-PathList $env:Path
  $next = Get-UniquePathList (@($Entries) + @($current))
  $env:Path = $next -join $PathSeparator
}

function Set-UserOmrTexPath($Entries) {
  $existing = Split-PathList ([Environment]::GetEnvironmentVariable('OMR_TEX_PATH', 'User'))
  $next = Get-UniquePathList (@($Entries) + @($existing))
  [Environment]::SetEnvironmentVariable('OMR_TEX_PATH', ($next -join $PathSeparator), 'User')
  Write-Info "Saved OMR_TEX_PATH for future terminals. Reopen terminals if a running shell still cannot see TeX."
}

function Test-Tool($Name, $Args) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) {
    return [pscustomobject]@{ Name = $Name; Ok = $false; Path = ''; Detail = 'not found' }
  }

  $previousPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $output = & $command.Source @Args 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousPreference
  }
  $outputText = ($output | ForEach-Object { $_.ToString() }) -join ' '
  $versionLooksValid = switch ($Name) {
    'node' { $outputText -match 'v\d+\.\d+\.\d+' }
    'xelatex' { $outputText -match 'XeTeX|MiKTeX-XeTeX' }
    'perl' { $outputText -match 'This is perl|v\d+\.\d+' }
    'latexmk' { $outputText -match 'Latexmk' }
    default { $false }
  }
  $ok = ($exitCode -eq 0) -or $versionLooksValid
  $detail = ($outputText -replace '\s+', ' ').Trim()
  if ($detail.Length -gt 220) { $detail = $detail.Substring(0, 220) + '...' }
  return [pscustomobject]@{ Name = $Name; Ok = $ok; Path = $command.Source; Detail = $detail }
}

function Print-Result($Result) {
  if ($Result.Ok) {
    Write-Host ("OK      {0} -> {1}" -f $Result.Name, $Result.Path)
  } else {
    Write-Host ("MISSING {0} ({1})" -f $Result.Name, $Result.Detail) -ForegroundColor Yellow
  }
}

Set-Location $PackageRoot
Write-Info "Preparing Windows environment in $PackageRoot"

$pathEntries = Get-UniquePathList (@(Get-RegistryPathEntries) + @(Get-ExistingCandidatePaths))
Add-CurrentProcessPath $pathEntries

if ($PersistUserEnv -and $pathEntries.Count -gt 0) {
  Set-UserOmrTexPath $pathEntries
}

$node = Test-Tool 'node' @('--version')
$xelatex = Test-Tool 'xelatex' @('--version')
$perl = Test-Tool 'perl' @('-v')
$latexmk = Test-Tool 'latexmk' @('--version')

Print-Result $node
Print-Result $xelatex
Print-Result $perl
Print-Result $latexmk

if (-not $node.Ok) {
  Write-Host ''
  Write-Host 'Install Node.js 18+ first: https://nodejs.org/' -ForegroundColor Yellow
}
if (-not $xelatex.Ok) {
  Write-Host ''
  Write-Host 'Install MiKTeX Basic (https://miktex.org/download) or TeX Live (https://tug.org/texlive/).' -ForegroundColor Yellow
}
if (-not $perl.Ok) {
  Write-Host ''
  Write-Host 'Install Strawberry Perl if your TeX distribution needs it for latexmk: https://strawberryperl.com/' -ForegroundColor Yellow
}
if (-not $latexmk.Ok) {
  Write-Host ''
  Write-Host 'Install latexmk through MiKTeX Console or TeX Live, then reopen the terminal if needed.' -ForegroundColor Yellow
}

Write-Host ''
Write-Info 'Running oh-my-resume doctor...'
node scripts\cli.js doctor
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

if ($VerifyPdf) {
  Write-Host ''
  Write-Info 'Rendering bundled example PDF as an end-to-end check...'
  $verifyPdfPath = Join-Path $PackageRoot 'build\install-check.pdf'
  node scripts\cli.js pdf examples\resume.md --pdf $verifyPdfPath
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
  Write-Info "Generated $verifyPdfPath"
}

Write-Host ''
Write-Info 'Windows environment is ready for Oh My Resume.'

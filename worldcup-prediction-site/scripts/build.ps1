$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue

if ($nodeCommand) {
  & $nodeCommand.Source (Join-Path $projectRoot "scripts\build.mjs")
} elseif (Test-Path $bundledNode) {
  & $bundledNode (Join-Path $projectRoot "scripts\build.mjs")
} else {
  throw "Node.js was not found. Install Node.js or run this inside Codex with the bundled runtime available."
}

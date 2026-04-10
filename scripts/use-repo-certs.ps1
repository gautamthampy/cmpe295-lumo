$repoRoot = Split-Path -Parent $PSScriptRoot
$certRoot = Join-Path $repoRoot "certs"

$mergedBundle = Join-Path $certRoot "merged-ca-bundle.pem"
$npmBundle = Join-Path $certRoot "shared-pki-npm-bundle.pem"

if (-not (Test-Path $mergedBundle)) {
    throw "Merged CA bundle not found at $mergedBundle"
}

if (-not (Test-Path $npmBundle)) {
    throw "npm CA bundle not found at $npmBundle"
}

$env:NODE_EXTRA_CA_CERTS = $mergedBundle
$env:npm_config_cafile = $npmBundle
$env:SSL_CERT_FILE = $mergedBundle
$env:REQUESTS_CA_BUNDLE = $mergedBundle

Write-Output "Configured repo-local certificate bundles for the current PowerShell session."
Write-Output "NODE_EXTRA_CA_CERTS=$env:NODE_EXTRA_CA_CERTS"
Write-Output "npm_config_cafile=$env:npm_config_cafile"
Write-Output "SSL_CERT_FILE=$env:SSL_CERT_FILE"
Write-Output "REQUESTS_CA_BUNDLE=$env:REQUESTS_CA_BUNDLE"
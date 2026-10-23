param([switch]$Lan)
$ErrorActionPreference = 'Stop'
$taskNode = Get-Command node -ErrorAction SilentlyContinue
if (-not $taskNode) { throw '需要 Node.js 22 或更新版本。云服务器已有 Node，本机请安装后重试。' }
$env:HOST = if ($Lan) { '0.0.0.0' } else { '127.0.0.1' }
$env:PORT = '18745'
& $taskNode.Source (Join-Path $PSScriptRoot 'server.cjs')

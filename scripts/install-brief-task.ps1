# 注册「每日生成 AI 简报」的 Windows 任务计划
#
# 用法（在项目根目录运行 PowerShell）：
#   pwsh -File scripts/install-brief-task.ps1            # 每天 08:00 生成
#   pwsh -File scripts/install-brief-task.ps1 -Time 09:30
#   pwsh -File scripts/install-brief-task.ps1 -Uninstall
#
# 前提：站点已在 http://127.0.0.1:4310 运行（npm run dev 或 npm start）。
# 任务只执行 scripts/brief-cron.mjs，由它去请求站点接口。

param(
  [string]$Time = "08:00",
  [string]$TaskName = "BlockSet 每日简报",
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

if ($Uninstall) {
  schtasks /Delete /TN $TaskName /F | Out-Null
  Write-Host "已删除任务计划：$TaskName"
  exit 0
}

$node = (Get-Command node -ErrorAction Stop).Source
$script = Join-Path $PSScriptRoot "brief-cron.mjs"
if (-not (Test-Path -LiteralPath $script)) {
  throw "找不到 $script，请在项目根目录运行本脚本。"
}

$action = "`"$node`" `"$script`""
schtasks /Create /TN $TaskName /SC DAILY /ST $Time /TR $action /F | Out-Null
Write-Host "已注册任务计划：$TaskName（每天 $Time 执行）"
Write-Host "命令：$action"
Write-Host "手动试跑：npm run brief:gen"

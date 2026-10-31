param(
    [Parameter(Mandatory=$true)]
    [string]$msg
)

git add .
git commit -m $msg
git push

Write-Host "`nDeploy iniciado! Acompanhe em: https://vercel.com/dashboard" -ForegroundColor Green

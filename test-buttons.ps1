$headers = @{
    "Content-Type" = "application/json"
    "token" = "0a5d59d3-f368-419b-b9e8-701375814522"
}

$bodyObj = @{
    number = "5521981279047"
    type = "button"
    text = "TESTE DE BOTOES - Se voce ver botoes abaixo, funcionou!"
    choices = @(
        "Funcionou|teste_ok",
        "Nao funcionou|teste_erro"
    )
    footerText = "Teste Windsurf"
}

$body = $bodyObj | ConvertTo-Json

Write-Host "Enviando teste de botoes..."

try {
    $response = Invoke-RestMethod -Uri "https://lamusic.uazapi.com/send/menu" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "SUCESSO! Verifique seu WhatsApp" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

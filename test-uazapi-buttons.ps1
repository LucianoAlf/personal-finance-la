# TESTE DIRETO UAZAPI - BOTÕES INTERATIVOS
# ===========================================

$headers = @{
    "Content-Type" = "application/json"
    "token" = "0a5d59d3-f368-419b-b9e8-701375814522"
}

$bodyObj = @{
    number = "5521981279047"
    type = "button"
    text = "TESTE DE BOTOES INTERATIVOS - Se voce ver 2 botoes abaixo, funcionou! Este eh um teste da API UAZAPI"
    choices = @(
        "Funcionou|teste_ok",
        "Nao funcionou|teste_erro"
    )
    footerText = "Teste Windsurf - Personal Finance"
}

$body = $bodyObj | ConvertTo-Json

Write-Host ""
Write-Host "🧪 TESTE DIRETO UAZAPI - BOTÕES" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Número: 5521981279047" -ForegroundColor Yellow
Write-Host "🌐 Endpoint: https://free.uazapi.com/send/menu" -ForegroundColor Yellow
Write-Host ""
Write-Host "📦 Payload:" -ForegroundColor Gray
Write-Host $body -ForegroundColor Gray
Write-Host ""

try {
    Write-Host "⏳ Enviando requisição..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod `
        -Uri "https://free.uazapi.com/send/menu" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✅ SUCESSO!" -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Resposta:" -ForegroundColor Gray
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Verifique seu WhatsApp agora!" -ForegroundColor Green
    Write-Host "   Você deve ver uma mensagem com 2 botões clicáveis" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ ERRO!" -ForegroundColor Red
    Write-Host "=================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Mensagem: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Para ver logs no Supabase Dashboard" -ForegroundColor Yellow
Write-Host ""

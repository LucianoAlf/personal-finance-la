$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibnBtaG12Y3Nwd2N5amhmdGx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE4ODY1OCwiZXhwIjoyMDc3NzY0NjU4fQ.Fnga17OcuHFzXB75CIZ23abk_8wgCPB58qTwqCS0YXo"
    "Content-Type" = "application/json"
}

$body = @{
    data = @{
        from = "5521981278047@s.whatsapp.net"
        message = @{
            type = "text"
            text = "Gastei 85 reais no almoco japones"
        }
    }
    event = "message"
} | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "TESTE NLP TRANSACTION - KEYWORD DETECTION" -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "Enviando: 'Gastei 85 reais no almoco japones'" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/process-whatsapp-message" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    
    Write-Host "SUCESSO!" -ForegroundColor Green
    Write-Host "-----------------------------------" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resposta:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    if ($response.command -eq "nlp_transaction") {
        Write-Host "VALIDACAO OK: command = 'nlp_transaction'" -ForegroundColor Green
    } else {
        Write-Host "VALIDACAO FALHOU: command = '$($response.command)' (esperado: 'nlp_transaction')" -ForegroundColor Red
    }
    
} catch {
    Write-Host ""
    Write-Host "ERRO!" -ForegroundColor Red
    Write-Host "-----------------------------------" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code:" $_.Exception.Response.StatusCode.value__ -ForegroundColor Red
    Write-Host "Mensagem:" $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Detalhes:" -ForegroundColor Red
        Write-Host $errorBody -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "-----------------------------------" -ForegroundColor Cyan
Write-Host "Para ver logs detalhados, acesse:" -ForegroundColor Yellow
Write-Host "https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw/functions/process-whatsapp-message/logs" -ForegroundColor Blue
Write-Host "-----------------------------------" -ForegroundColor Cyan
Write-Host ""

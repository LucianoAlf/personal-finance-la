$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibnBtaG12Y3Nwd2N5amhmdGx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE4ODY1OCwiZXhwIjoyMDc3NzY0NjU4fQ.Fnga17OcuHFzXB75CIZ23abk_8wgCPB58qTwqCS0YXo"
    "Content-Type" = "application/json"
}

$body = @{
    user_id = "68dc8ee5-a710-4116-8f18-af9ac3e8ed36"
    data = @{
        raw_text = "Gastei 85 reais no almoco japones"
    }
} | ConvertTo-Json

Write-Host ""
Write-Host "TESTE CATEGORIZE-TRANSACTION" -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "Enviando requisicao..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/categorize-transaction" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    
    Write-Host ""
    Write-Host "SUCESSO!" -ForegroundColor Green
    Write-Host "-----------------------------------" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resposta:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    
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
Write-Host "https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw/functions/categorize-transaction/logs" -ForegroundColor Blue
Write-Host "-----------------------------------" -ForegroundColor Cyan
Write-Host ""

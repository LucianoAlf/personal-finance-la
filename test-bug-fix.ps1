$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibnBtaG12Y3Nwd2N5amhmdGx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE4ODY1OCwiZXhwIjoyMDc3NzY0NjU4fQ.Fnga17OcuHFzXB75CIZ23abk_8wgCPB58qTwqCS0YXo"
    "Content-Type" = "application/json"
}

$testCases = @(
    @{ text = "Recebi 1000 reais de salário"; expectedCategory = "salary" },
    @{ text = "Gastei 85 reais no almoço"; expectedCategory = "food" },
    @{ text = "Paguei 250 no supermercado"; expectedCategory = "food" },
    @{ text = "Gastei 50 com uber"; expectedCategory = "transport" },
    @{ text = "Comprei um remédio por 30"; expectedCategory = "health" }
)

Write-Host ""
Write-Host "TESTE BUG FIX - UNDEFINED CATEGORY" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

foreach ($testCase in $testCases) {
    $body = @{
        user_id = "68dc8ee5-a710-4116-8f18-af9ac3e8ed36"
        data = @{
            raw_text = $testCase.text
        }
    } | ConvertTo-Json
    
    Write-Host "Testando: '$($testCase.text)'" -ForegroundColor Yellow
    Write-Host "Esperado categoria: $($testCase.expectedCategory)" -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri "https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/categorize-transaction" -Method Post -Headers $headers -Body $body -ErrorAction Stop
        
        # Verificar se tem "undefined" na mensagem
        if ($response.message -like "*undefined*") {
            Write-Host "❌ FALHA: Ainda contém 'undefined'" -ForegroundColor Red
            Write-Host "Message: $($response.message)" -ForegroundColor Red
        } else {
            Write-Host "✅ SUCESSO: Sem 'undefined' na mensagem" -ForegroundColor Green
            Write-Host "Message: $($response.message -replace "`n", " | ")" -ForegroundColor Green
        }
        
        # Verificar categoria nos dados
        if ($response.data.category -eq "undefined") {
            Write-Host "❌ FALHA: Category data é 'undefined'" -ForegroundColor Red
        } else {
            Write-Host "✅ SUCESSO: Category = '$($response.data.category)'" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "---" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "Para ver logs detalhados, acesse:" -ForegroundColor Yellow
Write-Host "https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw/functions/categorize-transaction/logs" -ForegroundColor Blue
Write-Host ""

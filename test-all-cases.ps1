# ============================================
# 🧪 SCRIPT DE TESTE - LLM INTENT PARSER
# Testa todos os casos de uso
# ============================================

$baseUrl = "https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/llm-intent-parser"

# Contexto base para todos os testes
$baseContext = @{
    transaction = @{
        id = "test-123"
        amount = 100.00
        description = "Compra no mercado"
        category = "Outros"
        category_id = "cat-123"
        transaction_date = "2025-11-15T00:00:00Z"
        type = "expense"
    }
    available_categories = @(
        @{ id = "cat-1"; name = "Alimentação"; type = "expense" }
        @{ id = "cat-2"; name = "Transporte"; type = "expense" }
        @{ id = "cat-3"; name = "Moradia"; type = "expense" }
        @{ id = "cat-4"; name = "Saúde"; type = "expense" }
        @{ id = "cat-5"; name = "Lazer"; type = "expense" }
        @{ id = "cat-6"; name = "Educação"; type = "expense" }
        @{ id = "cat-7"; name = "Outros"; type = "expense" }
        @{ id = "cat-8"; name = "Salário"; type = "income" }
    )
}

# Casos de teste
$testCases = @(
    @{
        name = "Caso 1: Valor Simples";
        message = "150";
        expected = @("edit_value")
    };
    @{
        name = "Caso 2: Multiplas Intencoes";
        message = "muda pra 150 e categoria alimentacao";
        expected = @("edit_value", "edit_category")
    };
    @{
        name = "Caso 3: Descricao + Data";
        message = "Uber Black ontem";
        expected = @("edit_description", "edit_date")
    };
    @{
        name = "Caso 4: Categoria Sozinha";
        message = "transporte";
        expected = @("edit_category")
    };
    @{
        name = "Caso 5: Data Formatada";
        message = "15/11";
        expected = @("edit_date")
    };
    @{
        name = "Caso 6: Confirmacao";
        message = "pronto";
        expected = @("confirm")
    };
    @{
        name = "Caso 7: Cancelamento";
        message = "cancelar";
        expected = @("cancel")
    };
    @{
        name = "Caso 8: Complexo 3 intencoes";
        message = "muda pra 250, categoria transporte e data 16/11";
        expected = @("edit_value", "edit_category", "edit_date")
    };
    @{
        name = "Caso 9: Valor com RS";
        message = "R$ 75,50";
        expected = @("edit_value")
    };
    @{
        name = "Caso 10: Descricao Longa";
        message = "Supermercado Atacadao - Compras do mes";
        expected = @("edit_description")
    }
)

Write-Host "🧪 INICIANDO TESTES - LLM INTENT PARSER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0
$results = @()

foreach ($test in $testCases) {
    Write-Host "📝 $($test.name)" -ForegroundColor Yellow
    Write-Host "   Input: '$($test.message)'" -ForegroundColor Gray
    
    # Montar payload
    $payload = @{
        message = $test.message
        context = $baseContext
    } | ConvertTo-Json -Depth 10
    
    try {
        # Fazer requisição
        $response = Invoke-RestMethod -Uri $baseUrl -Method Post -Body $payload -ContentType "application/json"
        
        # Extrair ações detectadas
        $detectedActions = $response.intents | ForEach-Object { $_.action }
        
        # Verificar se todas as ações esperadas foram detectadas
        $allFound = $true
        foreach ($expectedAction in $test.expected) {
            if ($detectedActions -notcontains $expectedAction) {
                $allFound = $false
                break
            }
        }
        
        # Verificar confiança mínima
        $minConfidence = ($response.intents | Measure-Object -Property confidence -Minimum).Minimum
        
        if ($allFound -and $minConfidence -ge 0.7) {
            Write-Host "   ✅ PASSOU" -ForegroundColor Green
            Write-Host "   Detectado: $($detectedActions -join ', ')" -ForegroundColor Gray
            Write-Host "   Confiança mínima: $([math]::Round($minConfidence * 100))%" -ForegroundColor Gray
            $passed++
            
            $results += @{
                test = $test.name
                status = "✅ PASSOU"
                detected = $detectedActions -join ', '
                confidence = [math]::Round($minConfidence * 100)
            }
        } else {
            Write-Host "   ❌ FALHOU" -ForegroundColor Red
            Write-Host "   Esperado: $($test.expected -join ', ')" -ForegroundColor Gray
            Write-Host "   Detectado: $($detectedActions -join ', ')" -ForegroundColor Gray
            Write-Host "   Confiança mínima: $([math]::Round($minConfidence * 100))%" -ForegroundColor Gray
            $failed++
            
            $results += @{
                test = $test.name
                status = "❌ FALHOU"
                expected = $test.expected -join ', '
                detected = $detectedActions -join ', '
                confidence = [math]::Round($minConfidence * 100)
            }
        }
        
    } catch {
        Write-Host "   ❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
        
        $results += @{
            test = $test.name
            status = "❌ ERRO"
            error = $_.Exception.Message
        }
    }
    
    Write-Host ""
    Start-Sleep -Milliseconds 500  # Evitar rate limit
}

# Resumo
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Passou: $passed/$($testCases.Count)" -ForegroundColor Green
Write-Host "❌ Falhou: $failed/$($testCases.Count)" -ForegroundColor Red
Write-Host ""

$accuracy = [math]::Round(($passed / $testCases.Count) * 100, 1)
Write-Host "🎯 Acurácia: $accuracy%" -ForegroundColor $(if ($accuracy -ge 90) { "Green" } elseif ($accuracy -ge 70) { "Yellow" } else { "Red" })
Write-Host ""

# Salvar resultados
$results | ConvertTo-Json -Depth 10 | Out-File "test-results.json"
Write-Host "💾 Resultados salvos em: test-results.json" -ForegroundColor Gray

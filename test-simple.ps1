# Teste simples do LLM Intent Parser
$url = "https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/llm-intent-parser"

Write-Host "Testando caso 1: Valor simples (150)" -ForegroundColor Cyan
$body1 = @"
{
  "message": "150",
  "context": {
    "transaction": {
      "id": "test-123",
      "amount": 100.00,
      "description": "Compra no mercado",
      "category": "Outros",
      "category_id": "cat-123",
      "transaction_date": "2025-11-15T00:00:00Z",
      "type": "expense"
    },
    "available_categories": [
      { "id": "cat-1", "name": "Alimentacao", "type": "expense" },
      { "id": "cat-2", "name": "Transporte", "type": "expense" }
    ]
  }
}
"@

$result1 = Invoke-RestMethod -Uri $url -Method Post -Body $body1 -ContentType "application/json"
Write-Host "Resultado:" -ForegroundColor Green
$result1.intents | ForEach-Object { Write-Host "  - $($_.action): $($_.value) ($([math]::Round($_.confidence * 100))%)" }
Write-Host ""

Write-Host "Testando caso 2: Multiplas intencoes" -ForegroundColor Cyan
$body2 = @"
{
  "message": "muda pra 150 e categoria alimentacao",
  "context": {
    "transaction": {
      "id": "test-123",
      "amount": 100.00,
      "description": "Compra no mercado",
      "category": "Outros",
      "category_id": "cat-123",
      "transaction_date": "2025-11-15T00:00:00Z",
      "type": "expense"
    },
    "available_categories": [
      { "id": "cat-1", "name": "Alimentacao", "type": "expense" },
      { "id": "cat-2", "name": "Transporte", "type": "expense" }
    ]
  }
}
"@

$result2 = Invoke-RestMethod -Uri $url -Method Post -Body $body2 -ContentType "application/json"
Write-Host "Resultado:" -ForegroundColor Green
$result2.intents | ForEach-Object { Write-Host "  - $($_.action): $($_.value) ($([math]::Round($_.confidence * 100))%)" }
Write-Host ""

Write-Host "Testando caso 3: Descricao + Data" -ForegroundColor Cyan
$body3 = @"
{
  "message": "Uber Black ontem",
  "context": {
    "transaction": {
      "id": "test-123",
      "amount": 100.00,
      "description": "Compra no mercado",
      "category": "Outros",
      "category_id": "cat-123",
      "transaction_date": "2025-11-15T00:00:00Z",
      "type": "expense"
    },
    "available_categories": [
      { "id": "cat-1", "name": "Alimentacao", "type": "expense" },
      { "id": "cat-2", "name": "Transporte", "type": "expense" }
    ]
  }
}
"@

$result3 = Invoke-RestMethod -Uri $url -Method Post -Body $body3 -ContentType "application/json"
Write-Host "Resultado:" -ForegroundColor Green
$result3.intents | ForEach-Object { Write-Host "  - $($_.action): $($_.value) ($([math]::Round($_.confidence * 100))%)" }
Write-Host ""

Write-Host "Todos os testes concluidos!" -ForegroundColor Green

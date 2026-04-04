# PRD: Centralização de Mapeamentos - Personal Finance LA

**Data:** 08/12/2025  
**Autor:** Alf + Claude (Análise Retroativa)  
**Prioridade:** 🔴 CRÍTICA  
**Versão Atual:** v203  

---

## 1. CONTEXTO DO PROBLEMA

### 1.1 O que aconteceu

Em uma sessão de debugging de 4+ horas, identificamos **9 bugs** no sistema de NLP do Personal Finance LA. A análise retroativa revelou que **a maioria dos bugs compartilha a mesma causa raiz**:

| Padrão | Bugs Relacionados | Descrição |
|--------|-------------------|-----------|
| **Mapeamentos Duplicados** | #7, #9 | Mesma lógica em 3+ arquivos, divergem quando um é atualizado |
| **Handlers Incompletos** | #3, #6, #8 | Handlers não usam todas as entidades disponíveis |
| **Conversões Lossy** | #6 | Dados perdidos durante conversão de objetos |

### 1.2 Impacto Atual

- **3 arquivos** com mapeamentos duplicados de categorias
- **2 arquivos** com mapeamentos duplicados de bancos
- Quando um é atualizado, os outros ficam desatualizados
- Bugs recorrentes e difíceis de debugar
- Tempo de desenvolvimento desperdiçado

### 1.3 Arquivos Afetados (Auditoria)

| Arquivo | Mapeamentos Duplicados | Linhas |
|---------|------------------------|--------|
| `context-manager.ts` | PALAVRAS_CATEGORIAS, bancos inline | 510-528, 1245 |
| `transaction-mapper.ts` | MAPEAMENTO_CATEGORIAS, NLP_PARA_CATEGORIA, MAPEAMENTO_BANCOS | 83-93, 96-250, 61-77 |
| `index.ts` | Possíveis duplicações | A verificar |

---

## 2. OBJETIVO

### 2.1 Objetivo Principal

**Criar um arquivo único** (`shared/mappings.ts`) que contenha TODOS os mapeamentos do sistema, e fazer todos os outros arquivos importarem deste arquivo.

### 2.2 Benefícios Esperados

| Antes | Depois |
|-------|--------|
| Adicionar palavra em 3 arquivos | Adicionar em 1 arquivo |
| Risco de divergência | Impossível divergir |
| Bugs de mapeamento recorrentes | Eliminados |
| Debug difícil | Debug centralizado |

---

## 3. ESPECIFICAÇÃO TÉCNICA

### 3.1 Arquivo a Criar

**Caminho:** `supabase/functions/shared/mappings.ts`

```typescript
/**
 * MAPEAMENTOS CENTRALIZADOS - Personal Finance LA
 * 
 * IMPORTANTE: Este é o ÚNICO local onde mapeamentos devem ser definidos.
 * Todos os outros arquivos DEVEM importar deste arquivo.
 * 
 * Última atualização: [DATA]
 * Versão: 1.0.0
 */

// ============================================
// 1. CATEGORIAS - Palavras-chave → Categoria
// ============================================

export const CATEGORIA_KEYWORDS: Record<string, string> = {
  // 🚗 Transporte
  'uber': 'Transporte',
  '99': 'Transporte',
  'taxi': 'Transporte',
  'gasolina': 'Transporte',
  'combustivel': 'Transporte',
  'combustível': 'Transporte',
  'estacionamento': 'Transporte',
  'pedagio': 'Transporte',
  'pedágio': 'Transporte',
  'abasteci': 'Transporte',
  'abastecimento': 'Transporte',
  'abastecer': 'Transporte',
  'posto': 'Transporte',
  'etanol': 'Transporte',
  'alcool': 'Transporte',
  'álcool': 'Transporte',
  'diesel': 'Transporte',
  'onibus': 'Transporte',
  'ônibus': 'Transporte',
  'metro': 'Transporte',
  'metrô': 'Transporte',
  'passagem': 'Transporte',
  'carro': 'Transporte',
  'moto': 'Transporte',
  'oficina': 'Transporte',
  'mecanico': 'Transporte',
  'mecânico': 'Transporte',
  'ipva': 'Transporte',
  'licenciamento': 'Transporte',
  'multa': 'Transporte',
  
  // 🍔 Alimentação
  'mercado': 'Alimentação',
  'supermercado': 'Alimentação',
  'ifood': 'Alimentação',
  'rappi': 'Alimentação',
  'restaurante': 'Alimentação',
  'lanche': 'Alimentação',
  'almoco': 'Alimentação',
  'almoço': 'Alimentação',
  'jantar': 'Alimentação',
  'cafe': 'Alimentação',
  'café': 'Alimentação',
  'padaria': 'Alimentação',
  'acougue': 'Alimentação',
  'açougue': 'Alimentação',
  'feira': 'Alimentação',
  'hortifruti': 'Alimentação',
  'delivery': 'Alimentação',
  'pizza': 'Alimentação',
  'hamburguer': 'Alimentação',
  'hambúrguer': 'Alimentação',
  'comida': 'Alimentação',
  'refeicao': 'Alimentação',
  'refeição': 'Alimentação',
  
  // 🏠 Moradia
  'aluguel': 'Moradia',
  'condominio': 'Moradia',
  'condomínio': 'Moradia',
  'luz': 'Moradia',
  'energia': 'Moradia',
  'agua': 'Moradia',
  'água': 'Moradia',
  'gas': 'Moradia',
  'gás': 'Moradia',
  'internet': 'Moradia',
  'wifi': 'Moradia',
  'iptu': 'Moradia',
  'seguro residencial': 'Moradia',
  'manutencao': 'Moradia',
  'manutenção': 'Moradia',
  'reforma': 'Moradia',
  'pintura': 'Moradia',
  'eletricista': 'Moradia',
  'encanador': 'Moradia',
  'faxina': 'Moradia',
  'diarista': 'Moradia',
  
  // 🏥 Saúde
  'farmacia': 'Saúde',
  'farmácia': 'Saúde',
  'remedio': 'Saúde',
  'remédio': 'Saúde',
  'medicamento': 'Saúde',
  'medico': 'Saúde',
  'médico': 'Saúde',
  'consulta': 'Saúde',
  'exame': 'Saúde',
  'hospital': 'Saúde',
  'clinica': 'Saúde',
  'clínica': 'Saúde',
  'dentista': 'Saúde',
  'psicólogo': 'Saúde',
  'psicologo': 'Saúde',
  'terapia': 'Saúde',
  'plano de saude': 'Saúde',
  'plano de saúde': 'Saúde',
  'academia': 'Saúde',
  'pilates': 'Saúde',
  'yoga': 'Saúde',
  'suplemento': 'Saúde',
  
  // 📚 Educação
  'escola': 'Educação',
  'faculdade': 'Educação',
  'universidade': 'Educação',
  'curso': 'Educação',
  'livro': 'Educação',
  'material escolar': 'Educação',
  'mensalidade': 'Educação',
  'matricula': 'Educação',
  'matrícula': 'Educação',
  'apostila': 'Educação',
  'udemy': 'Educação',
  'alura': 'Educação',
  
  // 🎬 Lazer
  'cinema': 'Lazer',
  'teatro': 'Lazer',
  'show': 'Lazer',
  'ingresso': 'Lazer',
  'netflix': 'Lazer',
  'spotify': 'Lazer',
  'amazon prime': 'Lazer',
  'disney': 'Lazer',
  'hbo': 'Lazer',
  'streaming': 'Lazer',
  'jogo': 'Lazer',
  'game': 'Lazer',
  'playstation': 'Lazer',
  'xbox': 'Lazer',
  'bar': 'Lazer',
  'balada': 'Lazer',
  'festa': 'Lazer',
  'churras': 'Lazer',
  'churrasco': 'Lazer',
  
  // 👕 Vestuário
  'roupa': 'Vestuário',
  'camisa': 'Vestuário',
  'calca': 'Vestuário',
  'calça': 'Vestuário',
  'sapato': 'Vestuário',
  'tenis': 'Vestuário',
  'tênis': 'Vestuário',
  'loja': 'Vestuário',
  'shopping': 'Vestuário',
  'renner': 'Vestuário',
  'riachuelo': 'Vestuário',
  'cea': 'Vestuário',
  'c&a': 'Vestuário',
  'zara': 'Vestuário',
  
  // 💄 Beleza
  'salao': 'Beleza',
  'salão': 'Beleza',
  'cabelo': 'Beleza',
  'corte': 'Beleza',
  'manicure': 'Beleza',
  'pedicure': 'Beleza',
  'estetica': 'Beleza',
  'estética': 'Beleza',
  'maquiagem': 'Beleza',
  'perfume': 'Beleza',
  'cosmetico': 'Beleza',
  'cosmético': 'Beleza',
  'barbearia': 'Beleza',
  
  // 🐕 Pets
  'pet': 'Pets',
  'veterinario': 'Pets',
  'veterinário': 'Pets',
  'racao': 'Pets',
  'ração': 'Pets',
  'petshop': 'Pets',
  'pet shop': 'Pets',
  'cachorro': 'Pets',
  'gato': 'Pets',
  'vacina pet': 'Pets',
  
  // 💻 Tecnologia
  'celular': 'Tecnologia',
  'smartphone': 'Tecnologia',
  'computador': 'Tecnologia',
  'notebook': 'Tecnologia',
  'tablet': 'Tecnologia',
  'fone': 'Tecnologia',
  'eletrônico': 'Tecnologia',
  'eletronico': 'Tecnologia',
  'apple': 'Tecnologia',
  'samsung': 'Tecnologia',
  'xiaomi': 'Tecnologia',
  
  // 📄 Assinaturas
  'assinatura': 'Assinaturas',
  'mensalidade': 'Assinaturas',
  'plano': 'Assinaturas',
  'premium': 'Assinaturas',
  'pro': 'Assinaturas',
  
  // ✈️ Viagens
  'viagem': 'Viagens',
  'passagem aerea': 'Viagens',
  'passagem aérea': 'Viagens',
  'hotel': 'Viagens',
  'airbnb': 'Viagens',
  'hospedagem': 'Viagens',
  'mala': 'Viagens',
  'aeroporto': 'Viagens',
  
  // 🏋️ Esportes
  'esporte': 'Esportes',
  'futebol': 'Esportes',
  'corrida': 'Esportes',
  'bicicleta': 'Esportes',
  'bike': 'Esportes',
  'natacao': 'Esportes',
  'natação': 'Esportes',
  
  // 📈 Investimentos
  'investimento': 'Investimentos',
  'acao': 'Investimentos',
  'ação': 'Investimentos',
  'fundo': 'Investimentos',
  'tesouro': 'Investimentos',
  'cdb': 'Investimentos',
  'corretora': 'Investimentos',
  'cripto': 'Investimentos',
  'bitcoin': 'Investimentos',
};

// ============================================
// 2. BANCOS - Aliases → Nome oficial
// ============================================

export interface BancoConfig {
  nome: string;
  aliases: string[];
  cor: string;
  emoji: string;
}

export const BANCO_CONFIGS: BancoConfig[] = [
  {
    nome: 'nubank',
    aliases: ['nubank', 'roxinho', 'roxo', 'nu', 'nubanck'],
    cor: '#8B5CF6',
    emoji: '💜'
  },
  {
    nome: 'itau',
    aliases: ['itau', 'itaú', 'laranjinha', 'itaú unibanco', 'itau unibanco'],
    cor: '#FF6600',
    emoji: '🧡'
  },
  {
    nome: 'bradesco',
    aliases: ['bradesco', 'brades', 'brad'],
    cor: '#CC092F',
    emoji: '❤️'
  },
  {
    nome: 'santander',
    aliases: ['santander', 'santan', 'sant'],
    cor: '#EC0000',
    emoji: '🔴'
  },
  {
    nome: 'banco do brasil',
    aliases: ['banco do brasil', 'bb', 'brasil'],
    cor: '#FFCC00',
    emoji: '💛'
  },
  {
    nome: 'caixa',
    aliases: ['caixa', 'caixa economica', 'caixa econômica', 'cef'],
    cor: '#0066CC',
    emoji: '💙'
  },
  {
    nome: 'inter',
    aliases: ['inter', 'banco inter', 'laranja'],
    cor: '#FF7A00',
    emoji: '🟠'
  },
  {
    nome: 'c6',
    aliases: ['c6', 'c6 bank', 'c6bank'],
    cor: '#1A1A1A',
    emoji: '⬛'
  },
  {
    nome: 'picpay',
    aliases: ['picpay', 'pic pay', 'pic'],
    cor: '#21C25E',
    emoji: '💚'
  },
  {
    nome: 'will',
    aliases: ['will', 'will bank', 'willbank'],
    cor: '#FFD700',
    emoji: '⭐'
  },
  {
    nome: 'pagbank',
    aliases: ['pagbank', 'pagseguro', 'pag'],
    cor: '#00A859',
    emoji: '💵'
  },
  {
    nome: 'neon',
    aliases: ['neon', 'banco neon'],
    cor: '#00D4FF',
    emoji: '🩵'
  },
  {
    nome: 'next',
    aliases: ['next', 'banco next'],
    cor: '#00FF00',
    emoji: '💚'
  },
  {
    nome: 'original',
    aliases: ['original', 'banco original'],
    cor: '#00A651',
    emoji: '💚'
  },
  {
    nome: 'btg',
    aliases: ['btg', 'btg pactual'],
    cor: '#001E62',
    emoji: '🔵'
  },
  {
    nome: 'xp',
    aliases: ['xp', 'xp investimentos'],
    cor: '#000000',
    emoji: '⚫'
  },
  {
    nome: 'rico',
    aliases: ['rico', 'rico investimentos'],
    cor: '#FF6600',
    emoji: '🟠'
  },
  {
    nome: 'clear',
    aliases: ['clear', 'clear corretora'],
    cor: '#00B4D8',
    emoji: '🔵'
  },
  {
    nome: 'mercado pago',
    aliases: ['mercado pago', 'mp', 'meli'],
    cor: '#00B1EA',
    emoji: '💙'
  },
  {
    nome: 'ame',
    aliases: ['ame', 'ame digital'],
    cor: '#E91E63',
    emoji: '💗'
  }
];

// Helper: Lista simples de aliases para detecção rápida
export const BANCO_ALIASES_FLAT: string[] = BANCO_CONFIGS.flatMap(b => b.aliases);

// Helper: Mapa de alias → nome oficial
export const BANCO_ALIAS_TO_NOME: Record<string, string> = {};
BANCO_CONFIGS.forEach(banco => {
  banco.aliases.forEach(alias => {
    BANCO_ALIAS_TO_NOME[alias.toLowerCase()] = banco.nome;
  });
});

// ============================================
// 3. FORMAS DE PAGAMENTO
// ============================================

export interface PagamentoConfig {
  id: string;
  label: string;
  aliases: string[];
  emoji: string;
  requerConta: boolean;  // PIX, débito, dinheiro = conta | Crédito = cartão
}

export const PAGAMENTO_CONFIGS: PagamentoConfig[] = [
  {
    id: 'credit',
    label: 'Cartão de Crédito',
    aliases: ['credito', 'crédito', 'cartao', 'cartão', 'cartao de credito', 'cartão de crédito', 'credit', 'cc'],
    emoji: '💳',
    requerConta: false  // Requer seleção de CARTÃO, não conta
  },
  {
    id: 'debit',
    label: 'Cartão de Débito',
    aliases: ['debito', 'débito', 'cartao de debito', 'cartão de débito', 'debit'],
    emoji: '💳',
    requerConta: true
  },
  {
    id: 'pix',
    label: 'PIX',
    aliases: ['pix'],
    emoji: '📲',
    requerConta: true
  },
  {
    id: 'cash',
    label: 'Dinheiro',
    aliases: ['dinheiro', 'cash', 'especie', 'espécie', 'em maos', 'em mãos'],
    emoji: '💵',
    requerConta: true
  },
  {
    id: 'transfer',
    label: 'Transferência',
    aliases: ['transferencia', 'transferência', 'ted', 'doc'],
    emoji: '🏦',
    requerConta: true
  },
  {
    id: 'boleto',
    label: 'Boleto',
    aliases: ['boleto', 'boleto bancario', 'boleto bancário'],
    emoji: '📄',
    requerConta: true
  }
];

// Helper: Lista simples de aliases para detecção rápida
export const PAGAMENTO_ALIASES_FLAT: string[] = PAGAMENTO_CONFIGS.flatMap(p => p.aliases);

// Helper: Mapa de alias → id
export const PAGAMENTO_ALIAS_TO_ID: Record<string, string> = {};
PAGAMENTO_CONFIGS.forEach(pagamento => {
  pagamento.aliases.forEach(alias => {
    PAGAMENTO_ALIAS_TO_ID[alias.toLowerCase()] = pagamento.id;
  });
});

// ============================================
// 4. CATEGORIAS NLP (inglês → português)
// ============================================

export const NLP_CATEGORIA_MAP: Record<string, string> = {
  // Inglês → Português
  'transport': 'Transporte',
  'transportation': 'Transporte',
  'food': 'Alimentação',
  'groceries': 'Alimentação',
  'housing': 'Moradia',
  'home': 'Moradia',
  'health': 'Saúde',
  'healthcare': 'Saúde',
  'education': 'Educação',
  'entertainment': 'Lazer',
  'leisure': 'Lazer',
  'clothing': 'Vestuário',
  'clothes': 'Vestuário',
  'beauty': 'Beleza',
  'pets': 'Pets',
  'technology': 'Tecnologia',
  'tech': 'Tecnologia',
  'subscriptions': 'Assinaturas',
  'travel': 'Viagens',
  'sports': 'Esportes',
  'investments': 'Investimentos',
  'other': 'Outros',
  'others': 'Outros',
  
  // Português (normalizado)
  'transporte': 'Transporte',
  'alimentação': 'Alimentação',
  'alimentacao': 'Alimentação',
  'moradia': 'Moradia',
  'saúde': 'Saúde',
  'saude': 'Saúde',
  'educação': 'Educação',
  'educacao': 'Educação',
  'lazer': 'Lazer',
  'vestuário': 'Vestuário',
  'vestuario': 'Vestuário',
  'beleza': 'Beleza',
  'pets': 'Pets',
  'tecnologia': 'Tecnologia',
  'assinaturas': 'Assinaturas',
  'viagens': 'Viagens',
  'esportes': 'Esportes',
  'investimentos': 'Investimentos',
  'outros': 'Outros',
};

// ============================================
// 5. FUNÇÕES UTILITÁRIAS
// ============================================

/**
 * Detecta categoria por palavra-chave no texto
 * @param texto - Texto para analisar (já normalizado, sem acentos, lowercase)
 * @returns Nome da categoria ou null
 */
export function detectarCategoriaPorPalavraChave(texto: string): string | null {
  const textoNormalizado = texto.toLowerCase();
  
  for (const [palavra, categoria] of Object.entries(CATEGORIA_KEYWORDS)) {
    if (textoNormalizado.includes(palavra)) {
      return categoria;
    }
  }
  
  return null;
}

/**
 * Detecta banco por alias no texto
 * @param texto - Texto para analisar
 * @returns Nome oficial do banco ou null
 */
export function detectarBancoPorAlias(texto: string): string | null {
  const textoNormalizado = texto.toLowerCase();
  
  for (const banco of BANCO_CONFIGS) {
    for (const alias of banco.aliases) {
      if (textoNormalizado.includes(alias)) {
        return banco.nome;
      }
    }
  }
  
  return null;
}

/**
 * Detecta forma de pagamento por alias no texto
 * @param texto - Texto para analisar
 * @returns Config do pagamento ou null
 */
export function detectarPagamentoPorAlias(texto: string): PagamentoConfig | null {
  const textoNormalizado = texto.toLowerCase();
  
  for (const pagamento of PAGAMENTO_CONFIGS) {
    for (const alias of pagamento.aliases) {
      if (textoNormalizado.includes(alias)) {
        return pagamento;
      }
    }
  }
  
  return null;
}

/**
 * Normaliza categoria do NLP para português
 * @param categoriaNLP - Categoria retornada pelo NLP
 * @returns Categoria em português ou "Outros"
 */
export function normalizarCategoriaNLP(categoriaNLP: string): string {
  if (!categoriaNLP) return 'Outros';
  
  const normalizada = categoriaNLP.toLowerCase().trim();
  return NLP_CATEGORIA_MAP[normalizada] || 'Outros';
}

/**
 * Busca config completa do banco pelo nome ou alias
 * @param nomeOuAlias - Nome ou alias do banco
 * @returns Config do banco ou null
 */
export function getBancoConfig(nomeOuAlias: string): BancoConfig | null {
  const normalizado = nomeOuAlias.toLowerCase();
  
  return BANCO_CONFIGS.find(banco => 
    banco.nome === normalizado || banco.aliases.includes(normalizado)
  ) || null;
}

/**
 * Busca config completa do pagamento pelo id ou alias
 * @param idOuAlias - ID ou alias do pagamento
 * @returns Config do pagamento ou null
 */
export function getPagamentoConfig(idOuAlias: string): PagamentoConfig | null {
  const normalizado = idOuAlias.toLowerCase();
  
  return PAGAMENTO_CONFIGS.find(pagamento => 
    pagamento.id === normalizado || pagamento.aliases.includes(normalizado)
  ) || null;
}

// ============================================
// 6. CONSTANTES ADICIONAIS
// ============================================

// Lista de categorias válidas (para validação)
export const CATEGORIAS_VALIDAS = [
  'Transporte',
  'Alimentação',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Vestuário',
  'Beleza',
  'Pets',
  'Tecnologia',
  'Assinaturas',
  'Viagens',
  'Esportes',
  'Investimentos',
  'Outros'
];

// Categoria padrão (fallback)
export const CATEGORIA_PADRAO = 'Outros';

// Timeout de contexto (em minutos)
export const CONTEXT_TIMEOUT_MINUTES = 60;
```

---

## 4. ARQUIVOS A MODIFICAR

### 4.1 context-manager.ts

**Alterações:**

1. **Remover** mapeamentos inline (linhas 510-528, 1245)
2. **Adicionar** import no topo do arquivo
3. **Substituir** chamadas para usar funções centralizadas

```typescript
// ADICIONAR no topo do arquivo
import {
  CATEGORIA_KEYWORDS,
  BANCO_CONFIGS,
  BANCO_ALIAS_TO_NOME,
  PAGAMENTO_CONFIGS,
  detectarCategoriaPorPalavraChave,
  detectarBancoPorAlias,
  detectarPagamentoPorAlias,
  CONTEXT_TIMEOUT_MINUTES
} from '../shared/mappings';

// REMOVER linhas 510-528 (PALAVRAS_CATEGORIAS)
// REMOVER linha 1245 (array inline de bancos)

// SUBSTITUIR onde usa PALAVRAS_CATEGORIAS
// DE:
const categoria = PALAVRAS_CATEGORIAS[palavra];

// PARA:
const categoria = detectarCategoriaPorPalavraChave(textoNormalizado);

// SUBSTITUIR onde usa array de bancos
// DE:
const bancos = ['nubank', 'itau', 'bradesco', ...];

// PARA:
const bancoDetectado = detectarBancoPorAlias(respostaLower);
```

### 4.2 transaction-mapper.ts

**Alterações:**

1. **Remover** MAPEAMENTO_CATEGORIAS (linhas 83-93)
2. **Remover** NLP_PARA_CATEGORIA (linhas 96-250)
3. **Remover** MAPEAMENTO_BANCOS (linhas 61-77)
4. **Adicionar** import no topo do arquivo
5. **Substituir** chamadas para usar funções centralizadas

```typescript
// ADICIONAR no topo do arquivo
import {
  CATEGORIA_KEYWORDS,
  BANCO_CONFIGS,
  BANCO_ALIAS_TO_NOME,
  NLP_CATEGORIA_MAP,
  detectarCategoriaPorPalavraChave,
  detectarBancoPorAlias,
  normalizarCategoriaNLP,
  getBancoConfig
} from '../shared/mappings';

// REMOVER linhas 61-77 (MAPEAMENTO_BANCOS)
// REMOVER linhas 83-93 (MAPEAMENTO_CATEGORIAS)
// REMOVER linhas 96-250 (NLP_PARA_CATEGORIA)

// SUBSTITUIR onde usa MAPEAMENTO_BANCOS
// DE:
const bancoNome = MAPEAMENTO_BANCOS[alias];

// PARA:
const bancoNome = BANCO_ALIAS_TO_NOME[alias.toLowerCase()];

// SUBSTITUIR onde usa detecção de categoria
// DE:
const categoria = detectarCategoriaPorTexto(texto);

// PARA:
const categoria = detectarCategoriaPorPalavraChave(texto);
```

### 4.3 index.ts (se aplicável)

**Verificar** se há mapeamentos duplicados e aplicar mesmo padrão.

---

## 5. CRITÉRIOS DE ACEITE

### 5.1 Funcionais

| # | Critério | Validação |
|---|----------|-----------|
| 1 | Arquivo `shared/mappings.ts` criado | Arquivo existe |
| 2 | Todos os mapeamentos centralizados | Grep não encontra duplicações |
| 3 | Imports funcionando | Build passa sem erros |
| 4 | Funções utilitárias exportadas | Podem ser chamadas de outros arquivos |

### 5.2 Testes Manuais

| # | Teste | Resultado Esperado |
|---|-------|-------------------|
| 1 | "Paguei 100 de luz no pix do nubank" | Categoria: Moradia, Conta: Nubank |
| 2 | "Abasteci o carro e paguei 200 no débito do itaú" | Categoria: Transporte, Conta: Itaú |
| 3 | "Gastei 50 no mercado com cartão" | Categoria: Alimentação |
| 4 | "Qual meu saldo no roxinho?" | Retorna saldo do Nubank |
| 5 | "Quanto gastei no laranjinha?" | Retorna gastos do Itaú |

### 5.3 Não-Regressão

- Todos os testes que funcionavam em v203 devem continuar funcionando
- Nenhum bug corrigido deve voltar

---

## 6. PLANO DE IMPLEMENTAÇÃO

### Fase 1: Criar arquivo (30 min)

1. Criar `supabase/functions/shared/mappings.ts`
2. Copiar código do template acima
3. Verificar sintaxe (build local)

### Fase 2: Migrar context-manager.ts (30 min)

1. Adicionar import
2. Remover mapeamentos duplicados
3. Substituir chamadas
4. Testar localmente

### Fase 3: Migrar transaction-mapper.ts (30 min)

1. Adicionar import
2. Remover mapeamentos duplicados
3. Substituir chamadas
4. Testar localmente

### Fase 4: Verificar index.ts (15 min)

1. Verificar se há duplicações
2. Migrar se necessário

### Fase 5: Deploy e Teste (30 min)

1. Deploy v204
2. Executar testes manuais
3. Verificar logs
4. Confirmar sucesso

---

## 7. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Import path errado | Média | Alto | Verificar paths relativos antes do deploy |
| Função não exportada | Baixa | Médio | TypeScript vai acusar erro no build |
| Mapeamento faltando | Média | Médio | Comparar com arquivos originais |
| Bug de regressão | Baixa | Alto | Testar todos os cenários da sessão |

---

## 8. DEFINIÇÃO DE PRONTO

- [ ] Arquivo `shared/mappings.ts` criado e com build passando
- [ ] `context-manager.ts` usando imports centralizados
- [ ] `transaction-mapper.ts` usando imports centralizados
- [ ] Nenhum mapeamento duplicado (verificar com grep)
- [ ] Todos os testes manuais passando
- [ ] Deploy v204 em produção
- [ ] Logs mostrando comportamento correto

---

## 9. REFERÊNCIAS

- **Auditoria Completa:** Documento gerado em 08/12/2025
- **Sessão de Debug:** v188 → v203 (9 bugs corrigidos)
- **Padrões Identificados:** 6 padrões raiz

---

**Autor:** Alf + Claude  
**Revisor:** Windsurf  
**Data de Criação:** 08/12/2025  
**Última Atualização:** 08/12/2025
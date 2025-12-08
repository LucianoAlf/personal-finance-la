/**
 * Validação estrutural de entidades extraídas pelo NLP
 * Remove dados que o NLP "inventou" (alucinações)
 * 
 * Problema: NLP às vezes retorna descrições/categorias que não existem no texto original
 * Solução: Validar contra o texto original e descartar dados não-confiáveis
 */

export function validarEntidadesNLP(
  entidades: Record<string, any>,
  textoOriginal: string
): Record<string, any> {
  const texto = textoOriginal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const resultado = { ...entidades };
  
  // Lista de descrições comuns que o NLP pode alucinar
  const descricoesComuns = [
    'uber', 'ifood', '99', 'mercado', 'supermercado', 'farmacia', 
    'lanche', 'almoco', 'jantar', 'cafe', 'gasolina', 'combustivel',
    'luz', 'agua', 'internet', 'telefone', 'aluguel', 'rappi', 'taxi',
    'onibus', 'metro', 'restaurante', 'padaria', 'pizzaria', 'bar',
    'cinema', 'livro', 'roupa', 'sapato', 'bolsa', 'presente'
  ];
  
  // Se tem descrição, verificar se realmente está no texto
  if (resultado.descricao) {
    const descLower = resultado.descricao
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    // Verificar se descrição está no texto original
    const descNoTexto = texto.includes(descLower);
    
    // Se é uma descrição comum mas NÃO está no texto, é alucinação
    if (!descNoTexto && descricoesComuns.includes(descLower)) {
      console.log('[NLP-VALIDATOR] ⚠️ Descrição alucinada removida:', resultado.descricao);
      console.log('[NLP-VALIDATOR] Texto original não contém:', descLower);
      resultado.descricao = null;
      resultado.categoria = null; // Categoria dependia da descrição falsa
    }
  }
  
  // Se tem categoria mas não tem descrição válida, validar categoria
  if (resultado.categoria && !resultado.descricao) {
    const categoriaNorm = resultado.categoria
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    // ✅ BUG #19: Se o nome da categoria está EXPLÍCITO no texto, MANTER
    if (texto.includes(categoriaNorm)) {
      console.log('[NLP-VALIDATOR] ✅ Categoria mencionada explicitamente:', resultado.categoria);
      // NÃO remove - usuário disse a categoria
    } else {
      // Verificar se categoria tem keyword no texto
      const keywordsCategoria: Record<string, string[]> = {
        'Transporte': ['uber', '99', 'taxi', 'onibus', 'metro', 'gasolina', 'combustivel', 'estacionamento', 'passagem', 'uber eats'],
        'Alimentação': ['mercado', 'supermercado', 'lanche', 'almoco', 'jantar', 'cafe', 'restaurante', 'ifood', 'rappi', 'padaria', 'pizzaria', 'bar'],
        'Moradia': ['luz', 'agua', 'gas', 'aluguel', 'condominio', 'iptu', 'internet', 'telefone'],
        'Saúde': ['farmacia', 'remedio', 'medico', 'consulta', 'exame', 'plano de saude', 'dentista', 'saude'],
        'Educação': ['livro', 'curso', 'escola', 'universidade', 'aula', 'educacao'],
        'Lazer': ['cinema', 'teatro', 'show', 'jogo', 'diversao', 'lazer'],
        'Vestuário': ['roupa', 'sapato', 'bolsa', 'calcado', 'moda', 'vestuario'],
        'Viagens': ['viagem', 'viagens', 'hotel', 'passagem', 'aereo', 'hospedagem'],
        'Assinaturas': ['assinatura', 'assinaturas', 'netflix', 'spotify', 'streaming'],
      };
      
      const keywords = keywordsCategoria[resultado.categoria] || [];
      const temKeyword = keywords.some(k => texto.includes(k));
      
      if (!temKeyword) {
        console.log('[NLP-VALIDATOR] ⚠️ Categoria sem keyword removida:', resultado.categoria);
        console.log('[NLP-VALIDATOR] Nenhuma keyword encontrada para:', categoriaNorm);
        resultado.categoria = null;
      }
    }
  }
  
  console.log('[NLP-VALIDATOR] ✅ Entidades validadas:', JSON.stringify(resultado));
  return resultado;
}

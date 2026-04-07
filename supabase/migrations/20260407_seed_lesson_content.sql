-- Seed rich content_blocks for all 15 education lessons.
-- Each lesson gets 6-12 structured ContentBlock[] entries in Brazilian Portuguese.

BEGIN;

-- =============================================================================
-- TRACK 1: Organização Básica / Module: Núcleo da organização
-- =============================================================================

-- Lesson 1: organizacao_visao_geral (article, beginner, 12min)
UPDATE public.education_lessons
SET content_blocks = '[
  {"type": "heading", "level": 2, "text": "Clareza antes de velocidade"},
  {"type": "paragraph", "text": "A maioria das pessoas que sente aperto financeiro imagina que a solução é ganhar mais. A lógica parece irrefutável: se o dinheiro não sobra, preciso de mais dinheiro. Mas existe uma armadilha silenciosa nesse raciocínio. Pesquisas comportamentais mostram que o aumento de renda, sem visibilidade do fluxo real, apenas eleva o patamar de gastos invisíveis. Você ganha 30% a mais e, seis meses depois, continua sem sobra. Isso acontece porque o problema nunca foi de volume — foi de visibilidade."},
  {"type": "key_point", "text": "Sem medir para onde o dinheiro vai, qualquer aumento de renda tende a ser absorvido por gastos que você nem percebe."},
  {"type": "paragraph", "text": "Organização financeira não é planilha bonita nem ritual diário de anotar centavos. É um sistema mínimo que responde três perguntas com confiança: quanto entrou, quanto saiu e quanto realmente sobrou. Se você consegue responder essas perguntas em menos de cinco minutos qualquer dia do mês, já tem organização funcional. Se não consegue, nenhum investimento ou corte de gasto vai ter base sólida."},
  {"type": "heading", "level": 2, "text": "O ciclo ganhar-gastar-esquecer"},
  {"type": "paragraph", "text": "Sem um sistema de registro, o ciclo financeiro se repete mês a mês: o salário cai na conta, os débitos automáticos saem, pequenas compras se acumulam e, na terceira semana, o saldo parece menor do que deveria. A reação natural é cortar algo pontual — um streaming, um café — sem entender se aquilo era realmente relevante. Esse ciclo gera frustração porque as decisões são feitas no escuro. A organização quebra esse padrão ao trazer dados reais para a superfície."},
  {"type": "callout", "variant": "info", "title": "Não é sobre controle absoluto", "text": "O objetivo não é registrar cada centavo para sempre. É criar visibilidade suficiente para que suas decisões tenham base. Depois de dois ou três meses, o sistema fica automático e exige pouco esforço."},
  {"type": "paragraph", "text": "Pense em organização como o painel de um carro. Você não precisa entender cada sensor, mas precisa saber a velocidade, o nível de combustível e se algum alerta está aceso. Sem o painel, você dirige no escuro. Com ele, ajusta a rota naturalmente. A meta desta trilha é construir esse painel financeiro pessoal — mínimo, confiável e sustentável."},
  {"type": "key_point", "text": "Organização financeira funcional responde três perguntas em menos de cinco minutos: quanto entrou, quanto saiu e quanto sobrou."},
  {"type": "callout", "variant": "tip", "title": "Comece pelo extrato", "text": "Antes de instalar qualquer app ou montar planilha, abra o extrato bancário dos últimos 30 dias. Só ler já revela padrões que você não esperava."},
  {"type": "summary", "points": ["Ganhar mais sem visibilidade apenas eleva o patamar de gastos invisíveis.", "Organização é um sistema mínimo que responde: quanto entrou, quanto saiu, quanto sobrou.", "O objetivo é ter um painel financeiro pessoal, não controle obsessivo.", "Comece revisando o extrato dos últimos 30 dias."]},
  {"type": "next_step", "text": "Na próxima lição, você vai mapear suas entradas e saídas reais com um checklist prático.", "lesson_slug": "mapa_entradas_saidas"}
]'::jsonb
WHERE id = '30000000-0000-4000-8000-000000000101';


-- Lesson 2: mapa_entradas_saidas (checklist, beginner, 15min)
UPDATE public.education_lessons
SET content_blocks = '[
  {"type": "heading", "level": 2, "text": "Construindo o mapa real do seu dinheiro"},
  {"type": "paragraph", "text": "A maioria das pessoas tem uma ideia aproximada de quanto ganha, mas quase ninguém sabe dizer com precisão para onde o dinheiro vai. Estudos de finanças comportamentais mostram que subestimamos gastos recorrentes pequenos em até 40%. Assinaturas, lanches, taxas bancárias e compras por impulso se escondem no extrato porque, individualmente, parecem irrelevantes. Somados, podem representar 15% a 20% da renda. O objetivo desta lição é criar uma fotografia honesta do mês — sem julgamento, sem culpa, apenas dados."},
  {"type": "callout", "variant": "tip", "title": "Dica de execução", "text": "Use o extrato bancário e a fatura do cartão dos últimos 30 dias como fonte. Não confie na memória; ela é otimista por natureza."},
  {"type": "paragraph", "text": "O checklist abaixo guia você em cada etapa do mapeamento. Não precisa fazer tudo em uma sessão. Reserve 15 minutos, avance o que der e volte depois. O importante é completar, não ser rápido."},
  {"type": "checklist", "title": "Mapeamento de entradas e saídas", "items": [
    {"id": "map-1", "label": "Listar todas as fontes de entrada do mês (salário, freelance, reembolsos, rendimentos)", "help": "Inclua valores líquidos, já descontados impostos e contribuições obrigatórias."},
    {"id": "map-2", "label": "Somar o total de entradas e anotar o valor", "help": "Se a renda varia, use a média dos últimos 3 meses como referência."},
    {"id": "map-3", "label": "Baixar extrato bancário e fatura do cartão dos últimos 30 dias"},
    {"id": "map-4", "label": "Classificar cada saída em uma categoria simples (moradia, transporte, alimentação, assinaturas, lazer, outros)", "help": "Não crie mais de 8 categorias — simplicidade mantém o hábito."},
    {"id": "map-5", "label": "Somar cada categoria e ordenar da maior para a menor"},
    {"id": "map-6", "label": "Identificar gastos que você não lembrava ou subestimava"},
    {"id": "map-7", "label": "Calcular a sobra real: total de entradas menos total de saídas"},
    {"id": "map-8", "label": "Anotar uma observação pessoal sobre o resultado (sem plano de ação ainda, só observação)"}
  ]},
  {"type": "key_point", "text": "A sobra real é a diferença entre entradas e saídas comprovadas pelo extrato, não pela sua memória."},
  {"type": "callout", "variant": "warning", "title": "Erro comum", "text": "Não inclua gastos planejados que ainda não aconteceram. O mapa é do que já ocorreu, não do que você pretende gastar. Planejamento vem depois."},
  {"type": "summary", "points": ["Subestimamos gastos pequenos em até 40% — o extrato revela a realidade.", "Classifique saídas em no máximo 8 categorias para manter o processo simples.", "A sobra real vem do extrato, não da memória.", "Observe sem julgar: o mapa é diagnóstico, não sentença."]},
  {"type": "next_step", "text": "Agora que você tem o mapa, a próxima lição mostra como separar contas por função para proteger cada parte do dinheiro.", "lesson_slug": "funcao_de_cada_conta"}
]'::jsonb
WHERE id = '30000000-0000-4000-8000-000000000102';


-- Lesson 3: funcao_de_cada_conta (article, beginner, 14min)
UPDATE public.education_lessons
SET content_blocks = '[
  {"type": "heading", "level": 2, "text": "Conta única é armadilha de mistura"},
  {"type": "paragraph", "text": "Quando todo o dinheiro vive em uma conta só, é impossível saber quanto está disponível para gasto e quanto deveria estar protegido. Você olha o saldo, vê R$ 4.000 e sente que pode gastar — mas R$ 1.500 são do aluguel que vence semana que vem e R$ 800 são da reserva de emergência. O saldo visível engana porque mistura funções diferentes. Separar contas por função resolve esse problema sem complicar sua vida."},
  {"type": "glossary_link", "term_slug": "fundo_emergencia", "inline_definition": "Reserva líquida para imprevistos de renda ou gasto, mantida separada do dinheiro operacional."},
  {"type": "paragraph", "text": "A estrutura mínima funcional tem três funções: operacional (o dia a dia — gastos correntes, boletos, cartão), reserva (dinheiro intocável para emergências reais) e objetivos (metas com prazo definido — viagem, troca de equipamento, entrada de imóvel). Cada função pode ser uma conta separada, uma subconta digital ou até um cofrinho em app de banco. O formato importa menos que a separação."},
  {"type": "heading", "level": 2, "text": "Como implementar sem burocracia"},
  {"type": "paragraph", "text": "A forma mais simples é usar contas digitais gratuitas. Hoje, abrir uma conta leva menos de dez minutos e não tem custo de manutenção. Escolha uma conta para operacional (onde cai o salário e saem os débitos), uma para reserva de emergência e, opcionalmente, uma terceira para objetivos de médio prazo. Se seu banco permite subcontas ou ''caixinhas'', use-as. A ideia é que, ao olhar o saldo da conta operacional, aquele número represente exatamente o que você pode gastar sem risco."},
  {"type": "callout", "variant": "example", "title": "Exemplo prático", "text": "Maria recebe R$ 5.000 líquidos. No dia do pagamento, transfere automaticamente R$ 500 para a conta de reserva e R$ 300 para a conta de objetivos. O saldo operacional começa o mês em R$ 4.200 — e esse é o valor real disponível para viver."},
  {"type": "glossary_link", "term_slug": "pay_yourself_first", "inline_definition": "Automatizar a transferência para metas e reservas antes de consumir o restante da renda."},
  {"type": "key_point", "text": "Separar contas não é ter vários bancos — é garantir que cada real tenha uma função visível antes de ser gasto."},
  {"type": "key_point", "text": "Automatize as transferências no dia do pagamento para eliminar a necessidade de disciplina manual todos os meses."},
  {"type": "callout", "variant": "warning", "title": "Cuidado com excesso", "text": "Três funções são suficientes para começar. Criar dez subcontas para cada meta vira burocracia e faz você abandonar o sistema em dois meses."},
  {"type": "summary", "points": ["Conta única mistura funções e engana sobre o saldo disponível.", "A estrutura mínima tem três papéis: operacional, reserva e objetivos.", "Use contas digitais gratuitas ou subcontas do próprio banco.", "Automatize transferências no dia do pagamento.", "Três funções bastam — excesso de divisão vira abandono."]},
  {"type": "next_step", "text": "Com as contas separadas, o próximo passo é definir a cadência de revisão: quando e o que checar sem criar um ritual cansativo.", "lesson_slug": "cadencia_revisao"}
]'::jsonb
WHERE id = '30000000-0000-4000-8000-000000000103';


-- Lesson 4: cadencia_revisao (checklist, beginner, 10min)
UPDATE public.education_lessons
SET content_blocks = '[
  {"type": "heading", "level": 2, "text": "Revisão que cabe na rotina"},
  {"type": "paragraph", "text": "O maior inimigo da organização financeira não é a complexidade — é o abandono. As pessoas montam planilhas elaboradas na primeira semana, mantêm por um mês e depois param. Isso acontece porque a cadência não foi calibrada para a vida real. A solução é escolher um ritmo sustentável (semanal ou mensal) e um roteiro curto de checagem que caiba em dez minutos. Se precisar de mais do que isso, o sistema está complexo demais."},
  {"type": "callout", "variant": "info", "title": "Semanal ou mensal?", "text": "Se sua renda é variável ou você está começando agora, revisão semanal dá feedback mais rápido. Se a renda é estável e o sistema já está rodando, mensal costuma bastar. Não existe resposta errada — existe a que você realmente faz."},
  {"type": "paragraph", "text": "O checklist abaixo serve para ambas as cadências. A diferença é apenas a frequência. Reserve um horário fixo (domingo à noite ou primeiro dia útil do mês) e trate como um compromisso de dez minutos."},
  {"type": "checklist", "title": "Roteiro de revisão financeira", "items": [
    {"id": "rev-1", "label": "Conferir saldo de cada conta (operacional, reserva, objetivos)", "help": "Verifique se os saldos estão coerentes com o esperado. Divergências indicam gastos esquecidos."},
    {"id": "rev-2", "label": "Revisar transações desde a última checagem e classificar pendentes"},
    {"id": "rev-3", "label": "Verificar se algum débito automático falhou ou duplicou"},
    {"id": "rev-4", "label": "Comparar gasto acumulado com o planejado para o período"},
    {"id": "rev-5", "label": "Anotar um ajuste simples para a próxima semana ou mês", "help": "Só um. Ajuste único por ciclo cria progresso sem sobrecarga."},
    {"id": "rev-6", "label": "Registrar se a reserva de emergência foi tocada (e por quê)"}
  ]},
  {"type": "key_point", "text": "A melhor cadência é aquela que você realmente segue. Dez minutos por semana superam uma hora mensal que nunca acontece."},
  {"type": "callout", "variant": "tip", "title": "Automatize o lembrete", "text": "Crie um alarme no celular para o horário escolhido. Sem lembrete, a revisão compete com todas as outras demandas do dia e perde."},
  {"type": "summary", "points": ["O maior risco é abandonar, não errar a planilha.", "Escolha semanal (renda variável ou início) ou mensal (renda estável e sistema rodando).", "O roteiro de revisão deve caber em 10 minutos.", "Um ajuste por ciclo é suficiente para criar progresso contínuo.", "Use alarme fixo para não depender de motivação."]},
  {"type": "next_step", "text": "Na próxima lição, você junta tudo em um checklist completo para o primeiro mês de organização financeira.", "lesson_slug": "checklist_primeiro_mes"}
]'::jsonb
WHERE id = '30000000-0000-4000-8000-000000000104';


-- Lesson 5: checklist_primeiro_mes (checklist, beginner, 18min)
UPDATE public.education_lessons
SET content_blocks = '[
  {"type": "heading", "level": 2, "text": "O método mínimo viável para o primeiro mês"},
  {"type": "paragraph", "text": "Você já sabe por que organização importa, mapeou suas entradas e saídas, separou contas por função e definiu uma cadência de revisão. Agora é hora de integrar tudo em um ciclo completo. O primeiro mês é o mais importante porque define se o sistema vai se sustentar. Por isso, a estratégia é mínimo viável: faça apenas o essencial, mas faça completo. Se funcionar por 30 dias, você tem uma base sólida para expandir depois."},
  {"type": "callout", "variant": "info", "title": "Mínimo viável, não mínimo aceitável", "text": "Mínimo viável significa o menor escopo que produz resultado real. Não é fazer pela metade — é fazer o essencial inteiro. Três categorias bem acompanhadas valem mais que quinze abandonadas."},
  {"type": "paragraph", "text": "O checklist a seguir é o plano completo. Marque cada item conforme executar durante o mês. Se travar em algum ponto, pule e volte depois — progresso parcial é melhor que paralisia total."},
  {"type": "checklist", "title": "Primeiro mês de organização financeira", "items": [
    {"id": "mes1-1", "label": "Definir no máximo 6 categorias de gasto para acompanhar", "help": "Sugestão: moradia, transporte, alimentação, saúde, lazer, outros. Ajuste à sua realidade."},
    {"id": "mes1-2", "label": "Configurar contas por função (operacional, reserva, objetivos)"},
    {"id": "mes1-3", "label": "Automatizar transferência para reserva e objetivos no dia do pagamento"},
    {"id": "mes1-4", "label": "Registrar todas as entradas do mês com valores líquidos"},
    {"id": "mes1-5", "label": "Classificar todas as saídas nas categorias definidas ao menos uma vez por semana"},
    {"id": "mes1-6", "label": "Fazer a primeira revisão semanal usando o roteiro da lição anterior"},
    {"id": "mes1-7", "label": "No final do mês, calcular sobra ou déficit real e comparar com a expectativa"},
    {"id": "mes1-8", "label": "Anotar três aprendizados do primeiro ciclo e um ajuste para o mês seguinte"}
  ]},
  {"type": "key_point", "text": "O primeiro mês é diagnóstico: o objetivo não é ter o mês perfeito, mas ter dados reais para melhorar o segundo."},
  {"type": "callout", "variant": "tip", "title": "Reduza a fricção", "text": "Se categorizar gastos parece pesado, comece só dividindo entre ''fixo'' e ''variável''. Você refina depois. O hábito importa mais que a precisão no início."},
  {"type": "callout", "variant": "warning", "title": "Armadilha do perfeccionismo", "text": "Se você perceber que gastou demais em uma categoria, não tente compensar cortando tudo na semana seguinte. Apenas registre e ajuste gradualmente. Cortes radicais geram efeito rebote."},
  {"type": "summary", "points": ["O primeiro mês integra tudo: mapa, contas por função, cadência de revisão.", "Use no máximo 6 categorias e automatize transferências no dia do pagamento.", "O objetivo é diagnóstico: dados reais para calibrar o segundo mês.", "Perfeccionismo é inimigo da sustentabilidade — progresso parcial supera paralisia.", "Anote três aprendizados e um ajuste ao final do ciclo."]},
  {"type": "next_step", "text": "Parabéns por completar o módulo de organização básica. Quando estiver pronto, explore a trilha de eliminação de dívidas para otimizar o uso do dinheiro que você agora enxerga com clareza."}
]'::jsonb
WHERE id = '30000000-0000-4000-8000-000000000105';


-- =============================================================================
-- TRACK 2: Eliminando Dívidas / Module: Núcleo da quitação
-- =============================================================================

-- Lesson 6: custo_efetivo_dividas (article, beginner, 16min)
UPDATE public.education_lessons
SET content_blocks = '[
  {"type": "heading", "level": 2, "text": "Nem toda dívida é igual"},
  {"type": "paragraph", "text": "Dívida não é uma entidade única. Existe uma diferença brutal entre um financiamento imobiliário a 9% ao ano e o rotativo do cartão a 400% ao ano. Tratar ambas com a mesma urgência é desperdiçar energia onde o impacto é mínimo. A primeira habilidade de quem quer sair de dívidas é classificar: dívida cara, média e barata. Essa classificação determina a ordem de ataque e pode encurtar o prazo total de quitação em meses ou até anos."},
  {"type": "glossary_link", "term_slug": "rotativo_cartao", "inline_definition": "Crédito automático quando você paga menos que o total da fatura, com juros compostos que podem ultrapassar 400% ao ano."},
  {"type": "paragraph", "text": "Dívida cara é aquela com juros acima de 3% ao mês — rotativo de cartão, cheque especial, crediário de loja. Dívida média fica entre 1,5% e 3% ao mês — empréstimo pessoal, consignado privado com taxa alta. Dívida barata está abaixo de 1,5% ao mês — financiamento imobiliário, consignado público, FIES. Os números exatos dependem do cenário de juros atual, mas a lógica de ordenação permanece."},
  {"type": "heading", "level": 2, "text": "Ordem de ataque: avalanche vs bola de neve"},
  {"type": "paragraph", "text": "Existem duas estratégias clássicas. O método avalanche prioriza a dívida com maior taxa de juros — matematicamente, elimina mais custo no menor tempo. O método bola de neve prioriza a menor dívida em valor absoluto — psicologicamente, gera vitórias rápidas que motivam a continuar. Ambos funcionam. O pior método é o aleatório: pagar um pouco de cada sem critério, o que maximiza o custo total de juros."},
  {"type": "callout", "variant": "example", "title": "Exemplo comparativo", "text": "João tem três dívidas: cartão (R$ 2.000, 15% ao mês), empréstimo (R$ 8.000, 2% ao mês) e consignado (R$ 12.000, 1% ao mês). Pelo método avalanche, ele paga o mínimo do empréstimo e do consignado e joga tudo que sobra no cartão. Eliminado o cartão, redireciona para o empréstimo. Pelo método bola de neve, a ordem seria a mesma nesse caso, porque a menor dívida coincide com a mais cara. Quando isso não acontece, a escolha depende do que mantém você motivado."},
  {"type": "key_point", "text": "Priorize dívidas com juros acima de 3% ao mês — cada mês de atraso na quitação dessas custa exponencialmente mais."},
  {"type": "glossary_link", "term_slug": "inadimplencia", "inline_definition": "Falta de pagamento nas condições contratadas, gerando multas, juros adicionais e impacto no score de crédito."},
  {"type": "key_point", "text": "O pior método é o aleatório. Qualquer critério consistente — avalanche ou bola de neve — supera pagar um pouco de cada sem ordem."},
  {"type": "callout", "variant": "warning", "title": "Não pare o mínimo das outras", "text": "Enquanto concentra energia na dívida prioritária, continue pagando o mínimo obrigatório de todas as demais. Cair em inadimplência de uma dívida para quitar outra cria um problema novo que pode custar mais caro."},
  {"type": "summary", "points": ["Classifique dívidas em cara (>3% ao mês), média (1,5-3%) e barata (<1,5%).", "Método avalanche: prioriza a de maior juros — menor custo total.", "Método bola de neve: prioriza a menor em valor — vitórias rápidas.", "Qualquer critério consistente supera pagamento aleatório.", "Mantenha o mínimo de todas as dívidas para evitar inadimplência."]},
  {"type": "next_step", "text": "Na próxima lição, você aprende a calibrar entre pagar o mínimo obrigatório e acelerar a quitação onde o impacto é maior.", "lesson_slug": "minimo_vs_aceleracao"}
]'::jsonb
WHERE id = '30000000-0000-4000-8000-000000000201';


-- Lesson 7: minimo_vs_aceleracao (article, intermediate, 14min)
UPDATE public.education_lessons
SET content_blocks = '[
  {"type": "heading", "level": 2, "text": "O equilíbrio entre sobreviver e acelerar"},
  {"type": "paragraph", "text": "Pagar apenas o mínimo de cada dívida mantém você adimplente, mas maximiza o custo de juros ao longo do tempo. Por outro lado, jogar tudo em uma dívida e ignorar o mínimo das outras gera atraso, multa e piora do score de crédito. O desafio real é encontrar o ponto de equilíbrio: mínimo obrigatório em todas as dívidas ativas e aceleração direcionada na dívida prioritária com o dinheiro que sobra."},
  {"type": "glossary_link", "term_slug": "score_credito", "inline_definition": "Pontuação estatística usada por credores para estimar seu risco de não pagar — pagamentos em dia são o fator de maior peso."},
  {"type": "paragraph", "text": "Para calcular o valor de aceleração disponível, subtraia da sua renda líquida: todos os gastos essenciais (moradia, alimentação, transporte), os mínimos obrigatórios de cada dívida e uma pequena margem de segurança (5% a 10% da renda) para imprevistos do mês. O que sobrar é o dinheiro de aceleração. Pode ser R$ 200, pode ser R$ 50. O valor absoluto importa menos que a consistência."},
  {"type": "heading", "level": 2, "text": "Estratégia de direcionamento"},
  {"type": "paragraph", "text": "Com o valor de aceleração definido, direcione 100% dele para a dívida prioritária (a mais cara, se escolheu avalanche, ou a menor, se escolheu bola de neve). Não divida entre várias dívidas — concentração é o que gera impacto. Quando a dívida prioritária for quitada, pegue o valor que ia para ela (mínimo + aceleração) e redirecione integralmente para a próxima da lista. Esse efeito cascata é o motor de ambas as estratégias."},
  {"type": "callout", "variant": "tip", "title": "Teste antes de comprometer", "text": "Viva um mês com o orçamento de aceleração antes de negociar parcelas maiores com credores. Se o valor for sustentável na prática, aí sim formalize. Comprometer-se com parcela que não cabe na rotina leva a novo atraso."},
  {"type": "key_point", "text": "O valor de aceleração é: renda líquida menos gastos essenciais, menos mínimos obrigatórios, menos margem de segurança."},
  {"type": "callout", "variant": "warning", "title": "Não sacrifique a reserva", "text": "Se você ainda não tem reserva de emergência, destine ao menos uma parte pequena (R$ 50-100) para começar a construí-la mesmo durante a quitação de dívidas. Um imprevisto sem reserva gera nova dívida cara."},
  {"type": "key_point", "text": "Quando uma dívida é quitada, redirecione o valor total (mínimo + aceleração) para a próxima. O efeito cascata acelera exponencialmente."},
  {"type": "summary", "points": ["Mínimo em todas mantém adimplência; aceleração na prioritária reduz custo total.", "Valor de aceleração = renda - essenciais - mínimos - margem de segurança.", "Concentre 100% da aceleração em uma dívida por vez.", "Ao quitar uma, redirecione tudo para a próxima (efeito cascata).", "Reserve ao menos uma quantia simbólica para emergências, mesmo endividado."]},
  {"type": "next_step", "text": "A próxima lição traz um checklist para avaliar propostas de renegociação e portabilidade sem cair em armadilhas.", "lesson_slug": "renegociacao_portabilidade"}
]'::jsonb
WHERE id = '30000000-0000-4000-8000-000000000202';


-- Lesson 8: renegociacao_portabilidade (checklist, intermediate, 18min)
UPDATE public.education_lessons
SET content_blocks = '[
  {"type": "heading", "level": 2, "text": "Renegociar com critério, não com desespero"},
  {"type": "paragraph", "text": "Renegociação e portabilidade de crédito são ferramentas poderosas quando usadas com critério. O problema é que muitas propostas parecem vantajosas na superfície — parcela menor, ''desconto'' no saldo — mas escondem alongamento de prazo ou taxas embutidas que aumentam o custo total. Antes de aceitar qualquer proposta, você precisa comparar usando três métricas: taxa de juros efetiva (CET), custo total da dívida e prazo total de pagamento. Se a proposta reduz a parcela mas aumenta o prazo, calcule quanto vai pagar a mais no total."},
  {"type": "callout", "variant": "info", "title": "Portabilidade de crédito", "text": "Desde 2013 você pode transferir dívidas de um banco para outro que ofereça condições melhores. O banco de destino quita a dívida no banco de origem e emite uma nova com taxa menor. O processo é regulado pelo Banco Central e o banco de origem não pode recusar."},
  {"type": "paragraph", "text": "Use o checklist abaixo para comparar qualquer proposta de renegociação ou portabilidade. Se não conseguir preencher todas as informações, peça ao credor — ele é obrigado a fornecer o Custo Efetivo Total (CET) da operação."},
  {"type": "checklist", "title": "Avaliação de propostas de renegociação", "items": [
    {"id": "neg-1", "label": "Anotar o saldo devedor atual e a taxa de juros mensal/anual vigente"},
    {"id": "neg-2", "label": "Anotar o CET (Custo Efetivo Total) da proposta — exija esse número por escrito", "help": "O CET inclui juros, tarifas, seguros e IOF. É a métrica mais honesta para comparar."},
    {"id": "neg-3", "label": "Calcular o custo total da proposta: parcela x número de parcelas"},
    {"id": "neg-4", "label": "Comparar o custo total da proposta com o custo total da dívida atual (parcela atual x parcelas restantes)"},
    {"id": "neg-5", "label": "Verificar se há cobrança de tarifa de renegociação, seguro embutido ou IOF adicional"},
    {"id": "neg-6", "label": "Confirmar se a proposta permite amortização antecipada sem multa"},
    {"id": "neg-7", "label": "Se for portabilidade, obter proposta formal do banco de destino antes de aceitar"}
  ]},
  {"type": "key_point", "text": "Parcela menor com prazo maior pode custar mais no total. Compare sempre o custo total (parcela vezes número de parcelas), não apenas o valor mensal."},
  {"type": "callout", "variant": "warning", "title": "Armadilha do ''desconto''", "text": "''Desconto de 40% no saldo devedor'' pode significar que você já pagou juros suficientes para cobrir esse suposto desconto. Calcule quanto já pagou no total antes de comemorar."},
  {"type": "glossary_link", "term_slug": "limite_credito", "inline_definition": "Valor máximo autorizado pelo banco para uso em crédito rotativo — não é patrimônio, é capacidade de endividamento."},
  {"type": "key_point", "text": "Exija o CET por escrito antes de aceitar qualquer proposta. Se o credor resistir, desconfie."},
  {"type": "summary", "points": ["Compare propostas por CET, custo total e prazo — não apenas pela parcela mensal.", "Portabilidade de crédito é um direito regulado e o banco de origem não pode recusar.", "Verifique tarifas ocultas, seguros embutidos e IOF adicional.", "Confirme que a proposta permite amortização antecipada sem multa.", "''Desconto'' no saldo nem sempre é vantagem real — calcule o custo total já pago."]},
  {"type": "next_step", "text": "Na próxima lição, você vai entender como funciona o cartão de crédito nos três modos de uso e por que o rotativo é o mais perigoso.", "lesson_slug": "cartao_fatura_rotativo"}
]'::jsonb
WHERE id = '30000000-0000-4000-8000-000000000203';


-- Lesson 9: cartao_fatura_rotativo (article, beginner, 15min)
UPDATE public.education_lessons
SET content_blocks = '[
  {"type": "heading", "level": 2, "text": "Três modos, três custos diferentes"},
  {"type": "paragraph", "text": "O cartão de crédito tem três modos de uso e a maioria das pessoas não percebe quando transita entre eles. Pagamento total da fatura é o uso saudável: você compra durante o mês, recebe a fatura e paga tudo até o vencimento. Custo de juros: zero. Parcelamento na fatura (quando disponível) divide o saldo em parcelas fixas com juros definidos — custa mais que o total, mas é previsível. Rotativo é o que acontece quando você paga qualquer valor abaixo do total: o banco financia o restante a juros compostos que costumam ultrapassar 15% ao mês."},
  {"type": "glossary_link", "term_slug": "rotativo_cartao", "inline_definition": "Crédito automático com juros compostos altíssimos, ativado sempre que a fatura não é paga integralmente."},
  {"type": "paragraph", "text": "O rotativo é a dívida mais cara acessível ao consumidor brasileiro. Uma fatura de R$ 1.000 não paga se transforma em R$ 1.150 no mês seguinte, R$ 1.322 no terceiro, R$ 1.520 no quarto. Em 12 meses, o saldo pode triplicar. A regulação obriga o banco a migrar para parcelamento após 30 dias de rotativo, mas o estrago do primeiro mês já é significativo. A regra de ouro é simples: se não puder pagar o total, parcele antes de cair no rotativo."},
  {"type": "heading", "level": 2, "text": "Estratégias para manter o uso saudável"},
  {"type": "paragraph", "text": "O cartão não é vilão — é uma ferramenta neutra. O problema está no uso sem visibilidade. Para manter o uso no modo saudável, aplique três regras: primeiro, defina um limite pessoal abaixo do limite do banco (se o banco libera R$ 5.000, use como se fosse R$ 3.000). Segundo, acompanhe o gasto acumulado no app do cartão ao menos uma vez por semana. Terceiro, nunca use o cartão para antecipar renda futura — se o dinheiro só entra mês que vem, não é seguro gastar agora."},
  {"type": "glossary_link", "term_slug": "limite_credito", "inline_definition": "O limite do banco não é seu dinheiro — é a capacidade máxima de endividamento com custo associado."},
  {"type": "callout", "variant": "tip", "title": "Teste do café", "text": "Se você precisa do cartão para pagar despesas básicas antes do fechamento da fatura, isso indica que o fluxo de caixa está no limite. Trate como sinal de alerta, não como uso normal."},
  {"type": "key_point", "text": "O rotativo pode triplicar uma dívida em 12 meses. Se não puder pagar o total, parcele antes de cair no rotativo."},
  {"type": "key_point", "text": "Defina um limite pessoal abaixo do limite do banco e acompanhe o gasto acumulado semanalmente."},
  {"type": "callout", "variant": "warning", "title": "Pagar o mínimo não é ''estar em dia''", "text": "Pagar o mínimo evita inadimplência formal, mas ativa o rotativo. Para o banco, você está em dia. Para o seu patrimônio, está acumulando a dívida mais cara possível."},
  {"type": "summary", "points": ["Fatura total: sem juros. Parcelamento: juros definidos. Rotativo: juros compostos altíssimos.", "O rotativo pode triplicar o saldo em 12 meses.", "Se não puder pagar o total, parcele imediatamente — não deixe cair no rotativo.", "Defina um limite pessoal de uso abaixo do limite do banco.", "Pagar o mínimo evita inadimplência, mas ativa o custo mais caro do sistema."]},
  {"type": "next_step", "text": "Na última lição do módulo, você vai montar um plano concreto de quitação com meta, data e marcos de acompanhamento.", "lesson_slug": "plano_quitacao_realista"}
]'::jsonb
WHERE id = '30000000-0000-4000-8000-000000000204';


-- Lesson 10: plano_quitacao_realista (exercise, intermediate, 20min)
UPDATE public.education_lessons
SET content_blocks = '[
  {"type": "heading", "level": 2, "text": "De intenção a plano com data"},
  {"type": "paragraph", "text": "Dizer ''quero quitar minhas dívidas'' é intenção. Dizer ''vou quitar o cartão de R$ 3.200 até setembro, pagando R$ 600 por mês além do mínimo'' é um plano. A diferença entre os dois é mensurabilidade. Um plano de quitação real tem quatro componentes: o saldo devedor de cada dívida, a ordem de prioridade, o valor mensal de aceleração e a data estimada de conclusão. Sem esses quatro elementos, você tem um desejo, não um plano."},
  {"type": "paragraph", "text": "O exercício abaixo guia você na construção do seu plano de quitação pessoal. Pode ser feito com caneta e papel, planilha ou qualquer ferramenta que preferir. O formato importa menos que a completude: preencha cada campo, mesmo que com estimativas. Estimativas ajustáveis são melhores que espaços em branco."},
  {"type": "exercise", "title": "Monte seu plano de quitação", "instructions": "1. Liste cada dívida ativa com: nome do credor, saldo devedor atual, taxa de juros mensal e valor do mínimo obrigatório.\n2. Ordene da mais cara (maior taxa) para a mais barata.\n3. Calcule seu valor de aceleração mensal: renda líquida - gastos essenciais - soma dos mínimos - 5% de margem.\n4. Para a dívida prioritária, calcule quantos meses levaria para quitá-la com o mínimo + aceleração. Use a fórmula simplificada: saldo / (mínimo + aceleração - juros mensais estimados). Se os juros mensais forem maiores que sua aceleração, a dívida está crescendo — renegociar é urgente.\n5. Defina a data-alvo para quitação da primeira dívida e anote.\n6. Defina marcos semanais: a cada semana, verifique se o saldo reduziu conforme o esperado.\n7. Repita para as demais dívidas, somando a aceleração liberada pela quitação anterior (efeito cascata).", "hint": "Se a conta dos juros parece confusa, use o simulador do Banco Central (simulador de dívidas) ou peça ao credor o extrato detalhado com projeção de saldo."},
  {"type": "callout", "variant": "info", "title": "Buffer para imprevistos", "text": "Adicione 10-15% ao prazo estimado como buffer. Imprevistos acontecem — um mês sem poder acelerar não invalida o plano, apenas ajusta a data. O importante é retomar no mês seguinte."},
  {"type": "key_point", "text": "Um plano real tem quatro elementos: saldo, ordem de prioridade, valor de aceleração e data-alvo."},
  {"type": "callout", "variant": "warning", "title": "Se os juros superam a aceleração", "text": "Se o valor de juros mensais é maior que o valor de aceleração disponível, a dívida está crescendo mesmo com pagamentos. Nesse caso, renegociação ou portabilidade é urgente — não adie."},
  {"type": "key_point", "text": "Marcos semanais transformam um objetivo de meses em checagens curtas e gerenciáveis."},
  {"type": "summary", "points": ["Plano de quitação = saldo + ordem + valor de aceleração + data-alvo.", "Ordene dívidas pela taxa de juros e concentre aceleração na mais cara.", "Se juros mensais superam a aceleração, renegocie antes de continuar.", "Adicione 10-15% ao prazo como buffer para imprevistos.", "Marcos semanais mantêm o plano visível e ajustável."]},
  {"type": "next_step", "text": "Você completou o módulo de quitação de dívidas. Quando estiver pronto, avance para a trilha de investimentos e descubra como colocar o dinheiro que sobrou para trabalhar a seu favor."}
]'::jsonb
WHERE id = '30000000-0000-4000-8000-000000000205';


-- =============================================================================
-- TRACK 3: Começando a Investir / Module: Núcleo do primeiro investimento
-- =============================================================================

-- Lesson 11: reserva_antes_risco (article, beginner, 14min)
UPDATE public.education_lessons
SET content_blocks = '[
  {"type": "heading", "level": 2, "text": "Por que a reserva vem primeiro"},
  {"type": "paragraph", "text": "Investir sem reserva de emergência é como construir um prédio sem fundação. Pode funcionar por um tempo, mas qualquer imprevisto — perda de emprego, problema de saúde, reparo urgente — força você a resgatar investimentos no pior momento possível. Vender um título antes do vencimento, liquidar uma posição em queda ou sacar de um fundo com carência gera perda real que poderia ser evitada com dinheiro líquido separado."},
  {"type": "glossary_link", "term_slug": "fundo_emergencia", "inline_definition": "Reserva líquida para imprevistos, mantida em ativo de resgate imediato e baixa volatilidade."},
  {"type": "glossary_link", "term_slug": "liquidez", "inline_definition": "Facilidade para converter um ativo em dinheiro sem perda desproporcional de valor."},
  {"type": "paragraph", "text": "O tamanho ideal da reserva depende da sua estabilidade de renda. Profissionais CLT com empregador sólido podem mirar 3 a 6 meses de gastos essenciais. Autônomos, comissionados ou quem tem renda variável devem considerar 6 a 12 meses. O número exato importa menos que ter algo. Uma reserva de 1 mês já protege contra imprevistos menores. Comece com o que for possível e vá construindo."},
  {"type": "heading", "level": 2, "text": "Onde guardar a reserva"},
  {"type": "paragraph", "text": "A reserva de emergência tem um único requisito inegociável: liquidez imediata com preservação de valor nominal. Isso elimina ações, fundos imobiliários, criptomoedas e qualquer ativo que possa valer menos no dia que você precisar resgatar. As opções mais comuns são Tesouro Selic (liquidez D+1 útil) e CDBs com liquidez diária de bancos cobertos pelo FGC. A poupança também funciona, apesar de render menos, porque o resgate é instantâneo."},
  {"type": "glossary_link", "term_slug": "tesouro_selic", "inline_definition": "Título público pós-fixado com foco em liquidez e preservação de valor nominal — resgate em D+1 útil."},
  {"type": "callout", "variant": "tip", "title": "Não otimize a reserva", "text": "A reserva não é investimento — é seguro. Não busque a melhor rentabilidade para ela. Busque o resgate mais rápido e confiável. Se render 100% do CDI com liquidez diária, está excelente."},
  {"type": "key_point", "text": "Investir sem reserva expõe você a resgates forçados nos piores momentos — a perda pode ser maior que o ganho acumulado."},
  {"type": "key_point", "text": "O tamanho mínimo da reserva depende da estabilidade da sua renda: 3-6 meses para CLT, 6-12 meses para autônomos."},
  {"type": "summary", "points": ["Reserva de emergência é pré-requisito, não opcional.", "Sem ela, imprevistos forçam resgates em momentos desfavoráveis.", "Priorize liquidez e preservação de valor, não rentabilidade.", "Tamanho: 3-6 meses (CLT) ou 6-12 meses (renda variável).", "Comece com qualquer valor — 1 mês de reserva já protege contra imprevistos menores."]},
  {"type": "next_step", "text": "Na próxima lição, você vai entender por que dinheiro parado perde valor e o que a inflação tem a ver com suas decisões de investimento.", "lesson_slug": "inflacao_poder_compra"}
]'::jsonb
WHERE id = '30000000-0000-4000-8000-000000000301';


-- Lesson 12: inflacao_poder_compra (article, beginner, 16min)
UPDATE public.education_lessons
SET content_blocks = '[
  {"type": "heading", "level": 2, "text": "O preço de não fazer nada"},
  {"type": "paragraph", "text": "Inflação é o aumento generalizado de preços ao longo do tempo. Quando o IPCA marca 5% ao ano, significa que, em média, o que custava R$ 100 em janeiro custa R$ 105 em dezembro. O efeito prático é que dinheiro parado perde poder de compra. R$ 10.000 guardados debaixo do colchão compram menos a cada ano que passa. Não é que o dinheiro diminuiu — é que os preços subiram e o mesmo valor compra menos coisas."},
  {"type": "glossary_link", "term_slug": "ipca", "inline_definition": "Índice oficial de inflação do Brasil, medido mensalmente pelo IBGE. É a referência para metas de inflação e títulos indexados."},
  {"type": "paragraph", "text": "Isso cria uma situação contraintuitiva: guardar dinheiro sem investir é, na prática, perder dinheiro. Quem deixa R$ 50.000 parados por 10 anos em uma economia com inflação média de 5% ao ano chega ao final com o poder de compra de aproximadamente R$ 30.000 de hoje. A conta é silenciosa e não aparece no extrato, mas o efeito é real na hora de pagar as contas."},
  {"type": "heading", "level": 2, "text": "Rendimento nominal vs rendimento real"},
  {"type": "paragraph", "text": "Quando um investimento rende 10% ao ano e a inflação foi 5%, o ganho real é aproximadamente 5% — não 10%. Essa distinção entre rendimento nominal (o número bruto) e rendimento real (descontada a inflação) é fundamental para avaliar qualquer investimento. A poupança, por exemplo, pode ter rendimento nominal positivo e rendimento real próximo de zero ou negativo, dependendo do cenário de juros e inflação."},
  {"type": "glossary_link", "term_slug": "selic", "inline_definition": "Taxa básica de juros da economia brasileira — influencia diretamente a remuneração de investimentos pós-fixados."},
  {"type": "callout", "variant": "example", "title": "Simulação simples", "text": "Investimento A rende 12% ao ano (nominal). Inflação no período: 6%. Rendimento real: aproximadamente 6%. Investimento B rende 8% ao ano (nominal). Inflação: 6%. Rendimento real: aproximadamente 2%. A diferença real entre A e B é de 4 pontos percentuais — não 4%."},
  {"type": "key_point", "text": "Rendimento que interessa é o real (descontada a inflação). 10% nominal com 5% de inflação equivale a ~5% de ganho efetivo."},
  {"type": "callout", "variant": "warning", "title": "Ilusão monetária", "text": "Ver o saldo da conta subir não significa que seu patrimônio cresceu. Se o saldo subiu 5% e os preços subiram 7%, você ficou mais pobre em termos de poder de compra."},
  {"type": "key_point", "text": "Dinheiro parado é dinheiro perdendo valor. Investir minimamente é uma defesa contra a erosão inflacionária."},
  {"type": "summary", "points": ["Inflação faz o dinheiro parado perder poder de compra silenciosamente.", "R$ 50.000 parados por 10 anos com 5% de inflação equivalem a ~R$ 30.000 de hoje.", "Rendimento real = rendimento nominal - inflação (aproximação).", "A poupança pode ter rendimento real próximo de zero em certos cenários.", "Investir é defesa contra a inflação, não apenas busca de lucro."]},
  {"type": "next_step", "text": "Agora que você entende o custo de não investir, a próxima lição apresenta os instrumentos de renda fixa mais acessíveis e seus indexadores.", "lesson_slug": "renda_fixa_basica"}
]'::jsonb
WHERE id = '30000000-0000-4000-8000-000000000302';


-- Lesson 13: renda_fixa_basica (article, beginner, 18min)
UPDATE public.education_lessons
SET content_blocks = '[
  {"type": "heading", "level": 2, "text": "Os três tipos de indexação"},
  {"type": "paragraph", "text": "Renda fixa não significa retorno fixo — significa que as regras de remuneração são definidas no momento da compra. Existem três grandes grupos de indexação: pós-fixado (atrelado a uma taxa que varia, como o CDI ou a Selic), prefixado (taxa definida e imutável até o vencimento) e indexado à inflação (IPCA + uma taxa fixa). Cada um se comporta de forma diferente dependendo do cenário econômico, e entender essa diferença é a base para qualquer decisão de investimento em renda fixa."},
  {"type": "glossary_link", "term_slug": "cdi", "inline_definition": "Taxa de referência usada entre bancos. Muitos CDBs e fundos DI rendem uma porcentagem do CDI."},
  {"type": "paragraph", "text": "Pós-fixados acompanham a taxa de juros do momento. Quando a Selic sobe, eles pagam mais. Quando cai, pagam menos. São ideais para reserva de emergência e objetivos de curto prazo porque o valor nominal quase nunca cai. Prefixados travam a taxa no momento da compra. Se você compra um CDB prefixado a 12% ao ano e a Selic cai para 8%, seu investimento continua rendendo 12% — excelente. Mas se a Selic sobe para 15%, você fica preso a 12%. Indexados à inflação (IPCA+) garantem proteção contra inflação mais uma taxa real. São indicados para objetivos de longo prazo onde preservar poder de compra é essencial."},
  {"type": "heading", "level": 2, "text": "Instrumentos mais acessíveis"},
  {"type": "glossary_link", "term_slug": "cdb", "inline_definition": "Certificado de Depósito Bancário: título de renda fixa emitido por bancos, com proteção do FGC dentro do limite regulatório."},
  {"type": "paragraph", "text": "Os títulos públicos do Tesouro Direto são o ponto de entrada mais seguro: Tesouro Selic (pós-fixado, boa liquidez), Tesouro Prefixado (taxa travada) e Tesouro IPCA+ (inflação + taxa real). CDBs de bancos médios costumam pagar mais que os de bancos grandes, com proteção do FGC até o limite regulatório. LCIs e LCAs têm isenção de IR para pessoa física, mas atenção ao prazo de carência — nem sempre têm liquidez imediata."},
  {"type": "glossary_link", "term_slug": "tesouro_ipca_plus", "inline_definition": "Título público que paga inflação (IPCA) mais uma taxa fixa, ideal para objetivos de longo prazo."},
  {"type": "glossary_link", "term_slug": "marcacao_mercado", "inline_definition": "Ajuste do valor de um título ao preço de mercado antes do vencimento — pode causar oscilação temporária no saldo."},
  {"type": "callout", "variant": "warning", "title": "Marcação a mercado", "text": "Títulos prefixados e IPCA+ podem mostrar valor negativo antes do vencimento por causa da marcação a mercado. Isso não significa perda se você segura até o vencimento. Mas se precisar resgatar antes, pode vender por menos do que pagou. Por isso, alinhe o prazo do título com o prazo do objetivo."},
  {"type": "key_point", "text": "Renda fixa tem três lógicas: pós-fixado (acompanha juros), prefixado (taxa travada) e inflação+ (protege poder de compra)."},
  {"type": "key_point", "text": "Alinhe o prazo do título com o prazo do seu objetivo. Resgatar antes do vencimento pode gerar perda."},
  {"type": "summary", "points": ["Renda fixa define regras na compra: pós-fixado, prefixado ou inflação+.", "Pós-fixado: ideal para curto prazo e reserva (acompanha a Selic/CDI).", "Prefixado: trava a taxa, bom quando juros vão cair.", "IPCA+: protege poder de compra no longo prazo.", "Alinhe o prazo do investimento ao prazo do objetivo para evitar perdas por marcação a mercado."]},
  {"type": "next_step", "text": "Na próxima lição, você vai entender a relação entre risco, retorno e horizonte de tempo — o triângulo que guia toda decisão de investimento.", "lesson_slug": "risco_retorno_horizonte"}
]'::jsonb
WHERE id = '30000000-0000-4000-8000-000000000303';


-- Lesson 14: risco_retorno_horizonte (article, intermediate, 14min)
UPDATE public.education_lessons
SET content_blocks = '[
  {"type": "heading", "level": 2, "text": "O triângulo risco-retorno-horizonte"},
  {"type": "paragraph", "text": "Toda decisão de investimento envolve três variáveis inseparáveis: risco, retorno esperado e horizonte de tempo. Não é possível maximizar uma sem afetar as outras. Quem quer retorno alto com horizonte curto precisa aceitar risco alto. Quem quer risco baixo com horizonte curto precisa aceitar retorno modesto. E quem tem horizonte longo pode tolerar mais volatilidade porque o tempo dilui oscilações de curto prazo. Entender esse triângulo evita duas armadilhas comuns: esperar retorno de renda variável em produtos conservadores e entrar em pânico com oscilações normais de ativos de longo prazo."},
  {"type": "glossary_link", "term_slug": "volatilidade", "inline_definition": "Medida de variação de preço ao longo do tempo. Quanto maior a volatilidade, maior a oscilação do saldo no curto prazo."},
  {"type": "paragraph", "text": "Risco, no contexto de investimentos, não é sinônimo de perda. É a probabilidade e a magnitude de desvios em relação ao retorno esperado — para cima ou para baixo. Um investimento de alto risco pode ter retorno muito acima ou muito abaixo do esperado. Um de baixo risco se comporta de forma previsível. A questão não é evitar risco a todo custo, mas assumir risco proporcional ao seu horizonte e à sua capacidade de absorver perdas temporárias."},
  {"type": "heading", "level": 2, "text": "Horizonte define o cardápio"},
  {"type": "paragraph", "text": "Para dinheiro que você precisa em menos de 1 ano, renda fixa pós-fixada é a escolha natural: previsível, líquida e sem oscilação relevante. Para 1 a 5 anos, títulos prefixados e IPCA+ entram no cardápio, com atenção ao prazo de vencimento alinhado ao objetivo. Acima de 5 anos, a janela se abre para exposição gradual a ativos de maior risco — fundos multimercado, fundos imobiliários, ações — desde que a parcela de risco caiba na sua tolerância e não comprometa objetivos de curto prazo."},
  {"type": "glossary_link", "term_slug": "perfil_investidor", "inline_definition": "Avaliação que conecta seus objetivos, horizonte e tolerância a perdas com os tipos de investimento adequados."},
  {"type": "glossary_link", "term_slug": "diversificacao", "inline_definition": "Distribuir recursos entre ativos diferentes para reduzir dependência de um único fator de risco."},
  {"type": "callout", "variant": "info", "title": "Perfil de investidor não é rótulo fixo", "text": "Seu perfil muda conforme sua vida muda. Quem é conservador com dinheiro de curto prazo pode ser moderado com dinheiro de longo prazo. Avalie perfil por objetivo, não como identidade global."},
  {"type": "key_point", "text": "Risco, retorno e horizonte são inseparáveis. Não existe retorno alto com risco baixo e horizonte curto."},
  {"type": "key_point", "text": "O horizonte de tempo define quais ativos fazem sentido. Dinheiro de curto prazo não pertence a ativos voláteis."},
  {"type": "callout", "variant": "tip", "title": "Regra prática", "text": "Antes de investir em qualquer ativo, pergunte: quando vou precisar desse dinheiro? Se a resposta é ''talvez em 6 meses'', elimine tudo que oscila significativamente."},
  {"type": "summary", "points": ["Risco, retorno e horizonte formam um triângulo inseparável.", "Risco não é perda — é a magnitude dos desvios em relação ao retorno esperado.", "Horizonte curto (<1 ano): pós-fixado. Médio (1-5 anos): prefixado/IPCA+. Longo (>5 anos): abre para risco.", "Avalie perfil de investidor por objetivo, não como rótulo fixo.", "Antes de investir, defina quando vai precisar do dinheiro."]},
  {"type": "next_step", "text": "Na última lição, você vai definir seu primeiro aporte recorrente — pequeno, auditável e sustentável.", "lesson_slug": "primeiro_aporte_auditavel"}
]'::jsonb
WHERE id = '30000000-0000-4000-8000-000000000304';


-- Lesson 15: primeiro_aporte_auditavel (checklist, beginner, 12min)
UPDATE public.education_lessons
SET content_blocks = '[
  {"type": "heading", "level": 2, "text": "Começar pequeno, manter consistente"},
  {"type": "paragraph", "text": "O primeiro aporte não precisa ser grande. Precisa existir. Esperar ter ''uma quantia relevante'' para começar a investir é uma das armadilhas mais comuns — e mais caras, porque cada mês de espera é um mês sem o efeito dos juros compostos trabalhando a seu favor. O objetivo desta lição é definir um valor recorrente que caiba no seu orçamento sem comprometer a reserva e que possa ser auditado mês a mês."},
  {"type": "glossary_link", "term_slug": "pay_yourself_first", "inline_definition": "Automatizar o aporte para investimentos antes de consumir o restante da renda."},
  {"type": "paragraph", "text": "O Tesouro Direto permite aportes a partir de aproximadamente R$ 30. CDBs com liquidez diária começam em R$ 1 em algumas plataformas. O valor mínimo deixou de ser barreira há anos. O que importa é a recorrência e a auditabilidade: saber exatamente quanto investiu em cada mês e poder verificar se o plano está sendo seguido. Use o checklist abaixo para estruturar seu primeiro aporte."},
  {"type": "checklist", "title": "Estrutura do primeiro aporte recorrente", "items": [
    {"id": "aporte-1", "label": "Definir o valor mensal de aporte que não compromete reserva nem gastos essenciais", "help": "Se não souber quanto, comece com 5% da renda líquida. Ajuste após 3 meses."},
    {"id": "aporte-2", "label": "Escolher o ativo do primeiro aporte (Tesouro Selic ou CDB com liquidez diária recomendados para iniciantes)"},
    {"id": "aporte-3", "label": "Configurar transferência automática no dia do pagamento para a conta de investimentos"},
    {"id": "aporte-4", "label": "Registrar o aporte do primeiro mês com data, valor e ativo escolhido"},
    {"id": "aporte-5", "label": "Definir data de revisão trimestral para avaliar se o valor pode ser aumentado"},
    {"id": "aporte-6", "label": "Anotar a regra pessoal: em quais situações é aceitável pausar o aporte (e só nessas)"}
  ]},
  {"type": "glossary_link", "term_slug": "tesouro_selic", "inline_definition": "Título público pós-fixado atrelado à taxa Selic, com liquidez em D+1 — opção segura para começar."},
  {"type": "callout", "variant": "tip", "title": "Automatize para eliminar decisão mensal", "text": "Se o aporte depende de você lembrar e decidir todo mês, vai competir com outros desejos. Automatize a transferência e o investimento se a plataforma permitir. Decisão boa tomada uma vez supera motivação variável."},
  {"type": "key_point", "text": "O primeiro aporte não precisa ser grande — precisa ser recorrente e auditável."},
  {"type": "key_point", "text": "Defina regras claras sobre quando é aceitável pausar. Sem regra, qualquer gasto extra vira motivo para pular."},
  {"type": "callout", "variant": "warning", "title": "Não invista a reserva", "text": "O dinheiro de aporte e o dinheiro de reserva de emergência são separados. Nunca invista em ativos de risco o valor que deveria estar líquido para imprevistos."},
  {"type": "summary", "points": ["Comece com qualquer valor recorrente — o hábito importa mais que o montante.", "Tesouro Selic e CDB com liquidez diária são opções seguras para o primeiro aporte.", "Automatize transferência e investimento para eliminar a decisão mensal.", "Registre cada aporte para auditoria pessoal.", "Defina regras claras de quando pausar — sem regra, tudo vira desculpa.", "Revisão trimestral para avaliar aumento do valor."]},
  {"type": "next_step", "text": "Parabéns por completar o módulo de primeiro investimento. Você agora tem reserva, entende inflação, conhece os instrumentos básicos e tem um plano de aporte recorrente. Continue aprendendo para diversificar com confiança."}
]'::jsonb
WHERE id = '30000000-0000-4000-8000-000000000305';

COMMIT;

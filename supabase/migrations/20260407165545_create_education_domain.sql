BEGIN;

CREATE TABLE IF NOT EXISTS public.education_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.education_tracks (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT education_modules_track_slug_unique UNIQUE (track_id, slug)
);

CREATE TABLE IF NOT EXISTS public.education_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.education_modules (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'video', 'exercise', 'quiz', 'checklist')),
  learning_objective TEXT,
  estimated_minutes INTEGER,
  prerequisite_lesson_slugs TEXT[] NOT NULL DEFAULT '{}'::text[],
  cta JSONB CHECK (
    cta IS NULL
    OR jsonb_typeof(cta) = 'object'
  ),
  difficulty TEXT CHECK (
    difficulty IS NULL
    OR difficulty IN ('beginner', 'intermediate', 'advanced')
  ),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT education_lessons_module_slug_unique UNIQUE (module_id, slug)
);

CREATE TABLE IF NOT EXISTS public.education_glossary_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  term TEXT NOT NULL,
  short_definition TEXT NOT NULL,
  extended_text TEXT,
  example TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.education_lessons (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    status IN ('not_started', 'in_progress', 'completed', 'skipped')
  ),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  confidence_rating SMALLINT CHECK (
    confidence_rating IS NULL
    OR (confidence_rating >= 1 AND confidence_rating <= 5)
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT education_user_progress_user_lesson_unique UNIQUE (user_id, lesson_id),
  CONSTRAINT education_user_progress_completed_requires_completed_at CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed' AND completed_at IS NULL)
  ),
  CONSTRAINT education_user_progress_active_requires_started_at CHECK (
    status NOT IN ('in_progress', 'completed')
    OR started_at IS NOT NULL
  ),
  CONSTRAINT education_user_progress_not_started_has_no_activity CHECK (
    status <> 'not_started'
    OR (started_at IS NULL AND completed_at IS NULL AND last_viewed_at IS NULL)
  ),
  CONSTRAINT education_user_progress_skipped_has_started_without_completion CHECK (
    status <> 'skipped'
    OR (started_at IS NOT NULL AND completed_at IS NULL)
  ),
  CONSTRAINT education_user_progress_started_before_last_viewed CHECK (
    started_at IS NULL
    OR last_viewed_at IS NULL
    OR started_at <= last_viewed_at
  ),
  CONSTRAINT education_user_progress_started_before_completed CHECK (
    started_at IS NULL
    OR completed_at IS NULL
    OR started_at <= completed_at
  )
);

CREATE TABLE IF NOT EXISTS public.education_user_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  current_stage TEXT,
  learning_gaps TEXT[] NOT NULL DEFAULT '{}'::text[],
  preferred_tone TEXT,
  profile_completeness NUMERIC(4, 3) NOT NULL DEFAULT 0 CHECK (
    profile_completeness >= 0::numeric
    AND profile_completeness <= 1::numeric
  ),
  first_run_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investor_profile_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  profile_key TEXT CHECK (
    profile_key IS NULL
    OR profile_key IN ('conservative', 'moderate', 'balanced', 'growth', 'aggressive')
  ),
  confidence NUMERIC(4, 3) CHECK (
    confidence IS NULL
    OR (confidence >= 0::numeric AND confidence <= 1::numeric)
  ),
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_daily_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  dedupe_key TEXT NOT NULL,
  deterministic_reason TEXT NOT NULL,
  narrative_text TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'whatsapp', 'push', 'email')),
  track_slug TEXT REFERENCES public.education_tracks (slug) ON DELETE SET NULL,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT education_daily_tips_user_dedupe_unique UNIQUE (user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_education_modules_track_id ON public.education_modules (track_id);
CREATE INDEX IF NOT EXISTS idx_education_lessons_module_id ON public.education_lessons (module_id);
CREATE INDEX IF NOT EXISTS idx_education_user_progress_user_id ON public.education_user_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_education_user_progress_lesson_id ON public.education_user_progress (lesson_id);
CREATE INDEX IF NOT EXISTS idx_investor_profile_assessments_user_effective ON public.investor_profile_assessments (
  user_id,
  effective_at DESC
);
CREATE INDEX IF NOT EXISTS idx_education_daily_tips_user_created ON public.education_daily_tips (user_id, created_at DESC);

ALTER TABLE public.education_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_glossary_terms ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'education_tracks' AND policyname = 'education_tracks_select_authenticated') THEN
    CREATE POLICY education_tracks_select_authenticated ON public.education_tracks FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'education_modules' AND policyname = 'education_modules_select_authenticated') THEN
    CREATE POLICY education_modules_select_authenticated ON public.education_modules FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'education_lessons' AND policyname = 'education_lessons_select_authenticated') THEN
    CREATE POLICY education_lessons_select_authenticated ON public.education_lessons FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'education_glossary_terms' AND policyname = 'education_glossary_terms_select_authenticated') THEN
    CREATE POLICY education_glossary_terms_select_authenticated ON public.education_glossary_terms FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

ALTER TABLE public.education_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_profile_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_daily_tips ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'education_user_progress' AND policyname = 'education_user_progress_select_own') THEN
    CREATE POLICY education_user_progress_select_own ON public.education_user_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'education_user_progress' AND policyname = 'education_user_progress_insert_own') THEN
    CREATE POLICY education_user_progress_insert_own ON public.education_user_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'education_user_progress' AND policyname = 'education_user_progress_update_own') THEN
    CREATE POLICY education_user_progress_update_own ON public.education_user_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'education_user_progress' AND policyname = 'education_user_progress_delete_own') THEN
    CREATE POLICY education_user_progress_delete_own ON public.education_user_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'education_user_profile' AND policyname = 'education_user_profile_select_own') THEN
    CREATE POLICY education_user_profile_select_own ON public.education_user_profile FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investor_profile_assessments' AND policyname = 'investor_profile_assessments_select_own') THEN
    CREATE POLICY investor_profile_assessments_select_own ON public.investor_profile_assessments FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investor_profile_assessments' AND policyname = 'investor_profile_assessments_insert_own') THEN
    CREATE POLICY investor_profile_assessments_insert_own ON public.investor_profile_assessments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'education_daily_tips' AND policyname = 'education_daily_tips_select_own') THEN
    CREATE POLICY education_daily_tips_select_own ON public.education_daily_tips FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'education_tracks_updated_at') THEN
    CREATE TRIGGER education_tracks_updated_at BEFORE UPDATE ON public.education_tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'education_modules_updated_at') THEN
    CREATE TRIGGER education_modules_updated_at BEFORE UPDATE ON public.education_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'education_lessons_updated_at') THEN
    CREATE TRIGGER education_lessons_updated_at BEFORE UPDATE ON public.education_lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'education_glossary_terms_updated_at') THEN
    CREATE TRIGGER education_glossary_terms_updated_at BEFORE UPDATE ON public.education_glossary_terms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'education_user_progress_updated_at') THEN
    CREATE TRIGGER education_user_progress_updated_at BEFORE UPDATE ON public.education_user_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'education_user_profile_updated_at') THEN
    CREATE TRIGGER education_user_profile_updated_at BEFORE UPDATE ON public.education_user_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

INSERT INTO public.education_tracks (id, slug, title, description, sort_order)
VALUES
  ('10000000-0000-4000-8000-000000000101'::uuid,'organizacao_basica','Organização Básica','Fundamentos para enxergar o dinheiro com clareza: fluxo real, cadência de revisão e contas com função definida.',1),
  ('10000000-0000-4000-8000-000000000102'::uuid,'eliminando_dividas','Eliminando Dívidas','Ordem de pagamento, negociação e uso consciente de crédito para sair do ciclo de juros sem atalhos perigosos.',2),
  ('10000000-0000-4000-8000-000000000103'::uuid,'comecando_a_investir','Começando a Investir','Do resgate da segurança à primeira exposição a risco: horizonte, indexadores e hábitos de aporte auditáveis.',3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.education_modules (id, track_id, slug, title, description, sort_order, estimated_minutes)
VALUES
  ('20000000-0000-4000-8000-000000000101'::uuid,'10000000-0000-4000-8000-000000000101'::uuid,'nucleo','Núcleo da organização','Sequência mínima para estabilizar o controle financeiro antes de metas mais ambiciosas.',1,120),
  ('20000000-0000-4000-8000-000000000102'::uuid,'10000000-0000-4000-8000-000000000102'::uuid,'nucleo','Núcleo da quitação','Como priorizar dívidas e evitar recaídas enquanto você reduz o custo financeiro.',1,150),
  ('20000000-0000-4000-8000-000000000103'::uuid,'10000000-0000-4000-8000-000000000103'::uuid,'nucleo','Núcleo do primeiro investimento','Pré-requisitos de segurança e conceitos essenciais antes do primeiro aporte.',1,140)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.education_lessons (id,module_id,slug,title,summary,content_type,learning_objective,estimated_minutes,difficulty,sort_order)
VALUES
  ('30000000-0000-4000-8000-000000000101'::uuid,'20000000-0000-4000-8000-000000000101'::uuid,'organizacao_visao_geral','Por que organização vem antes de "ganhar mais"','Sem visão do fluxo real, qualquer aumento de renda vira gasto invisível. Este módulo ancora o hábito de medir antes de otimizar.','article','Explicar por que clareza operacional precede aumento de renda como alavanca de resultado.',12,'beginner',1),
  ('30000000-0000-4000-8000-000000000102'::uuid,'20000000-0000-4000-8000-000000000101'::uuid,'mapa_entradas_saidas','Mapeando entradas e saídas reais','Construir uma fotografia honesta do mês: o que entrou, o que saiu e o que costuma ser subestimado.','checklist','Registrar entradas e saídas com critérios reproduzíveis, reduzindo viés de memória.',15,'beginner',2),
  ('30000000-0000-4000-8000-000000000103'::uuid,'20000000-0000-4000-8000-000000000101'::uuid,'funcao_de_cada_conta','Separando contas: operacional, reserva e objetivos','Definir papéis para cada saldo evita misturar gasto do dia a dia com proteção e metas.','article','Aplicar uma estrutura mínima de contas ou subcontas alinhada a função, não a instituição.',14,'beginner',3),
  ('30000000-0000-4000-8000-000000000104'::uuid,'20000000-0000-4000-8000-000000000101'::uuid,'cadencia_revisao','Cadência de revisão: semanal vs mensal sem culpa','Escolher ritmo sustentável de revisão e o que inspecionar em cada sessão curta.','checklist','Definir cadência de revisão compatível com a vida real e um roteiro de checagem.',10,'beginner',4),
  ('30000000-0000-4000-8000-000000000105'::uuid,'20000000-0000-4000-8000-000000000101'::uuid,'checklist_primeiro_mes','Checklist do primeiro mês com método mínimo viável','Um plano enxuto para o primeiro ciclo: categorias essenciais, alertas e ajuste fino.','checklist','Executar um primeiro mês completo com escopo mínimo e mensurável.',18,'beginner',5),
  ('30000000-0000-4000-8000-000000000201'::uuid,'20000000-0000-4000-8000-000000000102'::uuid,'custo_efetivo_dividas','Dívida cara, média e barata: ordem de ataque','Comparar custos efetivos e entender por que a ordem de pagamento altera o tempo total de quitação.','article','Classificar dívidas por custo e risco e definir ordem de pagamento fundamentada.',16,'beginner',1),
  ('30000000-0000-4000-8000-000000000202'::uuid,'20000000-0000-4000-8000-000000000102'::uuid,'minimo_vs_aceleracao','Mínimo obrigatório vs aceleração','Equilibrar pagamentos mínimos para não cair em atraso com aportes extras onde o impacto é maior.','article','Construir um plano que preserve adimplência e maximize redução de juros.',14,'intermediate',2),
  ('30000000-0000-4000-8000-000000000203'::uuid,'20000000-0000-4000-8000-000000000102'::uuid,'renegociacao_portabilidade','Renegociação e portabilidade: comparar propostas','Checklist para comparar propostas de credores e evitar troca aparentemente barata que alonga o prazo.','checklist','Avaliar propostas de renegociação com métricas comparáveis (prazo, parcela, custo total).',18,'intermediate',3),
  ('30000000-0000-4000-8000-000000000204'::uuid,'20000000-0000-4000-8000-000000000102'::uuid,'cartao_fatura_rotativo','Cartão: fatura total, parcelado e rotativo','Entender os três modos de uso do cartão e por que o rotativo destrói previsibilidade.','article','Diferenciar modos de uso do cartão e priorizar comportamentos que reduzem custo.',15,'beginner',4),
  ('30000000-0000-4000-8000-000000000205'::uuid,'20000000-0000-4000-8000-000000000102'::uuid,'plano_quitacao_realista','Plano de quitação com meta e data','Montar uma linha do tempo realista com buffer para imprevistos e critérios de sucesso semanais.','exercise','Formalizar meta de quitação com data, valor e marcos de acompanhamento.',20,'intermediate',5),
  ('30000000-0000-4000-8000-000000000301'::uuid,'20000000-0000-4000-8000-000000000103'::uuid,'reserva_antes_risco','Reserva de emergência antes de arriscar patrimônio','Por que liquidez e previsibilidade vêm antes de exposição a volatilidade.','article','Justificar reserva em dinheiro líquido como pré-requisito de investimento de risco.',14,'beginner',1),
  ('30000000-0000-4000-8000-000000000302'::uuid,'20000000-0000-4000-8000-000000000103'::uuid,'inflacao_poder_compra','Inflação e poder de compra','Relação entre IPCA, expectativas e por que "parado na poupança" pode significar perda de poder de compra.','article','Explicar inflação como risco de longo prazo para patrimônio conservador demais.',16,'beginner',2),
  ('30000000-0000-4000-8000-000000000303'::uuid,'20000000-0000-4000-8000-000000000103'::uuid,'renda_fixa_basica','Renda fixa básica: prazos e indexadores','Diferença entre prefixado, pós-fixado e inflação; o que é marcação a mercado em títulos de renda fixa.','article','Nomear indexadores e prazos e relacionar com objetivo e horizonte.',18,'beginner',3),
  ('30000000-0000-4000-8000-000000000304'::uuid,'20000000-0000-4000-8000-000000000103'::uuid,'risco_retorno_horizonte','Risco, retorno e horizonte','O triângulo que define expectativa realista e evita comparações injustas entre ativos.','article','Conectar horizonte de uso do dinheiro com tolerância a oscilação.',14,'intermediate',4),
  ('30000000-0000-4000-8000-000000000305'::uuid,'20000000-0000-4000-8000-000000000103'::uuid,'primeiro_aporte_auditavel','Primeiro aporte: pequeno, recorrente e auditável','Como começar com valores que não comprometem a reserva e criam disciplina mensurável.','checklist','Definir primeiro aporte recorrente com trilha de auditoria e revisão trimestral.',12,'beginner',5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.education_glossary_terms (slug, term, short_definition, extended_text, example, tags, sort_order)
VALUES
  ('selic','SELIC','Taxa básica de juros da economia brasileira, definida pelo Copom.','Acompanhar a SELIC ajuda a entender o custo do crédito e a remuneração de parte da renda fixa atrelada ao CDI.','Quando a SELIC sobe, em geral a remuneração de títulos pós-fixados segue o movimento, enquanto o crédito novo tende a ficar mais caro.',ARRAY['juros','macro','brasil'],1),
  ('cdi','CDI','Taxa de referência usada entre bancos em operações de um dia; proxy comum para renda fixa de liquidez diária.','Muitos CDBs e fundos DI rendem uma porcentagem do CDI; comparar sempre o percentual e o prazo de resgate.','Um CDB que paga 100% do CDI com liquidez diária costuma ser comparado a outros do mesmo tipo pelo mesmo critério.',ARRAY['renda_fixa','pós-fixado'],2),
  ('ipca','IPCA','Índice oficial de inflação do Brasil, medido pelo IBGE.','Ativos atrelados ao IPCA protegem o poder de compra ao longo do tempo, mas podem oscilar no curto prazo (marcação a mercado).','Tesouro IPCA+ associa pagamentos à inflação acumulada mais uma taxa fixa contratada na compra.',ARRAY['inflação','macro'],3),
  ('cdb','CDB','Certificado de Depósito Bancário: título de renda fixa emitido por bancos.','O risco de crédito depende do tamanho e perfil do banco emissor; o FGC pode proteger até o limite regulatório por instituição.','CDB de banco médio com cobertura do FGC dentro do limite costuma ser comparado por prazo, liquidez e % do CDI.',ARRAY['renda_fixa','bancos'],4),
  ('lci','LCI','Letra de Crédito Imobiliário: título isento de IR para pessoa física, sujeito a regras e prazos.','Tem caráter incentivado; avalie prazo de carência e cenário de resgate antes de alocar reserva de emergência.','Uma LCI com carência de 90 dias não substitui conta para imprevistos de curto prazo.',ARRAY['renda_fixa','fiscal'],5),
  ('lca','LCA','Letra de Crédito do Agronegócio: título isento de IR para pessoa física, com regras próprias.','Similar à LCI em espírito fiscal, com lastros diferentes; ainda assim observe prazo, risco do emissor e liquidez.',NULL,ARRAY['renda_fixa','fiscal'],6),
  ('tesouro_selic','Tesouro Selic','Título público pós-fixado atrelado à taxa Selic, com foco em liquidez e preservação de valor nominal.','Útil para reserva e etapas de transição; a rentabilidade real depende da inflação do período.',NULL,ARRAY['tesouro','liquidez'],7),
  ('tesouro_ipca_plus','Tesouro IPCA+','Título público que paga inflação (IPCA) acrescida de uma taxa fixa definida na compra.','Pode oscilar antes do vencimento por marcação a mercado; o horizonte reduz o ruído de curto prazo.',NULL,ARRAY['tesouro','inflação'],8),
  ('marcacao_mercado','Marcação a mercado','Ajuste do valor de um título ao preço de mercado antes do vencimento.','Em títulos indexados, quedas temporárias no preço de mercado não significam necessariamente perda se você segura até o fluxo contratual.',NULL,ARRAY['renda_fixa','volatilidade'],9),
  ('liquidez','Liquidez','Facilidade e rapidez para converter um ativo em dinheiro sem perda desproporcional de valor.','Reserva de emergência deve priorizar liquidez; investimentos de longo prazo podem aceitar prazos maiores.',NULL,ARRAY['basico','reserva'],10),
  ('diversificacao','Diversificação','Distribuir recursos entre fontes de risco e retorno diferentes para reduzir dependência de um único fator.','Não elimina risco de mercado, mas mitiga impacto de erro ou choque concentrado.',NULL,ARRAY['carteira','risco'],11),
  ('volatilidade','Volatilidade','Medida de variação de preço ao longo do tempo; ativos de renda variável costumam apresentar mais volatilidade.','Horizonte longo absorve parte da oscilação; horizonte curto exige mais cautela.',NULL,ARRAY['renda_variavel','risco'],12),
  ('perfil_investidor','Perfil de investidor','Adequação entre objetivos, horizonte, capacidade de assumir perdas e conhecimento.','Suitability regulatória exige que produtos oferecidos conversem com o perfil declarado e com a análise da instituição.',NULL,ARRAY['regulatório','planejamento'],13),
  ('suitability','Suitability','Conjunto de regras para alinhar produtos financeiros ao perfil e necessidades do cliente.','Declarar perfil incorreto pode levar a recomendações inadequadas; revise após mudanças de vida ou patrimônio.',NULL,ARRAY['regulatório','compliance'],14),
  ('rotativo_cartao','Rotativo do cartão','Crédito automático quando você paga menos que a fatura total, com juros altos e capitalização frequente.','Prioridade típica de quitação antes de investimentos de médio risco.',NULL,ARRAY['crédito','dívida'],15),
  ('limite_credito','Limite de crédito','Valor máximo que a instituição autoriza usar em cartão ou linhas rotativas.','Limite alto não é patrimônio; é capacidade de endividamento com custo associado.',NULL,ARRAY['crédito','cartão'],16),
  ('score_credito','Score de crédito','Pontuação estatística usada por credores para estimar risco de inadimplência.','Pagamentos em dia e uso moderado de crédito costumam ajudar ao longo do tempo; não existe ajuste mágico de curto prazo.',NULL,ARRAY['crédito','comportamento'],17),
  ('inadimplencia','Inadimplência','Falta de pagamento nas condições contratadas, com multas, juros e impacto em cadastros de crédito.','Negociar cedo costuma preservar opções melhores do que esperar a dívida crescer silenciosamente.',NULL,ARRAY['dívida','crédito'],18),
  ('fundo_emergencia','Fundo de emergência','Reserva líquida para imprevistos de renda ou gasto, antes de assumir risco de mercado relevante.','Tamanho comum depende de estabilidade de renda e cobertura de benefícios; o importante é a função, não um número místico.',NULL,ARRAY['planejamento','reserva'],19),
  ('pay_yourself_first','Pague-se primeiro','Automatizar aporte a metas e investimentos antes de consumir o restante da renda.','Combinar com orçamento realista evita aportes irreais que viram frustração.',NULL,ARRAY['hábitos','disciplina'],20)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE public.education_tracks IS 'Trilhas de aprendizado (catálogo global).';
COMMENT ON TABLE public.education_modules IS 'Módulos ordenados dentro de cada trilha.';
COMMENT ON TABLE public.education_lessons IS 'Lições atômicas com objetivo de aprendizagem e metadados de UX.';
COMMENT ON TABLE public.education_glossary_terms IS 'Glossário financeiro para educação in-app e contexto da Ana Clara.';
COMMENT ON TABLE public.education_user_progress IS 'Progresso por lição e usuário.';
COMMENT ON TABLE public.education_user_profile IS 'Perfil educacional derivado e preferências de jornada.';
COMMENT ON TABLE public.investor_profile_assessments IS 'Histórico de questionários de suitability / perfil de investidor.';
COMMENT ON TABLE public.education_daily_tips IS 'Dicas entregues ao usuário com razão determinística auditável.';

COMMIT;;

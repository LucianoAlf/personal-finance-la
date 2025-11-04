-- =====================================================
-- PERSONAL FINANCE LA - DATABASE SCHEMA (Supabase/PostgreSQL)
-- Versão: 1.0
-- Data: Novembro 2025
-- =====================================================

-- =====================================================
-- EXTENSÕES NECESSÁRIAS
-- =====================================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habilitar funções de criptografia
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABELA: users
-- Usuários da plataforma
-- =====================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR NOT NULL UNIQUE,
  full_name VARCHAR,
  avatar_url VARCHAR,
  phone VARCHAR UNIQUE,
  whatsapp_connected BOOLEAN DEFAULT FALSE,
  couple_mode BOOLEAN DEFAULT FALSE,
  partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  monthly_savings_goal DECIMAL(10,2),
  closing_day INTEGER DEFAULT 1 CHECK (closing_day >= 1 AND closing_day <= 31),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_partner_id ON users(partner_id);

-- Comentários
COMMENT ON TABLE users IS 'Tabela de usuários da plataforma';
COMMENT ON COLUMN users.couple_mode IS 'Indica se o usuário está usando o modo casal';
COMMENT ON COLUMN users.partner_id IS 'ID do parceiro(a) quando em modo casal';
COMMENT ON COLUMN users.monthly_savings_goal IS 'Meta percentual de economia mensal';
COMMENT ON COLUMN users.closing_day IS 'Dia do mês para fechamento do ciclo financeiro';

-- =====================================================
-- TABELA: accounts
-- Contas bancárias, carteiras, investimentos
-- =====================================================

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('checking', 'savings', 'cash', 'investment', 'credit_card')),
  bank_name VARCHAR,
  initial_balance DECIMAL(10,2) DEFAULT 0,
  current_balance DECIMAL(10,2) DEFAULT 0,
  color VARCHAR DEFAULT '#6366f1',
  icon VARCHAR DEFAULT '💰',
  is_shared BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_is_active ON accounts(is_active);

-- Comentários
COMMENT ON TABLE accounts IS 'Contas bancárias, carteiras e investimentos dos usuários';
COMMENT ON COLUMN accounts.type IS 'Tipo: checking (conta corrente), savings (poupança), cash (carteira), investment (investimento), credit_card (cartão de crédito)';
COMMENT ON COLUMN accounts.is_shared IS 'Indica se é uma conta compartilhada no modo casal';

-- =====================================================
-- TABELA: categories
-- Categorias e subcategorias de transações
-- =====================================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('income', 'expense')),
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  color VARCHAR DEFAULT '#6366f1',
  icon VARCHAR DEFAULT '📊',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- Comentários
COMMENT ON TABLE categories IS 'Categorias e subcategorias para organização de transações';
COMMENT ON COLUMN categories.parent_id IS 'ID da categoria pai para criar hierarquia (subcategorias)';
COMMENT ON COLUMN categories.is_default IS 'Indica se é uma categoria padrão do sistema';

-- =====================================================
-- TABELA: transactions
-- Transações financeiras (receitas, despesas, transferências)
-- =====================================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type VARCHAR NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description VARCHAR,
  transaction_date DATE NOT NULL,
  is_paid BOOLEAN DEFAULT TRUE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_type VARCHAR CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  recurrence_end_date DATE,
  attachment_url VARCHAR,
  notes TEXT,
  source VARCHAR DEFAULT 'manual' CHECK (source IN ('manual', 'whatsapp', 'import', 'open_finance')),
  whatsapp_message_id VARCHAR,
  transfer_to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_is_paid ON transactions(is_paid);
CREATE INDEX idx_transactions_source ON transactions(source);

-- Comentários
COMMENT ON TABLE transactions IS 'Todas as transações financeiras do sistema';
COMMENT ON COLUMN transactions.type IS 'Tipo: income (receita), expense (despesa), transfer (transferência)';
COMMENT ON COLUMN transactions.is_paid IS 'Indica se a transação já foi paga/recebida';
COMMENT ON COLUMN transactions.is_recurring IS 'Indica se é uma transação recorrente';
COMMENT ON COLUMN transactions.source IS 'Origem: manual, whatsapp, import, open_finance';
COMMENT ON COLUMN transactions.transfer_to_account_id IS 'Conta de destino quando type = transfer';

-- =====================================================
-- TABELA: credit_cards
-- Cartões de crédito
-- =====================================================

CREATE TABLE credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  name VARCHAR NOT NULL,
  brand VARCHAR CHECK (brand IN ('visa', 'mastercard', 'amex', 'elo', 'hipercard', 'other')),
  last_four VARCHAR(4),
  credit_limit DECIMAL(10,2),
  closing_day INTEGER CHECK (closing_day >= 1 AND closing_day <= 31),
  due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31),
  color VARCHAR DEFAULT '#ef4444',
  icon VARCHAR DEFAULT '💳',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX idx_credit_cards_account_id ON credit_cards(account_id);
CREATE INDEX idx_credit_cards_is_active ON credit_cards(is_active);

-- Comentários
COMMENT ON TABLE credit_cards IS 'Cartões de crédito dos usuários';
COMMENT ON COLUMN credit_cards.closing_day IS 'Dia do fechamento da fatura';
COMMENT ON COLUMN credit_cards.due_day IS 'Dia do vencimento da fatura';

-- =====================================================
-- TABELA: credit_card_transactions
-- Transações no cartão de crédito
-- =====================================================

CREATE TABLE credit_card_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  installments INTEGER DEFAULT 1 CHECK (installments >= 1),
  current_installment INTEGER DEFAULT 1 CHECK (current_installment >= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_credit_card_transactions_transaction_id ON credit_card_transactions(transaction_id);
CREATE INDEX idx_credit_card_transactions_credit_card_id ON credit_card_transactions(credit_card_id);

-- Comentários
COMMENT ON TABLE credit_card_transactions IS 'Relaciona transações com cartões de crédito e parcelamento';
COMMENT ON COLUMN credit_card_transactions.installments IS 'Número total de parcelas';
COMMENT ON COLUMN credit_card_transactions.current_installment IS 'Parcela atual';

-- =====================================================
-- TABELA: goals
-- Metas financeiras
-- =====================================================

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  target_amount DECIMAL(10,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(10,2) DEFAULT 0 CHECK (current_amount >= 0),
  target_date DATE,
  icon VARCHAR DEFAULT '🎯',
  image_url VARCHAR,
  is_shared BOOLEAN DEFAULT FALSE,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);

-- Comentários
COMMENT ON TABLE goals IS 'Metas financeiras dos usuários';
COMMENT ON COLUMN goals.is_shared IS 'Indica se é uma meta compartilhada no modo casal';
COMMENT ON COLUMN goals.status IS 'Status: active (ativa), completed (concluída), cancelled (cancelada)';

-- =====================================================
-- TABELA: goal_contributions
-- Contribuições para as metas
-- =====================================================

CREATE TABLE goal_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  contribution_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_goal_contributions_goal_id ON goal_contributions(goal_id);
CREATE INDEX idx_goal_contributions_user_id ON goal_contributions(user_id);
CREATE INDEX idx_goal_contributions_date ON goal_contributions(contribution_date);

-- Comentários
COMMENT ON TABLE goal_contributions IS 'Histórico de contribuições para as metas financeiras';

-- =====================================================
-- TABELA: budgets
-- Orçamentos mensais por categoria
-- =====================================================

CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  planned_amount DECIMAL(10,2) NOT NULL CHECK (planned_amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category_id, month)
);

-- Índices
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_category_id ON budgets(category_id);
CREATE INDEX idx_budgets_month ON budgets(month);

-- Comentários
COMMENT ON TABLE budgets IS 'Planejamento de orçamento mensal por categoria';
COMMENT ON COLUMN budgets.month IS 'Primeiro dia do mês de referência (ex: 2025-11-01)';

-- =====================================================
-- TABELA: investments
-- Investimentos
-- =====================================================

CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL CHECK (type IN ('stock', 'fund', 'treasury', 'crypto', 'real_estate', 'other')),
  name VARCHAR NOT NULL,
  ticker VARCHAR,
  quantity DECIMAL(18,8),
  purchase_price DECIMAL(10,2),
  current_price DECIMAL(10,2),
  total_invested DECIMAL(10,2),
  current_value DECIMAL(10,2),
  purchase_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_investments_user_id ON investments(user_id);
CREATE INDEX idx_investments_type ON investments(type);
CREATE INDEX idx_investments_ticker ON investments(ticker);
CREATE INDEX idx_investments_is_active ON investments(is_active);

-- Comentários
COMMENT ON TABLE investments IS 'Portfólio de investimentos dos usuários';
COMMENT ON COLUMN investments.type IS 'Tipo: stock (ação), fund (fundo), treasury (tesouro direto), crypto (criptomoeda), real_estate (imóvel), other (outro)';

-- =====================================================
-- TABELA: ana_clara_conversations
-- Conversas com a Ana Clara (coach virtual)
-- =====================================================

CREATE TABLE ana_clara_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_type VARCHAR NOT NULL CHECK (message_type IN ('user', 'ana_clara')),
  message_text TEXT NOT NULL,
  context JSONB,
  source VARCHAR DEFAULT 'whatsapp' CHECK (source IN ('whatsapp', 'web')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_ana_clara_conversations_user_id ON ana_clara_conversations(user_id);
CREATE INDEX idx_ana_clara_conversations_created_at ON ana_clara_conversations(created_at);
CREATE INDEX idx_ana_clara_conversations_source ON ana_clara_conversations(source);

-- Comentários
COMMENT ON TABLE ana_clara_conversations IS 'Histórico de conversas com a coach virtual Ana Clara';
COMMENT ON COLUMN ana_clara_conversations.context IS 'Contexto da conversa em formato JSON para manter estado';

-- =====================================================
-- TABELA: achievements
-- Conquistas e badges gamificação
-- =====================================================

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  icon VARCHAR,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_achievements_user_id ON achievements(user_id);
CREATE INDEX idx_achievements_type ON achievements(achievement_type);
CREATE INDEX idx_achievements_unlocked_at ON achievements(unlocked_at);

-- Comentários
COMMENT ON TABLE achievements IS 'Sistema de conquistas e gamificação';

-- =====================================================
-- TABELA: whatsapp_settings
-- Configurações do WhatsApp
-- =====================================================

CREATE TABLE whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR NOT NULL,
  is_connected BOOLEAN DEFAULT FALSE,
  connection_token VARCHAR,
  daily_summary_enabled BOOLEAN DEFAULT TRUE,
  daily_summary_time TIME DEFAULT '20:00',
  weekly_summary_enabled BOOLEAN DEFAULT TRUE,
  reminders_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_whatsapp_settings_user_id ON whatsapp_settings(user_id);
CREATE INDEX idx_whatsapp_settings_is_connected ON whatsapp_settings(is_connected);

-- Comentários
COMMENT ON TABLE whatsapp_settings IS 'Configurações de integração com WhatsApp';

-- =====================================================
-- TABELA: notifications
-- Sistema de notificações
-- =====================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL CHECK (type IN ('bill_due', 'budget_alert', 'goal_milestone', 'achievement', 'general')),
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Comentários
COMMENT ON TABLE notifications IS 'Sistema de notificações in-app';
COMMENT ON COLUMN notifications.type IS 'Tipo: bill_due, budget_alert, goal_milestone, achievement, general';

-- =====================================================
-- TABELA: audit_log
-- Log de auditoria para rastreamento
-- =====================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR NOT NULL,
  table_name VARCHAR NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Comentários
COMMENT ON TABLE audit_log IS 'Log de auditoria para rastreamento de ações';

-- =====================================================
-- FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas com updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON credit_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON investments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_settings_updated_at BEFORE UPDATE ON whatsapp_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Função para atualizar saldo da conta
-- =====================================================

CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Se é uma nova transação paga
    IF TG_OP = 'INSERT' AND NEW.is_paid = TRUE THEN
        IF NEW.type = 'expense' THEN
            UPDATE accounts SET current_balance = current_balance - NEW.amount 
            WHERE id = NEW.account_id;
        ELSIF NEW.type = 'income' THEN
            UPDATE accounts SET current_balance = current_balance + NEW.amount 
            WHERE id = NEW.account_id;
        ELSIF NEW.type = 'transfer' THEN
            UPDATE accounts SET current_balance = current_balance - NEW.amount 
            WHERE id = NEW.account_id;
            UPDATE accounts SET current_balance = current_balance + NEW.amount 
            WHERE id = NEW.transfer_to_account_id;
        END IF;
    END IF;
    
    -- Se uma transação foi marcada como paga
    IF TG_OP = 'UPDATE' AND OLD.is_paid = FALSE AND NEW.is_paid = TRUE THEN
        IF NEW.type = 'expense' THEN
            UPDATE accounts SET current_balance = current_balance - NEW.amount 
            WHERE id = NEW.account_id;
        ELSIF NEW.type = 'income' THEN
            UPDATE accounts SET current_balance = current_balance + NEW.amount 
            WHERE id = NEW.account_id;
        ELSIF NEW.type = 'transfer' THEN
            UPDATE accounts SET current_balance = current_balance - NEW.amount 
            WHERE id = NEW.account_id;
            UPDATE accounts SET current_balance = current_balance + NEW.amount 
            WHERE id = NEW.transfer_to_account_id;
        END IF;
    END IF;
    
    -- Se uma transação foi marcada como não paga
    IF TG_OP = 'UPDATE' AND OLD.is_paid = TRUE AND NEW.is_paid = FALSE THEN
        IF OLD.type = 'expense' THEN
            UPDATE accounts SET current_balance = current_balance + OLD.amount 
            WHERE id = OLD.account_id;
        ELSIF OLD.type = 'income' THEN
            UPDATE accounts SET current_balance = current_balance - OLD.amount 
            WHERE id = OLD.account_id;
        ELSIF OLD.type = 'transfer' THEN
            UPDATE accounts SET current_balance = current_balance + OLD.amount 
            WHERE id = OLD.account_id;
            UPDATE accounts SET current_balance = current_balance - OLD.amount 
            WHERE id = OLD.transfer_to_account_id;
        END IF;
    END IF;
    
    -- Se uma transação foi deletada
    IF TG_OP = 'DELETE' AND OLD.is_paid = TRUE THEN
        IF OLD.type = 'expense' THEN
            UPDATE accounts SET current_balance = current_balance + OLD.amount 
            WHERE id = OLD.account_id;
        ELSIF OLD.type = 'income' THEN
            UPDATE accounts SET current_balance = current_balance - OLD.amount 
            WHERE id = OLD.account_id;
        ELSIF OLD.type = 'transfer' THEN
            UPDATE accounts SET current_balance = current_balance + OLD.amount 
            WHERE id = OLD.account_id;
            UPDATE accounts SET current_balance = current_balance - OLD.amount 
            WHERE id = OLD.transfer_to_account_id;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger para atualizar saldo
CREATE TRIGGER transaction_balance_update 
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- =====================================================
-- Função para atualizar progresso da meta
-- =====================================================

CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE goals 
        SET current_amount = current_amount + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.goal_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE goals 
        SET current_amount = current_amount - OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.goal_id;
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger para atualizar progresso da meta
CREATE TRIGGER goal_contribution_update 
    AFTER INSERT OR DELETE ON goal_contributions
    FOR EACH ROW EXECUTE FUNCTION update_goal_progress();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ana_clara_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para users
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Políticas RLS para accounts
CREATE POLICY "Users can view own accounts" ON accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts" ON accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts" ON accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts" ON accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para categories
CREATE POLICY "Users can view own categories" ON categories
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON categories
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para transactions
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para credit_cards
CREATE POLICY "Users can view own credit_cards" ON credit_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit_cards" ON credit_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit_cards" ON credit_cards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit_cards" ON credit_cards
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para goals
CREATE POLICY "Users can view own goals" ON goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON goals
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para budgets
CREATE POLICY "Users can view own budgets" ON budgets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" ON budgets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON budgets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON budgets
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para investments
CREATE POLICY "Users can view own investments" ON investments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investments" ON investments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investments" ON investments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investments" ON investments
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para ana_clara_conversations
CREATE POLICY "Users can view own conversations" ON ana_clara_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON ana_clara_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para achievements
CREATE POLICY "Users can view own achievements" ON achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para whatsapp_settings
CREATE POLICY "Users can view own whatsapp_settings" ON whatsapp_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own whatsapp_settings" ON whatsapp_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own whatsapp_settings" ON whatsapp_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas RLS para notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- VIEWS ÚTEIS
-- =====================================================

-- View para saldo total do usuário
CREATE OR REPLACE VIEW user_total_balance AS
SELECT 
    user_id,
    SUM(current_balance) as total_balance,
    SUM(CASE WHEN type IN ('checking', 'savings', 'cash') THEN current_balance ELSE 0 END) as liquid_balance,
    SUM(CASE WHEN type = 'investment' THEN current_balance ELSE 0 END) as invested_balance
FROM accounts
WHERE is_active = TRUE
GROUP BY user_id;

-- View para despesas por categoria no mês
CREATE OR REPLACE VIEW monthly_expenses_by_category AS
SELECT 
    t.user_id,
    DATE_TRUNC('month', t.transaction_date) as month,
    c.name as category_name,
    c.icon as category_icon,
    c.color as category_color,
    SUM(t.amount) as total_amount,
    COUNT(*) as transaction_count
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.type = 'expense' AND t.is_paid = TRUE
GROUP BY t.user_id, DATE_TRUNC('month', t.transaction_date), c.name, c.icon, c.color;

-- View para progresso de metas
CREATE OR REPLACE VIEW goals_progress AS
SELECT 
    g.id,
    g.user_id,
    g.name,
    g.target_amount,
    g.current_amount,
    g.target_date,
    g.icon,
    ROUND((g.current_amount / g.target_amount * 100)::numeric, 2) as progress_percentage,
    g.target_amount - g.current_amount as remaining_amount,
    CASE 
        WHEN g.target_date IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (g.target_date - CURRENT_DATE)) / 86400
        ELSE NULL 
    END as days_remaining
FROM goals g
WHERE g.status = 'active';

-- =====================================================
-- FUNÇÕES ÚTEIS
-- =====================================================

-- Função para calcular limite usado do cartão no mês
CREATE OR REPLACE FUNCTION get_credit_card_usage(card_id UUID, reference_month DATE)
RETURNS TABLE (
    total_used DECIMAL(10,2),
    credit_limit DECIMAL(10,2),
    available_limit DECIMAL(10,2),
    usage_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(t.amount), 0) as total_used,
        cc.credit_limit,
        cc.credit_limit - COALESCE(SUM(t.amount), 0) as available_limit,
        ROUND((COALESCE(SUM(t.amount), 0) / cc.credit_limit * 100)::numeric, 2) as usage_percentage
    FROM credit_cards cc
    LEFT JOIN credit_card_transactions cct ON cc.id = cct.credit_card_id
    LEFT JOIN transactions t ON cct.transaction_id = t.id 
        AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', reference_month)
        AND t.is_paid = FALSE
    WHERE cc.id = card_id
    GROUP BY cc.id, cc.credit_limit;
END;
$$ LANGUAGE plpgsql;

-- Função para obter resumo financeiro do mês
CREATE OR REPLACE FUNCTION get_monthly_summary(p_user_id UUID, reference_month DATE)
RETURNS TABLE (
    total_income DECIMAL(10,2),
    total_expenses DECIMAL(10,2),
    balance DECIMAL(10,2),
    savings_amount DECIMAL(10,2),
    savings_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) - 
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as savings_amount,
        CASE 
            WHEN SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) > 0 THEN
                ROUND(((SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
                    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)) / 
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) * 100)::numeric, 2)
            ELSE 0
        END as savings_percentage
    FROM transactions
    WHERE user_id = p_user_id 
        AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', reference_month)
        AND is_paid = TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DADOS INICIAIS (SEED)
-- =====================================================

-- Categorias padrão de Despesas
INSERT INTO categories (name, type, icon, color, is_default) VALUES
('Alimentação', 'expense', '🍽️', '#ef4444', TRUE),
('Transporte', 'expense', '🚗', '#f59e0b', TRUE),
('Moradia', 'expense', '🏠', '#8b5cf6', TRUE),
('Saúde', 'expense', '⚕️', '#10b981', TRUE),
('Educação', 'expense', '📚', '#3b82f6', TRUE),
('Lazer', 'expense', '🎮', '#ec4899', TRUE),
('Vestuário', 'expense', '👔', '#6366f1', TRUE),
('Beleza', 'expense', '💄', '#f472b6', TRUE),
('Assinaturas', 'expense', '📺', '#8b5cf6', TRUE),
('Pets', 'expense', '🐾', '#f59e0b', TRUE),
('Outros', 'expense', '📊', '#6b7280', TRUE);

-- Categorias padrão de Receitas
INSERT INTO categories (name, type, icon, color, is_default) VALUES
('Salário', 'income', '💰', '#10b981', TRUE),
('Freelance', 'income', '💼', '#3b82f6', TRUE),
('Investimentos', 'income', '📈', '#8b5cf6', TRUE),
('Presentes', 'income', '🎁', '#ec4899', TRUE),
('Outros', 'income', '💵', '#6b7280', TRUE);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

-- Comentário final
COMMENT ON SCHEMA public IS 'Personal Finance LA - Schema completo para MVP';

-- Migration: Create webhook_logs table
-- Responsabilidade: Histórico de chamadas de webhooks

CREATE TYPE webhook_log_status AS ENUM (
  'pending',
  'success',
  'failed',
  'retrying'
);

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  
  -- Request
  request_payload JSONB,
  request_headers JSONB,
  request_method http_method NOT NULL,
  
  -- Response
  response_status_code INTEGER,
  response_body TEXT,
  response_headers JSONB,
  response_time_ms INTEGER, -- Tempo de resposta em milissegundos
  
  -- Status
  status webhook_log_status DEFAULT 'pending' NOT NULL,
  error_message TEXT,
  
  -- Retry
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  
  -- Metadados
  triggered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_webhook_logs_user_id ON public.webhook_logs(user_id);
CREATE INDEX idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_status ON public.webhook_logs(status);
CREATE INDEX idx_webhook_logs_triggered_at ON public.webhook_logs(triggered_at DESC);
CREATE INDEX idx_webhook_logs_retry ON public.webhook_logs(next_retry_at) WHERE status = 'retrying';

-- RLS Policies
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhook logs"
  ON public.webhook_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert webhook logs"
  ON public.webhook_logs
  FOR INSERT
  WITH CHECK (true); -- Edge Functions usam service role

CREATE POLICY "Service role can update webhook logs"
  ON public.webhook_logs
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Trigger: Atualizar estatísticas do webhook após log
CREATE OR REPLACE FUNCTION update_webhook_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' THEN
    UPDATE public.webhook_endpoints
    SET 
      total_calls = total_calls + 1,
      success_calls = success_calls + 1,
      last_triggered_at = NEW.triggered_at,
      last_status_code = NEW.response_status_code
    WHERE id = NEW.webhook_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE public.webhook_endpoints
    SET 
      total_calls = total_calls + 1,
      failed_calls = failed_calls + 1,
      last_triggered_at = NEW.triggered_at,
      last_status_code = NEW.response_status_code
    WHERE id = NEW.webhook_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_webhook_stats_trigger
  AFTER INSERT OR UPDATE OF status ON public.webhook_logs
  FOR EACH ROW
  WHEN (NEW.status IN ('success', 'failed'))
  EXECUTE FUNCTION update_webhook_stats();

-- Comentários
COMMENT ON TABLE public.webhook_logs IS 'Histórico de chamadas de webhooks com request/response completos';
COMMENT ON COLUMN public.webhook_logs.response_time_ms IS 'Tempo de resposta do webhook em milissegundos';;

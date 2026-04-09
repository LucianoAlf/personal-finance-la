-- Função auxiliar para calcular próxima data de recorrência
CREATE OR REPLACE FUNCTION calculate_next_occurrence(
  p_current_date DATE,
  p_frequency TEXT,
  p_day_of_month INTEGER
)
RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_date DATE;
BEGIN
  -- Se não tem data atual, usar hoje
  IF p_current_date IS NULL THEN
    p_current_date := CURRENT_DATE;
  END IF;
  
  -- Calcular próxima data baseado na frequência
  CASE p_frequency
    WHEN 'monthly' THEN
      v_next_date := p_current_date + INTERVAL '1 month';
    WHEN 'bimonthly' THEN
      v_next_date := p_current_date + INTERVAL '2 months';
    WHEN 'quarterly' THEN
      v_next_date := p_current_date + INTERVAL '3 months';
    WHEN 'semiannual' THEN
      v_next_date := p_current_date + INTERVAL '6 months';
    WHEN 'yearly' THEN
      v_next_date := p_current_date + INTERVAL '1 year';
    ELSE
      v_next_date := p_current_date + INTERVAL '1 month';
  END CASE;
  
  -- Ajustar para o dia do mês especificado
  IF p_day_of_month IS NOT NULL AND p_day_of_month BETWEEN 1 AND 28 THEN
    v_next_date := DATE_TRUNC('month', v_next_date) + (p_day_of_month - 1) * INTERVAL '1 day';
  END IF;
  
  RETURN v_next_date;
END;
$$;;

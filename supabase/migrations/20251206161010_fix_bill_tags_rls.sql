-- Ativar RLS na tabela bill_tags
ALTER TABLE bill_tags ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
CREATE POLICY "Users can view own bill tags"
ON bill_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM payable_bills pb
    WHERE pb.id = bill_tags.bill_id
    AND pb.user_id = auth.uid()
  )
);

-- Política para INSERT
CREATE POLICY "Users can insert own bill tags"
ON bill_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM payable_bills pb
    WHERE pb.id = bill_tags.bill_id
    AND pb.user_id = auth.uid()
  )
);

-- Política para DELETE
CREATE POLICY "Users can delete own bill tags"
ON bill_tags FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM payable_bills pb
    WHERE pb.id = bill_tags.bill_id
    AND pb.user_id = auth.uid()
  )
);;

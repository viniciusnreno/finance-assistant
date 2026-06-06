-- ============================================================
-- Renomear nubank_pix → nubank_credito
-- ============================================================

-- Dropar constraint existente antes de migrar dados
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_payment_method_check;

-- Migrar registros antigos
UPDATE public.expenses
SET payment_method = 'nubank_credito'
WHERE payment_method = 'nubank_pix';

-- Zerar valores que não se encaixam no enum atualizado
UPDATE public.expenses
SET payment_method = NULL
WHERE payment_method IS NOT NULL
  AND payment_method NOT IN ('caju', 'paicard', 'nubank_credito', 'nubank_debito');

-- Recriar constraint com o enum correto
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_payment_method_check CHECK (
    payment_method IS NULL
    OR payment_method IN ('caju', 'paicard', 'nubank_credito', 'nubank_debito')
  );

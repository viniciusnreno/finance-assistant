-- ============================================================
-- 1. CATEGORIAS — dropar constraint antiga antes de migrar dados
-- ============================================================
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

-- Migrar categorias removidas para os novos equivalentes
UPDATE public.expenses SET category = 'roles'  WHERE category = 'lazer';
UPDATE public.expenses SET category = 'outros' WHERE category = 'familia';

-- Adicionar nova constraint de categoria
ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_check CHECK (
  category IN (
    'alimentacao',
    'mercado',
    'transporte',
    'combustivel',
    'saude',
    'educacao',
    'roles',
    'consumiveis',
    'casa',
    'assinaturas',
    'contas',
    'viagem',
    'presentes',
    'outros'
  )
);

-- ============================================================
-- 2. MÉTODOS DE PAGAMENTO — normalizar valores antigos e restringir
-- ============================================================

-- Normalizar texto livre para os valores do enum
UPDATE public.expenses SET payment_method = 'caju'
  WHERE lower(payment_method) IN ('caju', 'vr', 'vale refeição', 'vale alimentação', 'vale refeicao', 'vale alimentacao');

UPDATE public.expenses SET payment_method = 'paicard'
  WHERE lower(payment_method) IN ('paicard', 'cartão do pai', 'cartao do pai');

UPDATE public.expenses SET payment_method = 'nubank_pix'
  WHERE lower(payment_method) IN ('nubank pix', 'pix nubank', 'pix');

UPDATE public.expenses SET payment_method = 'nubank_debito'
  WHERE lower(payment_method) IN ('nubank débito', 'nubank debito', 'débito nubank', 'debito nubank', 'débito', 'debito');

-- Zerar valores que não se encaixam no enum
UPDATE public.expenses
SET payment_method = NULL
WHERE payment_method IS NOT NULL
  AND payment_method NOT IN ('caju', 'paicard', 'nubank_pix', 'nubank_debito');

-- Adicionar constraint de método de pagamento
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_payment_method_check CHECK (
    payment_method IS NULL
    OR payment_method IN ('caju', 'paicard', 'nubank_pix', 'nubank_debito')
  );

-- ============================================================
-- Adicionar categorias 'tecnologia' e 'roupas'
-- ============================================================

-- Dropar constraint anterior para substituir pela atualizada
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

-- Adicionar constraint atualizada incluindo as novas categorias
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
    'tecnologia',
    'roupas',
    'outros'
  )
);

export const PAYMENT_METHODS = [
  'caju',
  'paicard',
  'nubank_credito',
  'nubank_debito',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  caju: 'Caju (VR)',
  paicard: 'Paicard',
  nubank_credito: 'Nubank Crédito',
  nubank_debito: 'Nubank Débito',
};

export const CATEGORIES = [
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
  'outros',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  alimentacao: 'Alimentação',
  mercado: 'Mercado',
  transporte: 'Transporte',
  combustivel: 'Combustível',
  saude: 'Saúde',
  educacao: 'Educação',
  roles: 'Roles',
  consumiveis: 'Consumíveis',
  casa: 'Casa',
  assinaturas: 'Assinaturas',
  contas: 'Contas',
  viagem: 'Viagem',
  presentes: 'Presentes',
  tecnologia: 'Tecnologia',
  roupas: 'Roupas',
  outros: 'Outros',
};

export interface Expense {
  id: string;
  created_at: string;
  updated_at: string;
  expense_date: string;
  value: number;
  currency: string;
  category: Category;
  description: string;
  merchant: string | null;
  payment_method: string | null;
  original_text: string | null;
  transcription_text: string | null;
  source: string;
  telegram_chat_id: number | null;
  telegram_user_id: number | null;
  telegram_message_id: number | null;
  telegram_file_id: string | null;
  confidence: number | null;
  raw_update: unknown;
  deleted_at: string | null;
}

export interface ParsedExpense {
  value: number;
  currency: string;
  category: Category;
  description: string;
  merchant?: string;
  payment_method?: PaymentMethod;
  expense_date?: string;
  confidence: number;
}

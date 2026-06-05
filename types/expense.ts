export const CATEGORIES = [
  'alimentacao',
  'mercado',
  'transporte',
  'combustivel',
  'saude',
  'educacao',
  'lazer',
  'casa',
  'assinaturas',
  'contas',
  'familia',
  'viagem',
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
  lazer: 'Lazer',
  casa: 'Casa',
  assinaturas: 'Assinaturas',
  contas: 'Contas',
  familia: 'Família',
  viagem: 'Viagem',
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
  payment_method?: string;
  expense_date?: string;
  confidence: number;
}

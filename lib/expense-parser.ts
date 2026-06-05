import { z } from 'zod';
import { openai, EXPENSE_MODEL, TRANSCRIPTION_MODEL } from './openai';
import { CATEGORIES, type ParsedExpense } from '@/types/expense';
import { toZonedTime, format } from 'date-fns-tz';

const timezone = process.env.APP_TIMEZONE ?? 'America/Sao_Paulo';

function todayInTimezone(): string {
  const now = toZonedTime(new Date(), timezone);
  return format(now, 'yyyy-MM-dd', { timeZone: timezone });
}

const ParsedExpenseSchema = z.object({
  expenses: z.array(
    z.object({
      value: z.number().positive(),
      currency: z.string().default('BRL'),
      category: z.enum(CATEGORIES),
      description: z.string(),
      merchant: z.string().optional(),
      payment_method: z.string().optional(),
      expense_date: z.string().optional(),
      confidence: z.number().min(0).max(1),
    })
  ),
  needs_clarification: z.boolean(),
  clarification_message: z.string().optional(),
});

const SYSTEM_PROMPT = `Você é um assistente financeiro pessoal brasileiro. Sua tarefa é extrair despesas de mensagens de texto.

Categorias disponíveis:
- alimentacao: restaurantes, lanchonetes, delivery, refeições
- mercado: supermercado, feira, compras de alimentos
- transporte: uber, táxi, ônibus, metrô, passagens
- combustivel: gasolina, álcool, diesel, posto de combustível
- saude: farmácia, médico, hospital, exames, plano de saúde
- educacao: cursos, livros, escola, faculdade, mensalidades
- lazer: cinema, streaming, jogos, hobbies, entretenimento
- casa: aluguel, condomínio, reforma, móveis, eletrodomésticos
- assinaturas: netflix, spotify, software, revistas, anuidades
- contas: luz, água, internet, telefone, gás
- familia: filhos, cônjuge, pais, presentes para família
- viagem: hotel, passagem aérea, passeios, turismo
- outros: qualquer coisa que não se encaixa nas anteriores

Regras:
1. Extraia TODAS as despesas mencionadas na mensagem.
2. Se não houver valor monetário claro, defina needs_clarification=true com uma mensagem pedindo o valor.
3. Para datas relativas (ontem, semana passada), calcule com base na data de hoje.
4. Se não houver data, use a data de hoje.
5. Confidence é um número entre 0 e 1 indicando sua certeza na extração.
6. Valores em reais não precisam do símbolo R$, apenas o número.
7. Sempre responda em JSON válido conforme o schema.
8. A resposta DEVE ser um objeto JSON com as chaves "expenses", "needs_clarification" e opcionalmente "clarification_message". NUNCA retorne um array na raiz.`;

export async function parseExpensesFromText(
  text: string,
  today: string = todayInTimezone()
): Promise<{ expenses: ParsedExpense[]; needsClarification: boolean; clarificationMessage?: string }> {
  const response = await openai.chat.completions.create({
    model: EXPENSE_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Data de hoje: ${today}\n\nMensagem: ${text}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    return { expenses: [], needsClarification: true, clarificationMessage: 'Não consegui processar sua mensagem.' };
  }

  let jsonValue: unknown;
  try {
    jsonValue = JSON.parse(raw);
  } catch {
    console.error('[expense-parser] invalid JSON from model:', raw);
    return { expenses: [], needsClarification: true, clarificationMessage: 'Não entendi o gasto. Pode repetir com mais detalhes?' };
  }

  // Alguns modelos (ex: Gemini) retornam o array de despesas diretamente
  if (Array.isArray(jsonValue)) {
    jsonValue = { expenses: jsonValue, needs_clarification: false };
  }

  const parsed = ParsedExpenseSchema.safeParse(jsonValue);
  if (!parsed.success) {
    console.error('[expense-parser] schema validation failed:', parsed.error);
    return { expenses: [], needsClarification: true, clarificationMessage: 'Não entendi o gasto. Pode repetir com mais detalhes?' };
  }

  const { expenses, needs_clarification, clarification_message } = parsed.data;

  return {
    expenses: expenses.map((e) => ({
      ...e,
      currency: e.currency ?? 'BRL',
      expense_date: e.expense_date ?? today,
      confidence: e.confidence,
    })),
    needsClarification: needs_clarification,
    clarificationMessage: clarification_message,
  };
}

export async function transcribeAudio(audioBuffer: Buffer, fileName: string): Promise<string> {
  const { toFile } = await import('openai');
  const file = await toFile(audioBuffer, fileName, { type: 'audio/ogg' });

  const transcription = await openai.audio.transcriptions.create({
    model: TRANSCRIPTION_MODEL,
    file,
    language: 'pt',
  });

  return transcription.text;
}

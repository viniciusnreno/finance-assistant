import { z } from 'zod';
import { openai, EXPENSE_MODEL, TRANSCRIPTION_MODEL } from './openai';
import { CATEGORIES, PAYMENT_METHODS, type ParsedExpense } from '@/types/expense';
import { toZonedTime, format } from 'date-fns-tz';

const timezone = process.env.APP_TIMEZONE ?? 'America/Sao_Paulo';

function todayInTimezone(): string {
  const now = toZonedTime(new Date(), timezone);
  return format(now, 'yyyy-MM-dd', { timeZone: timezone });
}

const ExpenseItemSchema = z.object({
  value: z.union([z.number(), z.string(), z.null()]).transform((v) => (v !== null ? Number(v) : null)),
  amount: z.union([z.number(), z.string(), z.null()]).optional().transform((v) => (v !== undefined && v !== null ? Number(v) : undefined)),
  currency: z.string().default('BRL'),
  category: z.enum(CATEGORIES).catch('outros'),
  description: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  item: z.string().optional(),
  merchant: z.string().optional(),
  store: z.string().optional(),
  payment_method: z.enum(PAYMENT_METHODS).optional().catch(undefined),
  expense_date: z.string().optional(),
  date: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.9),
}).transform((e) => ({
  value: e.value ?? e.amount ?? 0,
  currency: e.currency,
  category: e.category,
  description: e.description ?? e.name ?? e.title ?? e.item ?? 'Gasto',
  merchant: e.merchant ?? e.store,
  payment_method: e.payment_method,
  expense_date: e.expense_date ?? e.date,
  confidence: e.confidence,
}));

const ParsedExpenseSchema = z.object({
  expenses: z.array(ExpenseItemSchema).default([]),
  needs_clarification: z.boolean().default(false),
  clarification_message: z.string().optional(),
  needsClarification: z.boolean().optional(),
  clarificationMessage: z.string().optional(),
}).passthrough();

const SYSTEM_PROMPT = `Você é um assistente financeiro pessoal brasileiro. Sua tarefa é extrair despesas de mensagens de texto.

Categorias disponíveis:
- alimentacao: restaurantes, lanchonetes, delivery, refeições
- mercado: supermercado, feira, compras de alimentos
- transporte: itacar, coopercar, uber, 99, passagem, blablacar, ônibus, metrô, táxi
- combustivel: gasolina, álcool, diesel, posto de combustível
- saude: farmácia, médico, hospital, exames, plano de saúde
- educacao: cursos, livros, escola, faculdade, mensalidades
- roles: ingresso de festa, balada, eventos, shows, festas
- consumiveis: tabaco, seda, filtro, cigarro, bebida alcoólica, cerveja, cachaça, vinho
- casa: aluguel, condomínio, reforma, móveis, eletrodomésticos
- assinaturas: netflix, spotify, software, revistas, anuidades
- contas: luz, água, internet, telefone, gás
- viagem: hotel, passagem aérea, passeios, turismo
- presentes: presentes para pessoas, gift, mimo
- tecnologia: eletrônicos, fones de ouvido, air pods, airpods, carregador, cabo, celular, computador, notebook, tablet, acessórios tech, gadgets, smartwatch
- roupas: vestuário, camiseta, calça, tênis, sapato, roupa, moda, acessórios de moda
- outros: qualquer coisa que não se encaixa nas anteriores

Meios de pagamento (campo opcional, use apenas os valores abaixo se mencionados):
- caju: Caju, VR, vale refeição, vale alimentação
- paicard: paicard, cartão do pai, cartão pai
- nubank_credito: nubank crédito, nubank credito, crédito nubank, credito nubank, crédito, credito
- nubank_debito: nubank débito, nubank debito, débito nubank, débito

Regras:
1. Extraia TODAS as despesas mencionadas na mensagem.
2. Se não houver valor monetário claro, defina needs_clarification=true com uma mensagem pedindo o valor.
3. Para datas relativas (ontem, semana passada), calcule com base na data de hoje.
4. Se não houver data, use a data de hoje.
5. Confidence é um número entre 0 e 1 indicando sua certeza na extração.
6. Valores em reais não precisam do símbolo R$, apenas o número.
7. Sempre responda em JSON válido conforme o schema.
8. A resposta DEVE ser um objeto JSON com as chaves "expenses", "needs_clarification" e opcionalmente "clarification_message". NUNCA retorne um array na raiz.
9. O campo payment_method é opcional. Só preencha se o meio de pagamento for claramente identificado na mensagem. Use exatamente um dos valores: caju, paicard, nubank_credito, nubank_debito.`;

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

  console.log('[expense-parser] raw json:', JSON.stringify(jsonValue).slice(0, 500));

  const parsed = ParsedExpenseSchema.safeParse(jsonValue);
  if (!parsed.success) {
    console.error('[expense-parser] schema validation failed:', parsed.error);
    return { expenses: [], needsClarification: true, clarificationMessage: 'Não entendi o gasto. Pode repetir com mais detalhes?' };
  }

  const obj = parsed.data as Record<string, unknown>;
  const expenses = (obj.expenses as ReturnType<typeof ExpenseItemSchema.parse>[]) ?? [];
  const needs_clarification = Boolean(obj.needs_clarification ?? obj.needsClarification ?? false);
  const clarification_message = (obj.clarification_message ?? obj.clarificationMessage) as string | undefined;

  return {
    expenses: expenses
      .filter((e) => e.value > 0)
      .map((e) => ({
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
  const provider = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();

  if (provider === 'gemini') {
    return transcribeAudioGemini(audioBuffer);
  }

  return transcribeAudioOpenAI(audioBuffer, fileName);
}

async function transcribeAudioOpenAI(audioBuffer: Buffer, fileName: string): Promise<string> {
  const { toFile } = await import('openai');
  const file = await toFile(audioBuffer, fileName, { type: 'audio/ogg' });

  const transcription = await openai.audio.transcriptions.create({
    model: TRANSCRIPTION_MODEL,
    file,
    language: 'pt',
  });

  return transcription.text;
}

async function transcribeAudioGemini(audioBuffer: Buffer): Promise<string> {
  // A camada OpenAI-compatible do Gemini não suporta áudio via transcriptions nem input_audio.
  // Usamos a API nativa do Gemini (REST) com inlineData para enviar o áudio diretamente.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY must be set');

  const model = TRANSCRIPTION_MODEL;
  const base64 = audioBuffer.toString('base64');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/ogg',
              data: base64,
            },
          },
          {
            text: 'Transcreva este áudio em português do Brasil. Retorne apenas o texto transcrito, sem explicações adicionais.',
          },
        ],
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini transcription failed ${res.status}: ${errText}`);
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

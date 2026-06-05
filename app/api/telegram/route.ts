import { NextRequest, NextResponse } from 'next/server';
import { sendMessage, downloadFile } from '@/lib/telegram';
import { parseExpensesFromText, transcribeAudio } from '@/lib/expense-parser';
import { supabase } from '@/lib/supabase';
import { toZonedTime, format } from 'date-fns-tz';
import type { ParsedExpense } from '@/types/expense';

export const runtime = 'nodejs';

const timezone = process.env.APP_TIMEZONE ?? 'America/Sao_Paulo';

function todayInTimezone(): string {
  const now = toZonedTime(new Date(), timezone);
  return format(now, 'yyyy-MM-dd', { timeZone: timezone });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function buildConfirmationMessage(expenses: ParsedExpense[]): string {
  if (expenses.length === 1) {
    const e = expenses[0];
    const lines = [
      `✅ <b>Gasto registrado!</b>`,
      ``,
      `📌 ${e.description}`,
      `💰 ${formatCurrency(e.value)}`,
      `🏷️ ${e.category}`,
    ];
    if (e.merchant) lines.push(`🏪 ${e.merchant}`);
    if (e.payment_method) lines.push(`💳 ${e.payment_method}`);
    return lines.join('\n');
  }

  const total = expenses.reduce((sum, e) => sum + e.value, 0);
  const lines = [`✅ <b>${expenses.length} gastos registrados!</b>`, ``];
  expenses.forEach((e, i) => {
    lines.push(`${i + 1}. ${e.description} — ${formatCurrency(e.value)} (${e.category})`);
  });
  lines.push(``, `💰 Total: ${formatCurrency(total)}`);
  return lines.join('\n');
}

interface TelegramUpdate {
  message?: {
    message_id: number;
    from?: { id: number; first_name: string };
    chat: { id: number };
    text?: string;
    voice?: { file_id: string; duration: number };
    audio?: { file_id: string };
  };
}

export async function POST(request: NextRequest) {
  // Validar secret token
  const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const message = update.message;
  if (!message) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const allowedChatId = Number(process.env.TELEGRAM_ALLOWED_CHAT_ID);

  // Validar chat autorizado
  if (chatId !== allowedChatId) {
    return NextResponse.json({ ok: true });
  }

  const messageId = message.message_id;
  const userId = message.from?.id;

  try {
    let text: string | null = null;
    let transcriptionText: string | null = null;
    let fileId: string | null = null;

    if (message.text) {
      text = message.text;
    } else if (message.voice || message.audio) {
      fileId = message.voice?.file_id ?? message.audio?.file_id ?? null;
      if (!fileId) {
        await sendMessage(chatId, 'Não consegui obter o arquivo de áudio.');
        return NextResponse.json({ ok: true });
      }

      const audioBuffer = await downloadFile(fileId);
      const fileName = `audio_${messageId}.ogg`;
      transcriptionText = await transcribeAudio(audioBuffer, fileName);
      text = transcriptionText;

      await sendMessage(chatId, `🎙️ Transcrição: <i>${transcriptionText}</i>`);
    } else {
      await sendMessage(chatId, 'Por enquanto só aceito mensagens de texto ou notas de voz. 🎙️');
      return NextResponse.json({ ok: true });
    }

    if (!text) {
      await sendMessage(chatId, 'Não consegui processar sua mensagem.');
      return NextResponse.json({ ok: true });
    }

    const { expenses, needsClarification, clarificationMessage } = await parseExpensesFromText(
      text,
      todayInTimezone()
    );

    if (needsClarification || expenses.length === 0) {
      await sendMessage(
        chatId,
        clarificationMessage ?? 'Não entendi o gasto. Pode informar o valor e o que foi gasto?'
      );
      return NextResponse.json({ ok: true });
    }

    const rows = expenses.map((e: ParsedExpense) => ({
      expense_date: e.expense_date ?? todayInTimezone(),
      value: e.value,
      currency: e.currency ?? 'BRL',
      category: e.category,
      description: e.description,
      merchant: e.merchant ?? null,
      payment_method: e.payment_method ?? null,
      original_text: message.text ?? null,
      transcription_text: transcriptionText,
      source: 'telegram',
      telegram_chat_id: chatId,
      telegram_user_id: userId ?? null,
      telegram_message_id: messageId,
      telegram_file_id: fileId,
      confidence: e.confidence,
      raw_update: update,
    }));

    const { error } = await supabase.from('expenses').insert(rows);

    if (error) {
      // Erro de duplicidade (unique index) — ignorar silenciosamente
      if (error.code === '23505') {
        await sendMessage(chatId, '⚠️ Essa mensagem já foi registrada anteriormente.');
        return NextResponse.json({ ok: true });
      }
      throw error;
    }

    await sendMessage(chatId, buildConfirmationMessage(expenses));
  } catch (err) {
    console.error('[telegram] error processing message:', err);
    try {
      await sendMessage(chatId, '❌ Ocorreu um erro interno. Tente novamente.');
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ ok: true });
}

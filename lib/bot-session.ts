import { supabase } from './supabase';

export async function getPendingText(chatId: number): Promise<string | null> {
  const { data } = await supabase
    .from('bot_sessions')
    .select('pending_text')
    .eq('chat_id', chatId)
    .single();
  return data?.pending_text ?? null;
}

export async function setPendingText(chatId: number, text: string): Promise<void> {
  await supabase.from('bot_sessions').upsert(
    { chat_id: chatId, pending_text: text, updated_at: new Date().toISOString() },
    { onConflict: 'chat_id' }
  );
}

export async function clearPendingText(chatId: number): Promise<void> {
  await supabase.from('bot_sessions').upsert(
    { chat_id: chatId, pending_text: null, updated_at: new Date().toISOString() },
    { onConflict: 'chat_id' }
  );
}

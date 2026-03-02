import { supabase } from '@/services/supabase';
import type { CreditTransaction, PurchaseCreditsRequest } from '@shared/types';

// ============================================================
// Credits Service
// Balance queries, transaction history, and in-app purchase
// receipt validation via Supabase edge function.
// ============================================================

/**
 * Get the current user's credit balance from their profile row.
 */
export async function getBalance(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return (data as { credits_balance: number }).credits_balance;
}

/**
 * Fetch recent credit transactions for the current user.
 * @param limit Maximum number of rows to return (default 50).
 */
export async function getTransactions(
  limit: number = 50,
): Promise<CreditTransaction[]> {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CreditTransaction[];
}

/**
 * Purchase credits by sending the IAP receipt to the server for
 * validation. The edge function verifies the receipt with Apple /
 * Google and credits the user's account atomically.
 */
export async function purchaseCredits(
  packId: string,
  receipt: string,
  platform: 'ios' | 'android',
): Promise<{ credits_added: number; new_balance: number }> {
  const body: PurchaseCreditsRequest = { pack_id: packId, receipt, platform };

  const { data, error } = await supabase.functions.invoke('purchase-credits', {
    body,
  });

  if (error) throw error;
  return data as { credits_added: number; new_balance: number };
}

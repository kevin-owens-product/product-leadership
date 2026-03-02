import { create } from 'zustand';
import type { CreditTransaction } from '@shared/types';
import * as creditsService from '@/services/credits';

// ============================================================
// Credit Store
// Tracks the user's credit balance and transaction history.
// ============================================================

interface CreditState {
  // --- State ---
  balance: number;
  transactions: CreditTransaction[];
  isLoading: boolean;

  // --- Actions ---
  fetchBalance: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  deductCredits: (amount: number) => void;
  refreshCredits: () => Promise<void>;
}

export const useCreditStore = create<CreditState>((set, get) => ({
  // --- Initial state -------------------------------------------------------
  balance: 0,
  transactions: [],
  isLoading: false,

  // --- Actions -------------------------------------------------------------

  fetchBalance: async () => {
    try {
      const balance = await creditsService.getBalance();
      set({ balance });
    } catch (error) {
      console.error('[CreditStore] fetchBalance failed:', error);
    }
  },

  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const transactions = await creditsService.getTransactions();
      set({ transactions });
    } catch (error) {
      console.error('[CreditStore] fetchTransactions failed:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Optimistically deduct credits from the local balance.
   * Use after a successful show creation to keep the UI in sync
   * without waiting for a full refetch.
   */
  deductCredits: (amount) => {
    const { balance } = get();
    set({ balance: Math.max(0, balance - amount) });
  },

  /**
   * Convenience method: fetches both balance and transactions in
   * parallel.
   */
  refreshCredits: async () => {
    set({ isLoading: true });
    try {
      await Promise.all([get().fetchBalance(), get().fetchTransactions()]);
    } catch (error) {
      console.error('[CreditStore] refreshCredits failed:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));

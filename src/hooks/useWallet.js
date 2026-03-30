import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

/**
 * useWallet — manages wallet balance + transactions for the logged-in user.
 * Provides real-time updates via Supabase subscriptions.
 */
export const useWallet = (session) => {
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [walletLoading, setWalletLoading] = useState(true);

  const userId = session?.user?.id;

  // ── Fetch wallet balance ─────────────────────────────────────────────────
  const fetchWallet = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (error && error.code === "PGRST116") {
      // Wallet row doesn't exist yet — create it
      await supabase.from("wallets").insert({ user_id: userId, balance: 0 });
      setWalletBalance(0);
    } else if (!error && data) {
      setWalletBalance(Number(data.balance));
    }
    setWalletLoading(false);
  }, [userId]);

  // ── Fetch transaction history ────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) setTransactions(data);
  }, [userId]);

  // ── Initial fetch + real-time subscriptions ──────────────────────────────
  useEffect(() => {
    if (!userId) return;
    fetchWallet();
    fetchTransactions();

    const walletChannel = supabase
      .channel(`wallet:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${userId}` },
        () => fetchWallet()
      )
      .subscribe();

    const txChannel = supabase
      .channel(`transactions:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(txChannel);
    };
  }, [userId, fetchWallet, fetchTransactions]);

  // ── addMoney — credit wallet after recharge ──────────────────────────────
  const addMoney = useCallback(
    async (amount) => {
      if (!userId) throw new Error("Not logged in");
      if (amount <= 0) throw new Error("Invalid amount");

      const newBalance = walletBalance + amount;
      const { error: walletErr } = await supabase
        .from("wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (walletErr) throw new Error(walletErr.message);

      await supabase.from("transactions").insert({
        user_id: userId,
        type: "credit",
        amount,
        description: "Wallet Recharge",
      });

      setWalletBalance(newBalance);
    },
    [userId, walletBalance]
  );

  // ── deductWallet — debit wallet for booking / overtime ───────────────────
  const deductWallet = useCallback(
    async (amount, bookingId = null, description = "Parking Payment") => {
      if (!userId) throw new Error("Not logged in");
      if (walletBalance < amount)
        throw new Error(
          `Insufficient wallet balance. Need ₹${amount.toFixed(2)}, have ₹${walletBalance.toFixed(2)}.`
        );

      const newBalance = walletBalance - amount;
      const { error: walletErr } = await supabase
        .from("wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (walletErr) throw new Error(walletErr.message);

      await supabase.from("transactions").insert({
        user_id: userId,
        booking_id: bookingId,
        type: "debit",
        amount,
        description,
      });

      setWalletBalance(newBalance);
    },
    [userId, walletBalance]
  );

  // ── processRefund — credit wallet for cancellations / early exit ─────────
  const processRefund = useCallback(
    async (amount, bookingId = null, description = "Refund") => {
      if (!userId) throw new Error("Not logged in");
      if (amount <= 0) return;

      const newBalance = walletBalance + amount;
      const { error: walletErr } = await supabase
        .from("wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (walletErr) throw new Error(walletErr.message);

      await supabase.from("transactions").insert({
        user_id: userId,
        booking_id: bookingId,
        type: "refund",
        amount,
        description,
      });

      setWalletBalance(newBalance);
    },
    [userId, walletBalance]
  );

  return {
    walletBalance,
    transactions,
    walletLoading,
    addMoney,
    deductWallet,
    processRefund,
    fetchWallet,
  };
};

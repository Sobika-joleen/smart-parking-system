// ── Payment Service ────────────────────────────────────────────────────────
// Pure utility functions — no React state, no Supabase calls.
// Import these wherever payment math or UPI simulation is needed.

export const BASE_RATE_PER_HOUR = 30;      // ₹30 / hour
export const OVERTIME_RATE_PER_MINUTE = 5; // ₹5 / minute overtime
export const TAX_RATE = 0.08;              // 8% service tax

/**
 * Calculate total booking amount for a given duration.
 * @param {number} durationHours
 * @returns {{ subtotal: number, tax: number, total: number }}
 */
export function calculateBookingAmount(durationHours) {
  const subtotal = durationHours * BASE_RATE_PER_HOUR;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}

/**
 * Calculate overtime charges if the car is still parked past expected_end.
 * @param {string|Date} expectedEnd
 * @returns {{ extraMinutes: number, extraCharge: number }}
 */
export function calculateOvertime(expectedEnd) {
  if (!expectedEnd) return { extraMinutes: 0, extraCharge: 0 };
  const now = new Date();
  const expected = new Date(expectedEnd);
  if (now <= expected) return { extraMinutes: 0, extraCharge: 0 };
  const extraMinutes = Math.floor((now - expected) / 60000);
  const extraCharge = Math.round(extraMinutes * OVERTIME_RATE_PER_MINUTE * 100) / 100;
  return { extraMinutes, extraCharge };
}

/**
 * Calculate refund for early exit (remaining time before expected_end).
 * @param {string|Date} expectedEnd
 * @returns {number} refund amount in ₹
 */
export function calculateEarlyExitRefund(expectedEnd) {
  if (!expectedEnd) return 0;
  const now = new Date();
  const expected = new Date(expectedEnd);
  if (now >= expected) return 0;
  const remainingMs = expected - now;
  const remainingHours = remainingMs / 3600000;
  return Math.round(remainingHours * BASE_RATE_PER_HOUR * 100) / 100;
}

/**
 * Simulated UPI payment — resolves after ~1.8s.
 * In production, swap this with a real Razorpay call.
 * @param {number} amount  Amount in ₹
 * @returns {Promise<{ success: boolean, transactionId: string, amount: number }>}
 */
export function simulateUPI(amount) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 97% success rate for demo purposes
      if (Math.random() > 0.03) {
        resolve({
          success: true,
          transactionId: `UPI${Date.now()}`,
          amount,
        });
      } else {
        reject(new Error("UPI payment failed. Please try again."));
      }
    }, 1800);
  });
}

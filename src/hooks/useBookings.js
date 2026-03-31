import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";

const TIMEOUT_MS = 15 * 60 * 1000;     // 15 min entry window
const VERIFY_TIMEOUT_MS = 5 * 60 * 1000; // 5 min verification window

export const useBookings = (session) => {
  const [bookings, setBookings] = useState([]);
  const activeTimersRef = useRef({}); // bookingId → { reminder, autoConfirm }

  // ── Fetch all bookings ──────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const formatted = data.map((b) => ({
        id:                   b.id,
        slotId:               b.slot_id,
        level:                b.level,
        userId:               b.user_id,
        name:                 b.booking_name,
        vehicleNumber:        b.vehicle_number,
        times:                b.times,
        timeRange:            b.time_range,
        duration:             b.duration,
        total:                b.total_amount,
        status:               b.status,
        paymentMethod:        b.payment_method  || "upi",
        amountPaid:           b.amount_paid     || 0,
        expectedEnd:          b.expected_end    || null,
        startTime:            b.start_time      || null,
        actualEnd:            b.actual_end      || null,
        overtimeCharge:       b.overtime_charge || 0,
        verificationAttempts: b.verification_attempts || 0,
        verifiedAt:           b.verified_at     || null,
        wrongSlotCount:       b.wrong_slot_count || 0,
        reservedAt:           b.created_at,
        confirmedAt:          null,
        cancelledAt:          null,
      }));
      setBookings(formatted);
    }
  }, []);

  // ── Real-time subscription ──────────────────────────────────────────────
  useEffect(() => {
    fetchBookings();
    const channel = supabase
      .channel("public:bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () =>
        fetchBookings()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings]);

  // ── addBooking ──────────────────────────────────────────────────────────
  const addBooking = useCallback(
    async (data) => {
      if (!session?.user) return null;
      const expectedEnd = new Date(Date.now() + data.duration * 3600000).toISOString();
      const newBookingData = {
        user_id:        session.user.id,
        slot_id:        data.slotId,
        level:          data.level,
        time_range:     data.timeRange,
        times:          data.times || [],
        duration:       data.duration,
        total_amount:   data.total,
        status:         "reserved",
        vehicle_number: data.vehicleNumber,
        booking_name:   data.name,
        payment_method:  data.paymentMethod || "upi",
        amount_paid:     data.amountPaid    || data.total,
        expected_end:    data.expectedEnd   || expectedEnd,
        overtime_charge: 0,
        verification_attempts: 0,
        wrong_slot_count: 0,
      };

      const tempId = `BK-temp-${Date.now()}`;
      const optimistic = {
        ...data,
        status:       "reserved",
        id:           tempId,
        reservedAt:   new Date().toISOString(),
        userId:       session.user.id,
        paymentMethod: data.paymentMethod || "upi",
        amountPaid:   data.amountPaid || data.total,
        expectedEnd:  newBookingData.expected_end,
        verificationAttempts: 0,
        wrongSlotCount: 0,
      };
      setBookings((prev) => [optimistic, ...prev]);

      const { data: inserted, error } = await supabase
        .from("bookings")
        .insert([newBookingData])
        .select()
        .single();

      if (error) {
        setBookings((prev) => prev.filter((b) => b.id !== tempId));
        throw new Error(error.message || "Failed to save booking.");
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === tempId ? { ...b, id: inserted.id, status: inserted.status } : b
        )
      );
      fetchBookings();
      return inserted;
    },
    [session, fetchBookings]
  );

  // ── Generic status updater ──────────────────────────────────────────────
  const updateBookingStatus = useCallback(
    async (bookingId, newStatus, extraFields = {}) => {
      if (!bookingId || bookingId.startsWith("BK-temp")) return;
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus, ...extraFields } : b))
      );
      const { data, error } = await supabase
        .from("bookings")
        .update({ status: newStatus, ...extraFields })
        .eq("id", bookingId)
        .select();
      if (error || !data || data.length === 0) {
        console.error("[useBookings] Update failed:", error?.message);
        fetchBookings();
      }
    },
    [fetchBookings]
  );

  // ── Status transitions ──────────────────────────────────────────────────

  /** Sensor detected car → awaiting user confirmation */
  const markParkedUnverified = useCallback(
    (bookingId) =>
      updateBookingStatus(bookingId, "parked_unverified", {
        verification_attempts: 1,
      }),
    [updateBookingStatus]
  );

  /** User confirmed → booking becomes active, timer starts */
  const confirmParking = useCallback(
    (bookingId) =>
      updateBookingStatus(bookingId, "confirmed", {
        start_time:  new Date().toISOString(),
        verified_at: new Date().toISOString(),
      }),
    [updateBookingStatus]
  );

  /** Legacy alias — used by IoT direct-confirm path */
  const confirmBooking = useCallback(
    (bookingId) =>
      updateBookingStatus(bookingId, "confirmed", {
        start_time: new Date().toISOString(),
      }),
    [updateBookingStatus]
  );

  /** User says Wrong Slot → revert to reserved, increment wrong_slot_count */
  const handleWrongSlot = useCallback(
    async (bookingId) => {
      const booking = bookings.find((b) => b.id === bookingId);
      const wrongCount = (booking?.wrongSlotCount || 0) + 1;
      await updateBookingStatus(bookingId, "reserved", {
        wrong_slot_count: wrongCount,
      });
    },
    [bookings, updateBookingStatus]
  );

  /** Auto-assign / fallback confirm after timeout */
  const autoAssignSlot = useCallback(
    (bookingId) =>
      updateBookingStatus(bookingId, "confirmed", {
        start_time:  new Date().toISOString(),
        verified_at: new Date().toISOString(),
        verification_attempts: 99, // flag as auto-confirmed
      }),
    [updateBookingStatus]
  );

  /** Increment attempts + re-fire from hook side */
  const triggerReminder = useCallback(
    async (bookingId) => {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking || booking.status !== "parked_unverified") return;
      await updateBookingStatus(bookingId, "parked_unverified", {
        verification_attempts: (booking.verificationAttempts || 0) + 1,
      });
    },
    [bookings, updateBookingStatus]
  );

  const cancelBooking = useCallback(
    (bookingId) => updateBookingStatus(bookingId, "cancelled"),
    [updateBookingStatus]
  );

  const reassignSlot = useCallback(
    async (bookingId, newSlotId, newLevel) => {
      await updateBookingStatus(bookingId, "confirmed", {
        slot_id: newSlotId,
        level: newLevel,
        start_time: new Date().toISOString(),
        verified_at: new Date().toISOString(),
      });
    },
    [updateBookingStatus]
  );


  const activateBooking = useCallback(
    (bookingId) =>
      updateBookingStatus(bookingId, "confirmed", {
        start_time: new Date().toISOString(),
      }),
    [updateBookingStatus]
  );

  const completeBooking = useCallback(
    (bookingId, overtimeCharge = 0) =>
      updateBookingStatus(bookingId, "completed", {
        actual_end:      new Date().toISOString(),
        overtime_charge: overtimeCharge,
      }),
    [updateBookingStatus]
  );

  const deleteBooking = useCallback(
    async (bookingId) => {
      if (!bookingId || bookingId.startsWith("BK-temp")) return;
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
      if (error) {
        console.error("Error deleting booking:", error);
        fetchBookings();
      }
    },
    [fetchBookings]
  );

  // ── Admin: fetch & update ANY booking (bypass user_id filter) ──────────
  const adminUpdateBooking = useCallback(
    async (bookingId, newStatus, extraFields = {}) => {
      if (!bookingId) return;
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus, ...extraFields } : b))
      );
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus, ...extraFields })
        .eq("id", bookingId);
      if (error) {
        console.error("[Admin] Update failed:", error?.message);
        fetchBookings();
      }
    },
    [fetchBookings]
  );

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getActiveReservation = useCallback(
    (slotId, level) =>
      bookings.find(
        (b) =>
          b.slotId === slotId &&
          b.level  === level &&
          (b.status === "reserved" ||
           b.status === "parked_unverified" ||
           b.status === "confirmed")
      ) || null,
    [bookings]
  );

  const reservedBookings = useMemo(
    () => bookings.filter((b) => b.status === "reserved"),
    [bookings]
  );

  const unverifiedBookings = useMemo(
    () => bookings.filter((b) => b.status === "parked_unverified"),
    [bookings]
  );

  const getTimedOutBookings = useCallback(() => {
    const now = Date.now();
    return bookings.filter(
      (b) =>
        b.status === "reserved" &&
        b.reservedAt &&
        now - new Date(b.reservedAt).getTime() > TIMEOUT_MS
    );
  }, [bookings]);

  return {
    bookings,
    addBooking,
    confirmBooking,
    confirmParking,
    reassignSlot,
    markParkedUnverified,
    handleWrongSlot,
    autoAssignSlot,
    triggerReminder,
    cancelBooking,
    activateBooking,
    completeBooking,
    deleteBooking,
    adminUpdateBooking,
    getActiveReservation,
    reservedBookings,
    unverifiedBookings,
    getTimedOutBookings,
    TIMEOUT_MS,
    VERIFY_TIMEOUT_MS,
    activeTimersRef,
  };
};

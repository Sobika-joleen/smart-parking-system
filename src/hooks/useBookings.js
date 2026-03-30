import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes entry window

export const useBookings = (session) => {
  const [bookings, setBookings] = useState([]);

  // ── Fetch all bookings ──────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const formatted = data.map((b) => ({
        id:             b.id,
        slotId:         b.slot_id,
        level:          b.level,
        userId:         b.user_id,
        name:           b.booking_name,
        vehicleNumber:  b.vehicle_number,
        times:          b.times,
        timeRange:      b.time_range,
        duration:       b.duration,
        total:          b.total_amount,
        status:         b.status,
        // payment / lifecycle fields
        paymentMethod:  b.payment_method  || "upi",
        amountPaid:     b.amount_paid     || 0,
        expectedEnd:    b.expected_end    || null,
        startTime:      b.start_time      || null,
        actualEnd:      b.actual_end      || null,
        overtimeCharge: b.overtime_charge || 0,
        // timestamps
        reservedAt:     b.created_at,
        confirmedAt:    null,
        cancelledAt:    null,
      }));
      setBookings(formatted);
    }
  }, []);

  // ── Real-time subscription ──────────────────────────────────────────────
  useEffect(() => {
    fetchBookings();

    const channel = supabase
      .channel("public:bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchBookings()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings]);

  // ── addBooking — insert a new booking with payment fields ───────────────
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
        // new payment / lifecycle fields
        payment_method:  data.paymentMethod  || "upi",
        amount_paid:     data.amountPaid     || data.total,
        expected_end:    data.expectedEnd    || expectedEnd,
        overtime_charge: 0,
      };

      // Optimistic UI
      const tempId = `BK-temp-${Date.now()}`;
      const optimistic = {
        ...data,
        status:         "reserved",
        id:             tempId,
        reservedAt:     new Date().toISOString(),
        userId:         session.user.id,
        paymentMethod:  data.paymentMethod || "upi",
        amountPaid:     data.amountPaid    || data.total,
        expectedEnd:    newBookingData.expected_end,
      };
      setBookings((prev) => [optimistic, ...prev]);

      const { data: inserted, error } = await supabase
        .from("bookings")
        .insert([newBookingData])
        .select()
        .single();

      if (error) {
        setBookings((prev) => prev.filter((b) => b.id !== tempId));
        throw new Error(error.message || "Failed to save booking. Did you run the SQL scripts?");
      }

      // Replace temp row with real DB row
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
  const confirmBooking = useCallback(
    (bookingId) =>
      updateBookingStatus(bookingId, "confirmed", {
        start_time: new Date().toISOString(),
      }),
    [updateBookingStatus]
  );

  const cancelBooking = useCallback(
    (bookingId) => updateBookingStatus(bookingId, "cancelled"),
    [updateBookingStatus]
  );

  // activateBooking = manual "Car Arrived" trigger (alias for confirm)
  const activateBooking = useCallback(
    (bookingId) =>
      updateBookingStatus(bookingId, "confirmed", {
        start_time: new Date().toISOString(),
      }),
    [updateBookingStatus]
  );

  // completeBooking = "Exit & Pay" — sets completed + actual_end + overtime
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

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getActiveReservation = useCallback(
    (slotId, level) =>
      bookings.find(
        (b) =>
          b.slotId === slotId &&
          b.level  === level &&
          (b.status === "reserved" || b.status === "confirmed")
      ) || null,
    [bookings]
  );

  const reservedBookings = useMemo(
    () => bookings.filter((b) => b.status === "reserved"),
    [bookings]
  );

  // Bookings that timed out (reserved 15+ mins ago, car never arrived)
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
    cancelBooking,
    activateBooking,
    completeBooking,
    deleteBooking,
    getActiveReservation,
    reservedBookings,
    getTimedOutBookings,
    TIMEOUT_MS,
  };
};

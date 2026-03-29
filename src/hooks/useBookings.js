import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const useBookings = (session) => {
  const [bookings, setBookings] = useState([]);

  // Fetch all bookings for the map (even other people's, just to mark spots occupied),
  // but we mostly need user's own bookings for the history panel and operations.
  const fetchBookings = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Map DB columns back to frontend state shape
      const formatted = data.map((b) => ({
        id: b.id,
        slotId: b.slot_id,
        level: b.level,
        userId: b.user_id,
        name: b.booking_name,
        vehicleNumber: b.vehicle_number,
        times: b.times,
        timeRange: b.time_range,
        duration: b.duration,
        total: b.total_amount,
        status: b.status,
        reservedAt: b.created_at,
        confirmedAt: null, // we can track these later if needed
        cancelledAt: null,
      }));
      setBookings(formatted);
    }
  }, []);

  useEffect(() => {
    fetchBookings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("public:bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings]);

  const addBooking = useCallback(async (data) => {
    if (!session?.user) return null;

    const newBookingData = {
      user_id: session.user.id,
      slot_id: data.slotId,
      level: data.level,
      time_range: data.timeRange,
      times: data.times || [],
      duration: data.duration,
      total_amount: data.total,
      status: "reserved",
      vehicle_number: data.vehicleNumber,
      booking_name: data.name,
    };

    // Optimistic UI update
    const tempId = `BK-temp-${Date.now()}`;
    const optimisticBooking = { ...data, status: "reserved", id: tempId, reservedAt: new Date().toISOString(), userId: session.user.id };
    setBookings((prev) => [optimisticBooking, ...prev]);

    const { data: inserted, error } = await supabase
      .from("bookings")
      .insert([newBookingData])
      .select()
      .single();

    if (error) {
      console.error("Error creating booking:", error);
      // Revert optimistic insert
      setBookings((prev) => prev.filter((b) => b.id !== tempId));
      throw new Error(error.message || "Failed to save booking to database. Did you run the SQL script?");
    }

    // Replace the optimistic tempId with the real UUID from the database immediately
    setBookings((prev) => 
      prev.map(b => b.id === tempId ? { ...b, id: inserted.id, status: inserted.status } : b)
    );
    
    // Also trigger a background fetch just to sync perfectly
    fetchBookings();

    return inserted;
  }, [session, fetchBookings]);

  const updateBookingStatus = useCallback(async (bookingId, newStatus) => {
    // Only update if it's a real DB uuid (ignore temp ones still processing)
    if (!bookingId || bookingId.startsWith("BK-temp")) return;

    // Optimistic UI
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    );

    const { data, error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId)
      .select();

    if (error) {
      console.error("Error updating status:", error);
      fetchBookings(); // revert
      alert("Database Error Update: " + error.message);
    } else if (!data || data.length === 0) {
      console.error("RLS blocked update or row not found for ID:", bookingId);
      fetchBookings(); // revert
      alert("Database silently blocked the update! RLS Policy failed. Are you logged in?");
    }
  }, [fetchBookings]);

  const confirmBooking = useCallback(
    (bookingId) => updateBookingStatus(bookingId, "confirmed"),
    [updateBookingStatus]
  );

  const cancelBooking = useCallback(
    (bookingId) => updateBookingStatus(bookingId, "cancelled"),
    [updateBookingStatus]
  );

  const deleteBooking = useCallback(async (bookingId) => {
    if (!bookingId || bookingId.startsWith("BK-temp")) return;
    
    // Optimistic UI
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));

    const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
    if (error) {
      console.error("Error deleting booking:", error);
      fetchBookings(); // revert
    }
  }, [fetchBookings]);

  const getActiveReservation = useCallback(
    (slotId, level) =>
      bookings.find(
        (b) =>
          b.slotId === slotId &&
          b.level === level &&
          (b.status === "reserved" || b.status === "confirmed")
      ) || null,
    [bookings]
  );

  const reservedBookings = useMemo(() => bookings.filter((b) => b.status === "reserved"), [bookings]);

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
    deleteBooking,
    getActiveReservation,
    reservedBookings,
    getTimedOutBookings,
    TIMEOUT_MS,
  };
};

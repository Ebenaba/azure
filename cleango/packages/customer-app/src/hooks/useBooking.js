import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { bookingsApi } from '../services/api';

const QUERY_KEYS = {
  bookings: 'bookings',
  booking: (id) => ['booking', id],
  bookingStatus: (id) => ['bookingStatus', id],
};

// ── List of bookings ──────────────────────────────────────────────────────────
export const useBookings = (params = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.bookings, params],
    queryFn: async () => {
      const res = await bookingsApi.list(params);
      return res.data?.data || res.data || [];
    },
    staleTime: 30_000,
  });
};

// ── Upcoming and past helpers ─────────────────────────────────────────────────
export const useUpcomingBookings = () =>
  useBookings({ status: 'upcoming' });

export const usePastBookings = () =>
  useBookings({ status: 'past' });

// ── Single booking ────────────────────────────────────────────────────────────
export const useBooking = (id) => {
  return useQuery({
    queryKey: QUERY_KEYS.booking(id),
    queryFn: async () => {
      const res = await bookingsApi.get(id);
      return res.data?.data || res.data;
    },
    enabled: !!id,
    staleTime: 20_000,
  });
};

// ── Create booking ────────────────────────────────────────────────────────────
export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingData) => bookingsApi.create(bookingData).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.bookings] });
    },
  });
};

// ── Cancel booking ────────────────────────────────────────────────────────────
export const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }) =>
      bookingsApi.cancel(id, reason).then((r) => r.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.bookings] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.booking(variables.id) });
    },
  });
};

// ── Real-time booking status via Firestore ────────────────────────────────────
export const useBookingStatus = (bookingId) => {
  const [status, setStatus] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    const ref = doc(db, 'bookings', bookingId);

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setStatus(data.status);
          setStatusData(data);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('[useBookingStatus] error:', err);
        setError(err);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [bookingId]);

  return { status, statusData, loading, error };
};

export default {
  useBookings,
  useUpcomingBookings,
  usePastBookings,
  useBooking,
  useCreateBooking,
  useCancelBooking,
  useBookingStatus,
};

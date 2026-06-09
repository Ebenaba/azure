import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { doc, onSnapshot, query, collection, where, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getBookingDraft, setBookingDraft, clearBookingDraft } from '../services/storage';
import { useAuth } from './AuthContext';

const BookingContext = createContext(null);

export const BookingProvider = ({ children }) => {
  const { firebaseUser } = useAuth();
  const [bookingDraft, setBookingDraftState] = useState(() => getBookingDraft());
  const [activeJob, setActiveJob] = useState(null);
  const [activeJobLoading, setActiveJobLoading] = useState(false);

  // ── Real-time listener for the customer's active booking ─────────────────
  useEffect(() => {
    if (!firebaseUser?.uid) {
      setActiveJob(null);
      return;
    }

    setActiveJobLoading(true);

    const q = query(
      collection(db, 'bookings'),
      where('customerId', '==', firebaseUser.uid),
      where('status', 'in', ['confirmed', 'en_route', 'in_progress']),
      limit(1),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setActiveJob(null);
        } else {
          const docSnap = snapshot.docs[0];
          setActiveJob({ id: docSnap.id, ...docSnap.data() });
        }
        setActiveJobLoading(false);
      },
      (error) => {
        console.warn('[BookingContext] active job listener error:', error);
        setActiveJobLoading(false);
      },
    );

    return unsubscribe;
  }, [firebaseUser?.uid]);

  // ── Draft management ──────────────────────────────────────────────────────
  const updateDraft = useCallback((updates) => {
    setBookingDraftState((prev) => {
      const next = { ...(prev || {}), ...updates };
      setBookingDraft(next);
      return next;
    });
  }, []);

  const clearDraft = useCallback(() => {
    clearBookingDraft();
    setBookingDraftState(null);
  }, []);

  const value = {
    bookingDraft,
    updateDraft,
    clearDraft,
    activeJob,
    activeJobLoading,
    hasActiveJob: !!activeJob,
  };

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
};

export const useBookingContext = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBookingContext must be used within BookingProvider');
  return ctx;
};

export default BookingContext;

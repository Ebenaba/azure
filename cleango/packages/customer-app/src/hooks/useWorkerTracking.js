import { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Subscribe to real-time worker location from Firestore.
 * Collection: workerLocations/{workerId}
 * Expected document shape: { lat, lng, updatedAt, status, heading? }
 *
 * @param {string|null} workerId
 * @returns {{ lat: number|null, lng: number|null, updatedAt: Date|null, status: string|null, heading: number|null, online: boolean, loading: boolean }}
 */
const useWorkerTracking = (workerId) => {
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    updatedAt: null,
    status: null,
    heading: null,
    online: false,
  });
  const [loading, setLoading] = useState(true);
  const staleTimerRef = useRef(null);

  useEffect(() => {
    if (!workerId) {
      setLoading(false);
      return;
    }

    const ref = doc(db, 'workerLocations', workerId);

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();

          // Convert Firestore Timestamp → Date
          const updatedAt =
            data.updatedAt?.toDate?.() ||
            (data.updatedAt ? new Date(data.updatedAt) : null);

          setLocation({
            lat: data.lat ?? null,
            lng: data.lng ?? null,
            updatedAt,
            status: data.status ?? null,
            heading: data.heading ?? null,
            online: data.status !== 'offline',
          });

          // Mark as stale if no update in 5 minutes
          if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
          staleTimerRef.current = setTimeout(() => {
            setLocation((prev) => ({ ...prev, online: false }));
          }, 5 * 60 * 1000);
        } else {
          setLocation({
            lat: null,
            lng: null,
            updatedAt: null,
            status: null,
            heading: null,
            online: false,
          });
        }
        setLoading(false);
      },
      (error) => {
        console.warn('[useWorkerTracking] Firestore error:', error);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    };
  }, [workerId]);

  return { ...location, loading };
};

export default useWorkerTracking;

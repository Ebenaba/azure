import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { auth } from '../services/firebase';
import { profileApi } from '../services/api';
import { authEventEmitter } from '../services/api';
import { clearAll, setUser, getUser } from '../services/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const confirmationRef = useRef(null);

  // ── Persist Firebase ID token to SecureStore ─────────────────────────────
  const persistToken = async (fbUser) => {
    if (!fbUser) {
      await SecureStore.deleteItemAsync('authToken').catch(() => {});
      return;
    }
    try {
      const token = await fbUser.getIdToken();
      await SecureStore.setItemAsync('authToken', token);
    } catch {}
  };

  // ── Sync profile from backend ─────────────────────────────────────────────
  const syncProfile = async () => {
    try {
      const res = await profileApi.get();
      const profile = res.data?.data || res.data;
      setUser(profile);
      setUserState(profile);
      return profile;
    } catch {
      // If the backend 404s the user doesn't have a profile yet
      return null;
    }
  };

  // ── Auth state listener ───────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await persistToken(fbUser);
        const profile = await syncProfile();
        if (!profile) setIsNewUser(true);
      } else {
        setUserState(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ── Listen for 401 → force sign-out ──────────────────────────────────────
  useEffect(() => {
    const handleUnauthorized = () => signOut();
    authEventEmitter.on('unauthorized', handleUnauthorized);
    return () => authEventEmitter.off('unauthorized', handleUnauthorized);
  }, []);

  // ── Phone OTP Flow ────────────────────────────────────────────────────────
  /**
   * Send OTP to the given phone number (E.164 format expected).
   * The recaptchaVerifier is only required on web.
   */
  const sendOTP = useCallback(async (phoneNumber, recaptchaVerifier = null) => {
    setLoading(true);
    try {
      const formatted = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+234${phoneNumber.replace(/^0/, '')}`;

      const confirmation = await signInWithPhoneNumber(
        auth,
        formatted,
        recaptchaVerifier,
      );
      confirmationRef.current = confirmation;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Verify the 6-digit OTP code.
   */
  const verifyOTP = useCallback(async (code) => {
    if (!confirmationRef.current) {
      return { success: false, error: 'No pending confirmation. Please resend OTP.' };
    }
    setLoading(true);
    try {
      const result = await confirmationRef.current.confirm(code);
      const fbUser = result.user;
      await persistToken(fbUser);

      // additionalUserInfo.isNewUser from Firebase
      const isNew = result.additionalUserInfo?.isNewUser ?? false;
      setIsNewUser(isNew);

      if (!isNew) {
        await syncProfile();
      }

      return { success: true, isNewUser: isNew };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Google Sign-In ────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async (idToken) => {
    setLoading(true);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      await persistToken(result.user);
      const isNew = result.additionalUserInfo?.isNewUser ?? false;
      setIsNewUser(isNew);
      if (!isNew) await syncProfile();
      return { success: true, isNewUser: isNew };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Sign Out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch {}
    clearAll();
    setUserState(null);
    setFirebaseUser(null);
    setIsNewUser(false);
    confirmationRef.current = null;
  }, []);

  // ── Update user profile in context ───────────────────────────────────────
  const updateUser = useCallback((updates) => {
    setUserState((prev) => {
      const updated = { ...prev, ...updates };
      setUser(updated);
      return updated;
    });
  }, []);

  const value = {
    user,
    firebaseUser,
    loading,
    isNewUser,
    isAuthenticated: !!firebaseUser,
    sendOTP,
    verifyOTP,
    signInWithGoogle,
    signOut,
    updateUser,
    syncProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;


import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, getValidAccessToken } from '@/lib/supabase';
import type { Hostel, UserRole, Student, Warden } from '@/lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: UserRole;
  hostel: Hostel | null;
  student: Student | null;
  warden: Warden | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [warden, setWarden] = useState<Warden | null>(null);
  const [loading, setLoading] = useState(true);

  const identityRef = useRef<{
    id: string | null | undefined
  }>({ id: undefined });

  function clearProfile() {
    setRole(null);
    setHostel(null);
    setStudent(null);
    setWarden(null);
  }

  async function loadProfile(currentUser: User) {
    const identity = identityRef.current;

    const isCurrent = () =>
      identityRef.current === identity &&
      identity.id === currentUser.id;

    if (!isCurrent()) return;

    // Check if the user is a warden
    const { data: wardenRow, error: wardenError } = await supabase
      .from('wardens')
      .select('id, hostel_id, created_at')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (!isCurrent()) return;
    if (wardenError) throw wardenError;

    if (wardenRow) {
      const { data: hostelRow, error: hostelError } = await supabase
        .from('hostels')
        .select('*')
        .eq('id', (wardenRow as Warden).hostel_id)
        .maybeSingle();

      if (!isCurrent()) return;
      if (hostelError) throw hostelError;

      setRole('warden');
      setWarden(wardenRow as Warden);
      setStudent(null);
      setHostel(hostelRow as Hostel);
      return;
    }

    // Check if the user is a student
    const { data: studentRow, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (!isCurrent()) return;
    if (studentError) throw studentError;

    if (studentRow) {
      const { data: hostelRow, error: hostelError } = await supabase
        .from('hostels')
        .select('*')
        .eq('id', (studentRow as Student).hostel_id)
        .maybeSingle();

      if (!isCurrent()) return;
      if (hostelError) throw hostelError;

      setRole('student');
      setStudent(studentRow as Student);
      setWarden(null);
      setHostel(hostelRow as Hostel);
      return;
    }

    clearProfile();
  }

  async function refreshProfile() {
    if (user) {
      await loadProfile(user);
    }
  }

  async function getAccessToken(): Promise<string | null> {
    const token = await getValidAccessToken();

    if (token) {
      const identity = identityRef.current;

      const {
        data: { session: s }
      } = await supabase.auth.getSession();

      if (
        s &&
        identityRef.current === identity &&
        identity.id === s.user.id
      ) {
        setSession(s);
        setUser(s.user);
      }
    }

    return token;
  }

  useEffect(() => {
    let isMounted = true;
    let pending: ReturnType<typeof setTimeout> | undefined;

    identityRef.current = { id: undefined };

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!isMounted) return;

      setSession(s);
      setUser(s?.user ?? null);

      const nextId = s?.user.id ?? null;

      // Prevent unnecessary loading when switching tabs
      // or refreshing the authentication token.
      if (identityRef.current.id === nextId) {
        return;
      }

      const identity = { id: nextId };

      identityRef.current = identity;

      clearTimeout(pending);
      clearProfile();

      // Handle logout
      if (!s?.user) {
        setLoading(false);
        return;
      }

      // Show loading only for initial login or account changes
      setLoading(true);

      const nextUser = s.user;

      // Run database requests outside the authentication callback
      pending = setTimeout(async () => {
        try {
          await loadProfile(nextUser);
        } catch (error) {
          console.error('Profile loading failed:', error);
        } finally {
          if (
            isMounted &&
            identityRef.current === identity
          ) {
            setLoading(false);
          }
        }
      }, 0);
    });

    return () => {
      isMounted = false;
      clearTimeout(pending);
      identityRef.current = { id: undefined };
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        hostel,
        student,
        warden,
        loading,
        signOut,
        refreshProfile,
        getAccessToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}

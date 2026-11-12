
import { supabase } from '@/lib/supabase';

export interface CreateStudentParams {
  email: string;
  password: string;
  fullName: string;
  hostelId: string;
}

export interface BulkCreateStudentsResult {
  name: string;
  email: string;
  password: string;
  status: 'created' | 'failed';
  error?: string;
}

/**
 * Gets the logged-in user's access token.
 * Refreshes the session if the token is about to expire.
 */
export async function getValidAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      console.error('[AUTH DEBUG] No session found:', error?.message);
      return null;
    }

    const expiresAt = data.session.expires_at ?? 0;
    const now = Math.floor(Date.now() / 1000);

    if (expiresAt <= now + 60) {
      const { data: refreshed, error: refreshError } =
        await supabase.auth.refreshSession();

      if (refreshError) {
        console.error('[AUTH DEBUG] Refresh failed:', refreshError.message);
        return null;
      }

      return refreshed.session?.access_token ?? null;
    }

    return data.session.access_token;
  } catch (error) {
    console.error('[AUTH DEBUG] Token retrieval failed:', error);
    return null;
  }
}

async function extractErrorMessage(
  fnError: unknown,
  data?: { error?: string } | null,
  fallbackMessage = 'Request failed'
): Promise<string> {
  if (data?.error) return data.error;

  if (fnError && typeof fnError === 'object' && 'context' in fnError) {
    try {
      const ctx = (fnError as { context?: Response }).context;

      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error) return body.error;
      }
    } catch {
      // Ignore response parsing errors
    }
  }

  if (fnError instanceof Error && fnError.message) {
    return fnError.message;
  }

  return fallbackMessage;
}

/**
 * Creates a student account using the warden's access token.
 */
export async function createStudentAccount(
  params: CreateStudentParams,
  providedToken?: string
): Promise<{ studentId: string }> {
  const token = await getValidAccessToken() || providedToken;

  // Safe diagnostics: never print the complete token.
  console.log('[AUTH DEBUG] Create student:', {
    hasToken: !!token,
    tokenPrefix: token?.slice(0, 3),
    providedTokenPrefix: providedToken?.slice(0, 3),
  });

  if (!token || token.startsWith('sb_publishable_')) {
    throw new Error(
      'Valid warden login session not found. Please sign out and sign in again.'
    );
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error('Supabase configuration is missing.');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/create-student`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: params.email.trim(),
        password: params.password,
        fullName: params.fullName.trim(),
        hostelId: params.hostelId,
      }),
    }
  );

  let data: {
    success?: boolean;
    studentId?: string;
    error?: string;
  };

  try {
    data = await response.json();
  } catch {
    throw new Error('Could not read the server response.');
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to create student');
  }

  if (!data.studentId) {
    throw new Error('Student was created, but no student ID was returned.');
  }

  return { studentId: data.studentId };
}

/**
 * Bulk creates student accounts.
 */
export async function bulkCreateStudents(
  hostelId: string,
  students: string[],
  providedToken?: string
): Promise<BulkCreateStudentsResult[]> {
  const token = await getValidAccessToken() || providedToken;

  if (!token || token.startsWith('sb_publishable_')) {
    throw new Error(
      'Your session has expired. Please sign out and sign in again.'
    );
  }

  const { data, error: fnError } =
    await supabase.functions.invoke('bulk-create-students', {
      body: { hostelId, students },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

  if (fnError) {
    throw new Error(
      await extractErrorMessage(fnError, data, 'Failed to bulk create students')
    );
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to bulk create students');
  }

  return data.results || [];
}

/**
 * Deletes a student account.
 */
export async function deleteStudentAccount(
  studentId: string,
  providedToken?: string
): Promise<void> {
  const token = await getValidAccessToken() || providedToken;

  if (!token || token.startsWith('sb_publishable_')) {
    throw new Error(
      'Your session has expired. Please sign out and sign in again.'
    );
  }

  const { data, error: fnError } =
    await supabase.functions.invoke('delete-student', {
      body: { studentId },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

  if (fnError) {
    throw new Error(
      await extractErrorMessage(
        fnError,
        data,
        'Could not remove this student. Please try again.'
      )
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.error || 'Could not remove this student. Please try again.'
    );
  }
}

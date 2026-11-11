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
 * Returns a valid, non-expired Supabase access token.
 * Refreshes the token automatically if expired or expiring within 60 seconds.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;

  const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
  if (expiresAt && expiresAt - Date.now() < 60000) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed.session) {
      return refreshed.session.access_token;
    }
  }

  return session.access_token;
}

/**
 * Creates a student account via the create-student Edge Function.
 */
export async function createStudentAccount(
  params: CreateStudentParams,
  providedToken?: string
): Promise<{ studentId: string }> {
  const token = providedToken || (await getValidAccessToken());
  if (!token) {
    throw new Error('Your session has expired. Please sign out and sign in again.');
  }

  const { data, error: fnError } = await supabase.functions.invoke('create-student', {
    body: {
      email: params.email.trim(),
      password: params.password,
      fullName: params.fullName.trim(),
      hostelId: params.hostelId,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (fnError) {
    throw new Error(data?.error || fnError.message || 'Failed to create student');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to create student');
  }

  return { studentId: data.studentId };
}

/**
 * Bulk creates student accounts via the bulk-create-students Edge Function.
 */
export async function bulkCreateStudents(
  hostelId: string,
  students: string[],
  providedToken?: string
): Promise<BulkCreateStudentsResult[]> {
  const token = providedToken || (await getValidAccessToken());
  if (!token) {
    throw new Error('Your session has expired. Please sign out and sign in again.');
  }

  const { data, error: fnError } = await supabase.functions.invoke('bulk-create-students', {
    body: {
      hostelId,
      students,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (fnError) {
    throw new Error(data?.error || fnError.message || 'Failed to bulk create students');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to bulk create students');
  }

  return data.results || [];
}

/**
 * Deletes a student account via the delete-student Edge Function.
 */
export async function deleteStudentAccount(
  studentId: string,
  providedToken?: string
): Promise<void> {
  const token = providedToken || (await getValidAccessToken());
  if (!token) {
    throw new Error('Your session has expired. Please sign out and sign in again.');
  }

  const { data, error: fnError } = await supabase.functions.invoke('delete-student', {
    body: { studentId },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (fnError) {
    throw new Error(data?.error || fnError.message || 'Could not remove this student. Please try again.');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Could not remove this student. Please try again.');
  }
}

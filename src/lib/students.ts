import { supabase, getValidAccessToken } from '@/lib/supabase';

export { getValidAccessToken };

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
      // Ignore parse error
    }
  }
  if (fnError instanceof Error && fnError.message) {
    return fnError.message;
  }
  return fallbackMessage;
}

/**
 * Creates a student account via the create-student Edge Function.
 */
export async function createStudentAccount(
  params: CreateStudentParams,
  providedToken?: string
): Promise<{ studentId: string }> {
  const token = (await getValidAccessToken()) || providedToken;
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
    const errorMsg = await extractErrorMessage(fnError, data, 'Failed to create student');
    throw new Error(errorMsg);
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
  const token = (await getValidAccessToken()) || providedToken;
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
    const errorMsg = await extractErrorMessage(fnError, data, 'Failed to bulk create students');
    throw new Error(errorMsg);
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
  const token = (await getValidAccessToken()) || providedToken;
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
    const errorMsg = await extractErrorMessage(fnError, data, 'Could not remove this student. Please try again.');
    throw new Error(errorMsg);
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Could not remove this student. Please try again.');
  }
}

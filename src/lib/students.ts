export async function deleteStudentAccount(studentId: string, accessToken: string): Promise<void> {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-student`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ studentId }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || 'Could not remove this student. Please try again.');
  }
}

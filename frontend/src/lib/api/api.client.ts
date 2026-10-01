//Created para ma centralized ang pagtawag sa back instead of using fetch kada page
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set('Content-Type', 'application/json');

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? `Request failed with status ${response.status}`);
  }

  return response.json();
}
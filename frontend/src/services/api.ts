const API_URL = import.meta.env.VITE_API_URL;

interface ApiOptions extends RequestInit {
  accessToken?: string | null;
  retryOnUnauthorized?: boolean;
}

interface RefreshResponse {
  access_token: string;
}

let authStateHandler: ((accessToken: string | null) => void) | null = null;
let refreshPromise: Promise<string> | null = null;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function setApiAuthStateHandler(handler: ((accessToken: string | null) => void) | null) {
  authStateHandler = handler;

  return () => {
    if (authStateHandler === handler) authStateHandler = null;
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const responseText = await response.text();

  let responseData: unknown = null;

  if (responseText) {
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    if (typeof responseData === 'object' && responseData !== null && 'message' in responseData) {
      const backendMessage = responseData.message;

      if (typeof backendMessage === 'string') {
        message = backendMessage;
      } else if (Array.isArray(backendMessage)) {
        message = backendMessage.filter((item): item is string => typeof item === 'string').join(' ');
      }
    }

    throw new ApiError(message, response.status);
  }

  return responseData as T;
}

async function performRequest(path: string, options: ApiOptions, accessToken: string | null) {
  const { accessToken: _ignoredAccessToken, retryOnUnauthorized: _ignoredRetry, headers: customHeaders, ...requestOptions } = options;
  const headers = new Headers(customHeaders);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers,
    credentials: requestOptions.credentials ?? 'include',
  });
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        const data = await parseResponse<RefreshResponse>(response);

        if (!data.access_token) {
          throw new ApiError('Refresh response did not contain an access token', 401);
        }

        authStateHandler?.(data.access_token);

        return data.access_token;
      } catch (error) {
        authStateHandler?.(null);
        throw error;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function refreshApiSession() {
  const accessToken = await refreshAccessToken();

  return {
    access_token: accessToken,
  };
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const requestAccessToken = options.accessToken ?? null;
  const response = await performRequest(path, options, requestAccessToken);

  if (response.status === 401 && requestAccessToken && options.retryOnUnauthorized !== false) {
    try {
      const refreshedAccessToken = await refreshAccessToken();
      const retryResponse = await performRequest(path, options, refreshedAccessToken);

      return parseResponse<T>(retryResponse);
    } catch {
      return parseResponse<T>(response);
    }
  }

  return parseResponse<T>(response);
}
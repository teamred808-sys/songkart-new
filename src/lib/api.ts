export const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const apiFetch = async (path: string, options?: RequestInit) => {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) || {})
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers,
    ...options,
  });
  
  if (!res.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // Ignored
    }
    throw new Error(errorMessage);
  }

  // Check if there is content to parse
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return {} as any;
  }

  return res.json();
};

// Keep the ApiClient for backwards compatibility with the previous step
class ApiClient {
  async get<T>(endpoint: string): Promise<T> {
    return apiFetch(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return apiFetch(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return apiFetch(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return apiFetch(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

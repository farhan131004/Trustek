// API service for Trustek backend
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api');

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
  result?: T;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  registerNumber?: string;
}

class ApiService {
  private getAuthToken(): string | null {
    const tokens = localStorage.getItem('trustek_tokens');
    if (tokens) {
      const parsedTokens = JSON.parse(tokens);
      return parsedTokens.accessToken;
    }
    return null;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) return {} as T;

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        return (await response.json()) as T;
      } catch {
        return {} as T;
      }
    }

    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      return {} as T;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const data = await this.parseResponse<ApiResponse<T> & T>(response);

    if (!response.ok) {
      const message = (data as any)?.message || (data as any)?.error || `Request failed (${response.status})`;
      throw new Error(message);
    }

    // Support {success,message,data} or {result}
    if ((data as any)?.data !== undefined) return (data as any).data as T;
    if ((data as any)?.result !== undefined) return (data as any).result as T;

    return data as T;
  }

  // Authentication methods
  async register(email: string, password: string, name: string): Promise<{ user: User; tokens: AuthTokens }> {
    const data = await this.makeRequest<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });

    const tokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenType: data.tokenType || 'Bearer',
    };
    const user = data.user as User;

    localStorage.setItem('trustek_tokens', JSON.stringify(tokens));
    localStorage.setItem('trustek_user', JSON.stringify(user));

    return { user, tokens };
  }

  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const data = await this.makeRequest<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const tokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenType: data.tokenType || 'Bearer',
    };
    const user = data.user as User;

    localStorage.setItem('trustek_tokens', JSON.stringify(tokens));
    localStorage.setItem('trustek_user', JSON.stringify(user));

    return { user, tokens };
  }

  async logout(): Promise<void> {
    localStorage.removeItem('trustek_tokens');
    localStorage.removeItem('trustek_user');
  }

  async getCurrentUser(): Promise<User> {
    const data = await this.makeRequest<any>('/auth/me');
    return (data.user ?? data) as User;
  }

  // ML Service - Fake News Detection
  async analyzeFakeNews(text: string, sourceUrl?: string): Promise<{
    label: 'Fake' | 'Real';
    confidence: number;
    source_status?: 'Safe' | 'Suspicious' | 'Unverified';
    source_summary?: string;
  }> {
    const requestBody: any = { text };
    if (sourceUrl && sourceUrl.trim()) {
      requestBody.sourceUrl = sourceUrl.trim();
    }

    const response = await this.makeRequest<any>('/ml/fake-news', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const result = response.result || response;
    return {
      label: result.label || 'Real',
      confidence: result.confidence || 0,
      source_status: result.source_status || 'Unverified',
      source_summary: result.source_summary || 'No source URL provided',
    };
  }

  // ML Service - Review Sentiment
  async analyzeReview(text: string): Promise<{
    sentiment: 'Positive' | 'Negative';
    confidence: number;
  }> {
    const response = await this.makeRequest<any>('/ml/review', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });

    const result = response.result || response;
    return {
      sentiment: result.sentiment || 'Positive',
      confidence: result.confidence || 0,
    };
  }

  // ML Service - Website Scan
  async scanWebsite(url: string): Promise<{
    status: 'Safe' | 'Suspicious';
    summary: string;
    suspicious_keywords_found?: number;
  }> {
    const response = await this.makeRequest<any>('/ml/scan', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });

    const result = response.result || response;
    return {
      status: result.status || 'Safe',
      summary: result.summary || '',
      suspicious_keywords_found: result.suspicious_keywords_found || 0,
    };
  }

  // Fake News - Analyze from URL
  async analyzeFakeNewsFromUrl(url: string): Promise<{
    detected_text: string;
    label: 'Fake' | 'Real';
    confidence: number;
    source_status?: 'Safe' | 'Suspicious';
    source_summary?: string;
  }> {
    const token = this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/fake-news/url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ url }),
    });

    const data = await this.parseResponse<any>(response);

    if (!response.ok) {
      const message = data?.message || data?.error || `Request failed (${response.status})`;
      throw new Error(message);
    }

    const result = data.result || data;
    return {
      detected_text: result.detected_text || '',
      label: result.label === 'Fake' ? 'Fake' : 'Real',
      confidence: result.confidence || 0,
      source_status: result.source_status,
      source_summary: result.source_summary,
    };
  }

  // Fake News - Analyze from Image
  async analyzeFakeNewsFromImage(file: File): Promise<{
    detected_text: string;
    label: 'Fake' | 'Real';
    confidence: number;
  }> {
    const token = this.getAuthToken();
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/fake-news/image`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await this.parseResponse<any>(response);

    if (!response.ok) {
      const message = data?.message || data?.error || `Request failed (${response.status})`;
      throw new Error(message);
    }

    const result = data.result || data;
    return {
      detected_text: result.detected_text || '',
      label: result.label === 'Fake' ? 'Fake' : 'Real',
      confidence: result.confidence || 0,
    };
  }
}

export const apiService = new ApiService();
export default apiService;


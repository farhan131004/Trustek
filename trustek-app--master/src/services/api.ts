// API service for Trustek backend
// Dynamically determine API base URL based on environment
const getApiBaseUrl = (): string => {
  // Check for environment variable first
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Development: use localhost:8081 (Spring Boot gateway)
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    return 'http://localhost:8081/api';
  }
  
  // Production: use environment variable or default
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api';
};

const API_BASE_URL = getApiBaseUrl();
const getMlBaseUrl = (): string => {
  if (import.meta.env.VITE_ML_BASE_URL) return import.meta.env.VITE_ML_BASE_URL;
  return 'http://localhost:5000';
};
const ML_BASE_URL = getMlBaseUrl();

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
      credentials: 'include', // Include cookies if using session-based auth
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
    source_status?: 'Safe' | 'Suspicious' | 'Unverified';
    source_summary?: string;
    sources?: Array<{ title?: string; url?: string; snippet?: string; source?: string }>;
  }> {
    const token = this.getAuthToken();
    
    // Build headers - include Authorization if token is available
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/fake-news/url`, {
        method: 'POST',
        headers,
        credentials: 'include', // Include cookies if using session-based auth
        body: JSON.stringify({ url }),
      });

      const data = await this.parseResponse<any>(response);

      if (!response.ok) {
        // Handle specific error types
        if (response.status === 401 || response.status === 403) {
          const errorData = data?.error || '';
          if (errorData === 'AUTHENTICATION_REQUIRED') {
            throw new Error('Please log in first to use this feature.');
          }
          throw new Error('Authentication failed. Please log in again.');
        }
        if (response.status === 503) {
          throw new Error(data?.message || 'ML service is unavailable. Please try again later.');
        }
        if (response.status === 400) {
          // Surface friendly ACCESS_DENIED explanation if present
          const code = (data as any)?.code;
          if (code === 'ACCESS_DENIED') {
            throw new Error('The website blocked automated access. Please paste the article text, provide a different URL, or upload a readable screenshot.');
          }
          throw new Error((data as any)?.message || 'Invalid request. Please check the URL and try again.');
        }
        
        const errorCode = data?.error || 'UNKNOWN_ERROR';
        const errorMessage = data?.message || `Request failed (${response.status})`;
        
        // Provide user-friendly error messages
        const friendlyMessages: Record<string, string> = {
          'URL_REQUIRED': 'Please provide a URL to analyze.',
          'INVALID_URL': 'Please enter a valid URL starting with http:// or https://',
          'ML_SERVICE_UNAVAILABLE': 'AI Service unavailable. Please ensure the Flask service is running on port 5000.',
          'ML_SERVICE_ERROR': 'An error occurred while analyzing the URL. Please try again.',
          'HTTP_ERROR': 'Unable to fetch content from the provided URL. The website may be blocking requests.',
          'RUNTIME_ERROR': 'An error occurred during analysis. Please try again.',
          'INTERNAL_ERROR': 'An internal server error occurred. Please try again later.',
        };
        
        throw new Error(friendlyMessages[errorCode] || errorMessage);
      }

      const result = data.result || data;
      return {
        detected_text: result.detected_text || result.extracted_text || '',
        label: result.label === 'Fake' ? 'Fake' : 'Real',
        confidence: result.confidence || 0,
        source_status: result.source_status,
        source_summary: result.source_summary || result.summary,
        sources: result.sources || [],
      };
    } catch (error: any) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection and ensure the backend is running.');
      }
      // Re-throw custom errors
      if (error instanceof Error) {
        throw error;
      }
      // Handle unknown errors
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }

  // Fake News - Analyze from Image
  async analyzeFakeNewsFromImage(file: File): Promise<{
    detected_text: string;
    label: 'Fake' | 'Real';
    confidence: number;
    sources?: Array<{ title?: string; url?: string; snippet?: string; source?: string }>;
  }> {
    const token = this.getAuthToken();
    
    // Build headers - include Authorization if token is available
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/fake-news/image`, {
        method: 'POST',
        headers,
        credentials: 'include', // Include cookies if using session-based auth
        body: formData,
      });

      const data = await this.parseResponse<any>(response);

      if (!response.ok) {
        // Handle specific error types
        if (response.status === 401 || response.status === 403) {
          const errorData = data?.error || '';
          if (errorData === 'AUTHENTICATION_REQUIRED') {
            throw new Error('Please log in first to use this feature.');
          }
          throw new Error('Authentication failed. Please log in again.');
        }
        if (response.status === 503) {
          const errorMsg = data?.message || 'AI Service unavailable. Please ensure the Flask service is running.';
          throw new Error(errorMsg);
        }
        if (response.status === 400) {
          throw new Error(data?.message || 'Invalid image file. Please upload a valid image.');
        }
        
        const errorCode = data?.error || 'UNKNOWN_ERROR';
        const errorMessage = data?.message || `Request failed (${response.status})`;
        
        throw new Error(errorMessage);
      }

      const result = data.result || data;
      return {
        detected_text: result.detected_text || '',
        label: result.label === 'Fake' ? 'Fake' : 'Real',
        confidence: result.confidence || 0,
        sources: result.sources || [],
      };
    } catch (error: any) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection and ensure the backend is running.');
      }
      // Re-throw custom errors
      if (error instanceof Error) {
        throw error;
      }
      // Handle unknown errors
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }

  // Structured credibility analysis (direct to Flask ML service)
  async analyzeStructured(payload: { text?: string; url?: string }): Promise<{
    verdict: 'REAL' | 'MIXED' | 'LIKELY_FAKE' | 'UNVERIFIED';
    credibility_score: number;
    confidence: number;
    claims: Array<{ id: number; claim: string; judgement: 'Supported' | 'Unverified' | 'Contradicted'; sources: Array<{ url: string; snippet: string }> }>;
    reasoning: string[];
  }> {
    const response = await fetch(`${ML_BASE_URL}/analyze-structured`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await this.parseResponse<any>(response);
      throw new Error((data as any)?.message || 'Structured analysis failed');
    }
    return (await response.json()) as any;
  }

  async analyzeLlm(payload: { text?: string; url?: string }): Promise<{
    verdict: 'REAL' | 'MIXED' | 'LIKELY_FAKE' | 'UNVERIFIED';
    credibility_score: number;
    confidence: number;
    claims: Array<{ id: number; claim: string; judgement: 'Supported' | 'Unverified' | 'Contradicted'; sources: Array<{ url: string; snippet: string }> }>;
    reasoning: string[];
  }> {
    const response = await fetch(`${ML_BASE_URL}/analyze-llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await this.parseResponse<any>(response);
      throw new Error((data as any)?.message || 'LLM analysis failed');
    }
    return (await response.json()) as any;
  }

  async analyzeHybrid(payload: { text?: string; url?: string }): Promise<{
    verdict: 'REAL' | 'MIXED' | 'LIKELY_FAKE' | 'UNVERIFIED';
    credibility_score: number;
    confidence: number;
    claims: Array<{ id: number; claim: string; judgement: 'Supported' | 'Unverified' | 'Contradicted'; sources: Array<{ url: string; snippet: string }> }>;
    reasoning: string[];
  }> {
    const response = await fetch(`${ML_BASE_URL}/analyze-hybrid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await this.parseResponse<any>(response);
      throw new Error((data as any)?.message || 'Hybrid analysis failed');
    }
    return (await response.json()) as any;
  }
}

export const apiService = new ApiService();
export default apiService;


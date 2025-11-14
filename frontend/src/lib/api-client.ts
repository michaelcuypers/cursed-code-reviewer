// API client for backend communication

import { fetchAuthSession } from 'aws-amplify/auth';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3001/api/v1';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  retries?: number;
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public demonicMessage?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const session = await fetchAuthSession();
      // Use ID token for API Gateway Cognito authorizer
      if (session.tokens?.idToken) {
        return {
          Authorization: `Bearer ${session.tokens.idToken.toString()}`,
        };
      }
    } catch (error) {
      console.error('Failed to get auth session:', error);
    }
    return {};
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isNetworkError(error: any): boolean {
    return (
      error instanceof TypeError ||
      error.message === 'Failed to fetch' ||
      error.message === 'Network request failed' ||
      !navigator.onLine
    );
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requiresAuth = true, headers = {}, retries = 2, ...restOptions } = options;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Check network connectivity
        if (!navigator.onLine) {
          throw new NetworkError('💀 No network connection - the spirits cannot reach you');
        }

        const authHeaders = requiresAuth ? await this.getAuthHeaders() : {};

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...restOptions,
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...headers,
          },
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({
            error: {
              demonicMessage: '💀 The spirits are displeased with your request',
              technicalDetails: response.statusText,
            },
          }));
          
          const demonicMessage = error.error?.demonicMessage || this.getDefaultErrorMessage(response.status);
          const technicalDetails = error.error?.technicalDetails || response.statusText;
          
          throw new ApiError(
            demonicMessage,
            response.status,
            technicalDetails
          );
        }

        return response.json();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error instanceof ApiError && error.statusCode) {
          if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
            throw error;
          }
        }

        // Retry on network errors or 5xx errors
        if (attempt < retries && (this.isNetworkError(error) || (error instanceof ApiError && error.statusCode && error.statusCode >= 500))) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
          await this.sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private getDefaultErrorMessage(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return '💀 Your request has been cursed with bad syntax';
      case 401:
        return '💀 Your soul token has expired - please sign in again';
      case 403:
        return '💀 The spirits forbid you from accessing this realm';
      case 404:
        return '💀 This resource has vanished into the void';
      case 429:
        return '💀 Too many souls seeking answers - please wait a moment';
      case 500:
        return '💀 The demonic oracle has encountered an internal error';
      case 503:
        return '💀 The spirits are temporarily unavailable';
      default:
        return '💀 An unknown curse has befallen your request';
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_ENDPOINT);


import { BackendResponse } from '../types';

// The path prefix for proxying Alpaca API calls via our Node.js server
const ALPACA_PROXY_PREFIX = '/proxy';

// The path prefix for our own internal API, also served by the Node.js server.
// The endpoints passed to internalApiRequest already include `/api`, so this can be empty.
const INTERNAL_API_PREFIX = '';

interface RequestConfig {
    endpoint: string; // e.g., /v2/account
    body?: object;
    isDataEndpoint?: boolean;
}

// This function handles all requests to the Node.js backend proxy for Alpaca.
async function alpacaApiRequest<T>(config: RequestConfig, method: 'GET' | 'POST'): Promise<BackendResponse<T>> {
    const { endpoint, body, isDataEndpoint } = config;

    // Use a relative URL. The browser will resolve this against the current host.
    const url = ALPACA_PROXY_PREFIX + (endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-is-data-endpoint': isDataEndpoint ? 'true' : 'false',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        const responseData = await response.json();

        if (!response.ok) {
            const message = responseData.message || `Alpaca proxy request failed with status ${response.status}`;
            throw new Error(message);
        }
        
        return { success: true, data: responseData };

    } catch (error: any) {
        return {
            success: false,
            data: null,
            error: {
                type: 'API_ERROR',
                message: error.message || 'An unknown error occurred. Is the Node.js backend server running?'
            }
        };
    }
}

// A generic function to handle all requests to our internal API (served by Node.js).
async function internalApiRequest<T>(
    endpoint: string, // e.g., /api/gemini/enrich-news
    method: 'GET' | 'POST',
    body?: object
): Promise<BackendResponse<T>> {
    // The endpoint is a relative URL. The browser will resolve it against the current host.
    const url = INTERNAL_API_PREFIX + (endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
    const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    };

    try {
        const response = await fetch(url, options);
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || `Internal API request failed with status ${response.status}`);
        }
        
        return { success: true, data: responseData };

    } catch (error: any) {
        return {
            success: false,
            data: null,
            error: {
                type: 'API_ERROR',
                message: error.message || 'An unknown error occurred. Is the Node.js server running?'
            }
        };
    }
}

// --- Public API ---

// For Node.js Alpaca Proxy
export const get = <T>(config: RequestConfig): Promise<BackendResponse<T>> => alpacaApiRequest<T>(config, 'GET');
export const post = <T>(config: RequestConfig): Promise<BackendResponse<T>> => alpacaApiRequest<T>(config, 'POST');

// For our own internal Node.js API (AI, ML sims, etc.)
export const getInternal = <T>(endpoint: string): Promise<BackendResponse<T>> => internalApiRequest<T>(endpoint, 'GET');
export const postInternal = <T>(endpoint: string, body: object): Promise<BackendResponse<T>> => internalApiRequest<T>(endpoint, 'POST', body);
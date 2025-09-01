
import { BackendResponse } from '../types';
import { getInternal } from './backendService';
import { get } from './backendService'; // for alpaca check
import { AlpacaAccount } from '../types';

export interface EnvStatus {
    alpacaKey: boolean;
    alpacaSecret: boolean;
    googleAiKey: boolean;
}

export const pingBackend = (): Promise<BackendResponse<{ message: string }>> => {
    return getInternal<{ message: string }>('/api/health/ping');
};

export const checkEnvStatus = (): Promise<BackendResponse<EnvStatus>> => {
    return getInternal<EnvStatus>('/api/health/env-status');
};

export const checkAlpacaStatus = (): Promise<BackendResponse<AlpacaAccount>> => {
    // We reuse the existing broker service call which goes through the proxy
    return get<AlpacaAccount>({
        endpoint: '/v2/account'
    });
};

export const checkGeminiStatus = (): Promise<BackendResponse<{ message: string }>> => {
    return getInternal<{ message: string }>('/api/health/gemini-status');
};

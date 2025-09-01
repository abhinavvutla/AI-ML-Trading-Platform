import { AlpacaAccount, AlpacaOrder, AlpacaPosition, BackendResponse } from '../types';
import { post, get } from './backendService';

// This service now acts as a pass-through to the backendService,
// which handles the actual API calls and fallbacks.

export const verifyKeysAndFetchAccount = async (): Promise<BackendResponse<AlpacaAccount>> => {
    return get<AlpacaAccount>({
        endpoint: '/v2/account'
    });
};

export const executeTrade = async (
    tradeDetails: {
        symbol: string,
        qty?: string,
        notional?: string,
        side: 'buy' | 'sell',
        type: 'market' | 'limit',
        time_in_force: 'day' | 'gtc',
        order_class?: 'simple' | 'bracket' | 'oto' | 'oco',
        take_profit?: { limit_price: string },
        stop_loss?: { stop_price: string }
    }
): Promise<BackendResponse<AlpacaOrder>> => {
    return post<AlpacaOrder>({
        endpoint: '/v2/orders',
        body: tradeDetails
    });
};

export const fetchPositions = async (): Promise<BackendResponse<AlpacaPosition[]>> => {
    return get<AlpacaPosition[]>({
        endpoint: '/v2/positions'
    });
};

export const fetchOrders = async (): Promise<BackendResponse<AlpacaOrder[]>> => {
    return get<AlpacaOrder[]>({
        endpoint: '/v2/orders?status=all'
    });
};
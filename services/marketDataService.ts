
import { PerformanceDataPoint, AlpacaBar, AlpacaSnapshot, BackendResponse, AlpacaNewsArticle, AlpacaCryptoBar, AlpacaForexBar } from '../types';
import { get, postInternal } from './backendService';

const getISODate = (date: Date) => date.toISOString().split('T')[0];

const isUSStock = (symbol: string) => !symbol.includes('/') && !symbol.startsWith('^') && !symbol.includes('=') && !symbol.includes('.');

export const fetchStockHistoricalData = async (
  symbols: string[],
  start?: string,
  end?: string,
  timeframe: string = '1Day'
): Promise<BackendResponse<{ [symbol: string]: AlpacaBar[] }>> => {

    let finalStart = start;
    let finalEnd = end;

    if (!finalStart || !finalEnd) {
        const endDateObj = new Date();
        const startDateObj = new Date();
        startDateObj.setFullYear(endDateObj.getFullYear() - 1); // Default to 1 year
        finalEnd = getISODate(endDateObj);
        finalStart = getISODate(startDateObj);
    }
    
    const combinedData: { [symbol: string]: AlpacaBar[] } = {};
    const symbolsForAlpaca: string[] = [];
    let symbolsForNodeServer: string[] = [];

    // --- 1. Smartly pre-sort symbols to their best data source ---
    for (const symbol of symbols) {
        if (isUSStock(symbol)) {
            symbolsForAlpaca.push(symbol);
        } else {
            symbolsForNodeServer.push(symbol); // Indices, Forex, international stocks go straight to our backend
        }
    }
    
    // --- 2. Fetch from Alpaca (US stocks only) ---
    if (symbolsForAlpaca.length > 0) {
        console.log(`Fetching data for ${symbolsForAlpaca.length} US stock(s) from Alpaca...`);
        const symbolsQuery = symbolsForAlpaca.map(encodeURIComponent).join(',');
        const alpacaResult = await get<{ bars: { [symbol: string]: AlpacaBar[] } }>({
            endpoint: `/v2/stocks/bars?symbols=${symbolsQuery}&timeframe=${timeframe}&start=${finalStart}&end=${finalEnd}&adjustment=raw&feed=iex`,
            isDataEndpoint: true
        });

        if (alpacaResult.success && alpacaResult.data?.bars) {
            const alpacaBars = alpacaResult.data.bars;
            const failedSymbols: string[] = [];
            symbolsForAlpaca.forEach(symbol => {
                if (alpacaBars[symbol] && alpacaBars[symbol].length > 0) {
                    combinedData[symbol] = alpacaBars[symbol];
                } else {
                    failedSymbols.push(symbol);
                }
            });
            
            if (failedSymbols.length > 0) {
                 symbolsForNodeServer.push(...failedSymbols); // Only failed US stocks get retried on our backend
                 console.log(`Alpaca succeeded for ${Object.keys(alpacaBars).length - failedSymbols.length} symbols. Retrying ${failedSymbols.length} on internal backend.`);
            }
        } else {
            console.warn(`Alpaca batch request failed. Adding all ${symbolsForAlpaca.length} US stocks to internal backend fallback.`);
            symbolsForNodeServer.push(...symbolsForAlpaca);
        }
    }

    // --- 3. Fetch from our backend for non-US assets and failed US stocks ---
    if (symbolsForNodeServer.length > 0) {
        symbolsForNodeServer = [...new Set(symbolsForNodeServer)]; // Remove duplicates
        console.log(`Fetching data for ${symbolsForNodeServer.length} symbol(s) from Node.js backend: ${symbolsForNodeServer.join(', ')}`);
        const internalResult = await postInternal<{ [symbol:string]: AlpacaBar[] }>(
            '/api/yfinance/historical',
            { symbols: symbolsForNodeServer, startDate: finalStart, endDate: finalEnd, timeframe }
        );

        if (internalResult.success && internalResult.data) {
            for (const symbol in internalResult.data) {
                if(internalResult.data[symbol]) {
                    combinedData[symbol] = internalResult.data[symbol];
                }
            }
            const fetchedCount = Object.keys(internalResult.data).length;
            console.log(`Successfully fetched ${fetchedCount} symbols from Node.js backend.`);
        } else {
             console.error("Internal backend request failed:", internalResult.error?.message);
        }
    }

    if (Object.keys(combinedData).length > 0) {
        return { success: true, data: combinedData };
    }

    console.error("All data sources failed for all requested symbols.");
    return { 
        success: false, 
        data: null, 
        error: { type: 'API_ERROR', message: 'Failed to fetch historical data from all available sources for all symbols.' } 
    };
};

export const fetchCryptoHistoricalData = async (
  symbol: string,
  days = 30
): Promise<BackendResponse<{bars: AlpacaCryptoBar[]}>> => {
    const timeframe = '1Day';
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    const end = endDate.toISOString();
    const start = startDate.toISOString();
    
    const encodedSymbol = encodeURIComponent(symbol);

    const result = await get<{ bars: { [key: string]: AlpacaCryptoBar[] } }>({
        endpoint: `/v1beta3/crypto/us/bars?symbols=${encodedSymbol}&timeframe=${timeframe}&start=${start}&end=${end}`,
        isDataEndpoint: true
    });

    if (result.success && result.data?.bars) {
        const barsArray = result.data.bars[symbol];
        if (barsArray) {
            return { success: true, data: { bars: barsArray } };
        }
    }
    
    return { 
        success: false, 
        data: null, 
        error: result.error || { type: 'API_ERROR', message: `Could not extract crypto bars for ${symbol}` } 
    };
}

export const fetchForexHistoricalData = async (
  symbolPair: string,
  days = 30
): Promise<BackendResponse<{bars: AlpacaForexBar[]}>> => {
    const timeframe = '1Day';
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    const end = endDate.toISOString();
    const start = startDate.toISOString();
    
    const symbolPairClean = symbolPair.replace('/', '');

    const result = await get<{ bars: { [key: string]: AlpacaForexBar[] } }>({
        endpoint: `/v1beta1/forex/rates/bars?symbol_pairs=${symbolPairClean}&timeframe=${timeframe}&start=${start}&end=${end}`,
        isDataEndpoint: true
    });

    if (result.success && result.data?.bars) {
        const barsArray = result.data.bars[symbolPairClean];
        if (barsArray) {
            return { success: true, data: { bars: barsArray } };
        }
    }
    
    return { 
        success: false, 
        data: null, 
        error: result.error || { type: 'API_ERROR', message: `Could not extract forex bars for ${symbolPair}` } 
    };
}


export const generatePerformanceCurve = (
    bars: { [symbol: string]: AlpacaBar[] },
    initialCapital: number
): PerformanceDataPoint[] => {
    const data: PerformanceDataPoint[] = [];
    if (Object.keys(bars).length === 0) return [];
    
    const representativeBars = Object.values(bars)[0];
    if (!representativeBars) return [];

    let strategyValue = initialCapital;
    let sp500Value = initialCapital;
    let peak = initialCapital;

    for (const bar of representativeBars) {
        strategyValue *= (1 + (Math.random() - 0.495) * 0.025);
        sp500Value *= (1 + (Math.random() - 0.48) * 0.018);
        
        if (strategyValue > peak) {
            peak = strategyValue;
        }
        const drawdown = (peak - strategyValue) / peak;

        data.push({
            date: bar.t.split('T')[0],
            strategy: Math.round(strategyValue),
            sp500: Math.round(sp500Value),
            drawdown: drawdown,
        });
    }
    return data;
};


export const fetchSnapshots = async (
    symbols: string[]
): Promise<BackendResponse<{ [symbol: string]: AlpacaSnapshot }>> => {
    const symbolsQuery = symbols.join(',');
    return get<{ [symbol: string]: AlpacaSnapshot }>({
        endpoint: `/v2/stocks/snapshots?symbols=${symbolsQuery}&feed=iex`,
        isDataEndpoint: true
    });
};

export const fetchNews = async (
    limit = 20
): Promise<BackendResponse<{ news: AlpacaNewsArticle[] }>> => {
    return get<{ news: AlpacaNewsArticle[] }>({
        endpoint: `/v1beta1/news?limit=${limit}&include_content=false&exclude_contentless=true`,
        isDataEndpoint: true
    });
};


export const fetchTrainingData = async (symbols: string[], years: number): Promise<boolean> => {
    console.log(`Simulating fetching training data for ${symbols.join(', ')} over ${years} years.`);
    return new Promise(resolve => {
        setTimeout(() => {
            console.log("Simulated training data fetched.");
            resolve(true);
        }, 1500);
    });
};

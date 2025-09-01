import { getInternal, postInternal } from './backendService';
import {
    SentimentResult, Suggestion, StrategyModel, AssetUniverse, NewsArticle,
    ScreenerResult, AlpacaNewsArticle
} from "../types";

export const enrichNewsArticles = async (articles: AlpacaNewsArticle[]): Promise<NewsArticle[]> => {
    const response = await postInternal<NewsArticle[]>('/api/gemini/enrich-news', { articles });
    if (response.success && response.data) {
        return response.data;
    }
    console.error("Failed to enrich news articles:", response.error?.message);
    // Fallback: return original articles without enrichment on error
    return articles.map(article => ({
        id: article.id.toString(),
        source: article.source,
        date: article.created_at,
        headline: article.headline,
        summary: article.summary,
        ticker: article.symbols.length > 0 ? article.symbols[0] : undefined,
        url: article.url,
        category: 'Market',
        sentiment: 'Neutral',
    }));
};

export const getScreenerData = async (): Promise<Omit<ScreenerResult, 'price' | 'change1D' | 'volume'>[]> => {
    const response = await getInternal<Omit<ScreenerResult, 'price' | 'change1D' | 'volume'>[]>('/api/gemini/screener-data');
    if (response.success && response.data) {
        return response.data;
    }
    console.error("Failed to get screener data:", response.error?.message);
    return [];
}

export interface CoPilotResponse {
    conversationalResponse: string;
    strategyName?: string;
    models?: StrategyModel[];
    assetUniverses?: AssetUniverse[];
    customSymbols?: string;
    trainingPeriodYears?: number;
    minLeverage?: number;
    maxLeverage?: number;
    stopLossPercentage?: number;
}

export const getStrategyOptimizations = async (models: string[], trainingPeriod: number, stopLossPercentage: number): Promise<{suggestions: string[], stopLossFeedback: string}> => {
    const response = await postInternal<{suggestions: string[], stopLossFeedback: string}>(
        '/api/gemini/strategy-optimizations',
        { models, trainingPeriod, stopLossPercentage }
    );

    if (response.success && response.data) {
        return response.data;
    }

    console.error("Error fetching strategy optimizations from backend:", response.error?.message);
    // Fallback data
    return {
        suggestions: [
            `Error communicating with the AI service: ${response.error?.message}`,
            "Please check your API key and network connection on the Node.js server.",
            "Returning mock data as a fallback.",
            `For your selected symbols, a ${trainingPeriod > 3 ? trainingPeriod - 1 : trainingPeriod + 2}-year training period might capture market cycles better.`
        ],
        stopLossFeedback: `Could not analyze stop loss due to an API error. A ${stopLossPercentage}% stop loss is a common starting point, but should be validated against the asset's volatility.`
    }
};

export const getStrategyFromConversation = async (chatHistory: { role: string, parts: { text: string }[] }[]): Promise<CoPilotResponse> => {
    const response = await postInternal<CoPilotResponse>(
        '/api/gemini/strategy-from-conversation',
        { chatHistory }
    );
    
    if (response.success && response.data) {
        return response.data;
    }

    console.error("Error with Co-Pilot conversation from backend:", response.error?.message);
    return {
        conversationalResponse: `Sorry, I encountered an error communicating with the backend: ${response.error?.message}. Please check the Node.js server and try again.`,
    };
}


export const getSentimentAnalysis = async (apiKey: string, secret: string): Promise<SentimentResult> => {
    console.log("Simulating Gemini call for sentiment analysis from Reddit/X...");
    // This function remains a mock as per its original implementation.
    return new Promise(resolve => {
        setTimeout(() => {
            const data: SentimentResult = {
                stocks: [
                    { symbol: 'TSLA', bullish: 1205, bearish: 450, score: 0.65 },
                    { symbol: 'AAPL', bullish: 980, bearish: 220, score: 0.71 },
                    { symbol: 'NVDA', bullish: 2500, bearish: 300, score: 0.88 },
                    { symbol: 'MSFT', bullish: 750, bearish: 150, score: 0.78 },
                ],
                crypto: [
                    { symbol: 'BTC', bullish: 5600, bearish: 1200, score: 0.82 },
                    { symbol: 'ETH', bullish: 4300, bearish: 980, score: 0.79 },
                    { symbol: 'SOL', bullish: 3100, bearish: 1500, score: 0.51 },
                ]
            };
            resolve(data);
        }, 1500);
    });
};


export const getPortfolioRebalancingSuggestions = async (currentPortfolio: any): Promise<Suggestion[]> => {
    console.log("Simulating Gemini call for portfolio rebalancing...");
     // This function remains a mock as per its original implementation.
    return new Promise(resolve => {
        setTimeout(() => {
            const suggestions: Suggestion[] = [
                { action: 'SELL', symbol: 'NVDA', percentage: 5, reason: 'Take profit after recent run-up to rebalance.' },
                { action: 'BUY', symbol: 'JPM', percentage: 5, reason: 'Increase exposure to Financials for diversification.' },
                { action: 'BUY', symbol: 'O', percentage: 3, reason: 'Add Real Estate (REIT) for dividend income and stability.' },
                { action: 'HOLD', symbol: 'AAPL', percentage: 0, reason: 'Maintain core position in strong performer.' },
            ];
            resolve(suggestions);
        }, 1800);
    });
};
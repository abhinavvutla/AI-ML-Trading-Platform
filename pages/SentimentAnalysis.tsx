import React, { useState, useEffect, useCallback } from 'react';
import { getSentimentAnalysis } from '../services/geminiService';
import { Rss, ArrowUp, ArrowDown, AlertTriangle, Info } from 'lucide-react';
import { SentimentData, SentimentResult } from '../types';

const SentimentCard = ({ data, title }: { data: SentimentData[], title: string }) => (
    <div className="bg-secondary p-4 rounded-lg border border-border-color">
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        <div className="space-y-3">
            {data.map(item => (
                <div key={item.symbol} className="bg-primary p-3 rounded-md">
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">{item.symbol}</span>
                        <span className={`font-bold text-lg ${item.score > 0.5 ? 'text-positive' : 'text-negative'}`}>
                            {(item.score * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1 text-gray-400">
                        <span className="flex items-center text-green-400"><ArrowUp className="w-4 h-4 mr-1"/>{item.bullish}</span>
                        <span className="flex items-center text-red-400"><ArrowDown className="w-4 h-4 mr-1"/>{item.bearish}</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const SentimentAnalysis: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [sentimentData, setSentimentData] = useState<SentimentResult | null>(null);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const fetchSentiment = useCallback(async () => {
        setIsLoading(true);
        // This call is to a MOCK service.
        const data = await getSentimentAnalysis('', '');
        setSentimentData(data);
        setLastFetched(new Date());
        setIsLoading(false);
    }, []);

    useEffect(() => {
        // Fetch once on component load, but only if it hasn't been fetched before.
        if (!sentimentData) {
            fetchSentiment();
        }
    }, [fetchSentiment, sentimentData]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Social Sentiment Analysis</h1>
                <button
                    onClick={fetchSentiment}
                    disabled={isLoading}
                    className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500 flex items-center justify-center"
                >
                    {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> : <Rss className="w-5 h-5 mr-2" />}
                    Refresh Data
                </button>
            </div>

            <div className="bg-blue-900/30 border border-blue-700 text-blue-300 px-4 py-3 rounded-lg flex items-start text-sm">
                <Info className="w-5 h-5 mr-3 mt-1 flex-shrink-0" />
                <div>
                <strong>Demonstration Mode:</strong> Accessing live data from platforms like X (Twitter) and Reddit requires a complex, server-side authentication setup due to API restrictions and security policies. The data shown here is a realistic simulation provided by a mock service to demonstrate the UI's capabilities.
                </div>
            </div>
            
            {lastFetched && <p className="text-sm text-gray-400">Last updated: {lastFetched.toLocaleString()}</p>}

            {sentimentData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <SentimentCard data={sentimentData.stocks} title="Trending Stocks" />
                    <SentimentCard data={sentimentData.crypto} title="Trending Crypto" />
                </div>
            ) : (
                <div className="text-center py-10 text-gray-400">
                    {isLoading ? 'Fetching simulated sentiment data...' : 'Click "Refresh Data" to view social sentiment.'}
                </div>
            )}
        </div>
    );
};

export default SentimentAnalysis;
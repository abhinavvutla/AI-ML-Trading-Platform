import React, { useState } from 'react';
import { getPortfolioRebalancingSuggestions } from '../services/geminiService';
import { Bot, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Suggestion } from '../types';

const mockPortfolio = [
    { symbol: 'AAPL', value: 25000, class: 'US Stock' },
    { symbol: 'NVDA', value: 30000, class: 'US Stock' },
    { symbol: 'BTC-USD', value: 15000, class: 'Crypto' },
    { symbol: 'XAU-USD', value: 10000, class: 'Commodity' },
    { symbol: 'MSFT', value: 20000, class: 'US Stock' },
];

const PortfolioOptimisation: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

    const handleOptimize = async () => {
        setIsLoading(true);
        setSuggestions(null);
        const result = await getPortfolioRebalancingSuggestions(mockPortfolio);
        setSuggestions(result);
        setIsLoading(false);
    };

    const ActionIcon = ({ action }: { action: 'BUY' | 'SELL' | 'HOLD' }) => {
        switch (action) {
            case 'BUY': return <TrendingUp className="w-6 h-6 text-positive" />;
            case 'SELL': return <TrendingDown className="w-6 h-6 text-negative" />;
            case 'HOLD': return <ArrowRight className="w-6 h-6 text-gray-400" />;
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">AI Portfolio Optimisation</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-secondary p-6 rounded-lg border border-border-color">
                    <h2 className="text-xl font-semibold mb-4">Current Portfolio</h2>
                    <div className="space-y-3">
                        {mockPortfolio.map(item => (
                            <div key={item.symbol} className="flex justify-between items-center bg-primary p-3 rounded-md">
                                <div>
                                    <p className="font-bold">{item.symbol}</p>
                                    <p className="text-sm text-gray-400">{item.class}</p>
                                </div>
                                <p className="font-semibold">${item.value.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleOptimize}
                        disabled={isLoading}
                        className="w-full mt-6 bg-accent hover:bg-accent-hover text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 flex items-center justify-center"
                    >
                        {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> : <Bot className="w-5 h-5 mr-2" />}
                        {isLoading ? 'AI is analyzing...' : 'Optimize with AI'}
                    </button>
                </div>

                <div className="bg-secondary p-6 rounded-lg border border-border-color">
                    <h2 className="text-xl font-semibold mb-4">AI Rebalancing Suggestions</h2>
                    {suggestions ? (
                        <div className="space-y-4 animate-fade-in">
                            {suggestions.map((s, i) => (
                                <div key={i} className="bg-primary p-4 rounded-lg border border-border-color">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <ActionIcon action={s.action} />
                                            <span className="font-bold text-lg">{s.action} {s.symbol}</span>
                                        </div>
                                        {s.percentage > 0 && <span className="font-semibold text-lg">{s.percentage}%</span>}
                                    </div>
                                    <p className="text-sm text-gray-300">{s.reason}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                           <p>Click "Optimize with AI" to get rebalancing suggestions.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PortfolioOptimisation;
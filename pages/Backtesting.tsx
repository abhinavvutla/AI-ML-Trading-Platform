
import React, { useState, useEffect } from 'react';
import KPI from '../components/KPI';
import PerformanceChart from '../components/PerformanceChart';
import TradeLogTable from '../components/TradeLogTable';
import { PortfolioMetric, PerformanceDataPoint, Allocation, Trade, SavedStrategy, AssetUniverse, AlpacaBar, BacktestResults, AssetClass } from '../types';
import { useApp } from '../context/AppContext';
import { fetchStockHistoricalData } from '../services/marketDataService';
import { getStrategyOptimizations } from '../services/geminiService';
import { ASSET_UNIVERSES, ASSET_UNIVERSE_TICKER_MAP, ASSET_COLORS, SYMBOL_TO_ASSET_CLASS_MAP, ASSET_LEVERAGE_MAP } from '../constants';
import { AlertTriangle, TrendingDown, BarChart2, Lightbulb, Info } from 'lucide-react';
import { AreaChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';


const calculateAdvancedRatios = (performanceData: PerformanceDataPoint[], riskFreeRate = 0.02, barsPerYear = 252): { sortino: number, calmar: number } => {
    if (performanceData.length < 2) return { sortino: 0, calmar: 0 };

    const dailyReturns = performanceData.slice(1).map((point, i) => {
        const prevValue = performanceData[i].strategy;
        return prevValue > 0 ? (point.strategy - prevValue) / prevValue : 0;
    });

    const annualizedReturn = (Math.pow(performanceData[performanceData.length - 1].strategy / performanceData[0].strategy, barsPerYear / dailyReturns.length) - 1);
    
    // Sortino Ratio
    const downsideReturns = dailyReturns.filter(r => r < 0);
    const downsideDeviation = Math.sqrt(downsideReturns.reduce((acc, r) => acc + Math.pow(r, 2), 0) / (downsideReturns.length || 1)) * Math.sqrt(barsPerYear);
    const sortino = downsideDeviation > 0 ? (annualizedReturn - riskFreeRate) / downsideDeviation : 0;

    // Calmar Ratio
    const maxDrawdown = Math.max(...(performanceData.map(d => d.drawdown || 0)));
    const calmar = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
    
    return {
        sortino: isFinite(sortino) ? sortino : 0,
        calmar: isFinite(calmar) ? calmar : 0,
    };
};


const calculateDynamicLeverage = (rr: number, maxLeverage: number): number => {
    const minRR = 2.5;
    const maxRR = 5.0;
    const clampedRR = Math.min(rr, maxRR);
    const rrRange = maxRR - minRR;
    const leverageRange = maxLeverage - 2;
    if (rrRange <= 0 || leverageRange <= 0) return 2;
    const leverage = 2 + ((clampedRR - minRR) / rrRange) * leverageRange;
    return Math.round(Math.min(leverage, maxLeverage));
};

type Timeframe = '5Min' | '15Min' | '1Hour' | '1Day';

const getSimulationParams = (tf: Timeframe) => {
    switch (tf) {
        case '5Min': return { barsPerYear: 252 * 7 * 12, tradeProbability: 0.002, holdingTime: '5-60m' };
        case '15Min': return { barsPerYear: 252 * 7 * 4, tradeProbability: 0.007, holdingTime: '15-180m' };
        case '1Hour': return { barsPerYear: 252 * 7, tradeProbability: 0.03, holdingTime: '1-8h' };
        case '1Day': return { barsPerYear: 252, tradeProbability: 0.2, holdingTime: '1-5d' };
        default: return { barsPerYear: 252, tradeProbability: 0.2, holdingTime: '1-5d' };
    }
};


const Backtesting: React.FC = () => {
    const { savedStrategies } = useApp();
    const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<BacktestResults | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSimulatedData, setIsSimulatedData] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');

    const defaultStartDate = new Date();
    defaultStartDate.setFullYear(defaultStartDate.getFullYear() - 5);
    const [startDate, setStartDate] = useState(defaultStartDate.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [initialCapital, setInitialCapital] = useState(100000);
    const [commission, setCommission] = useState(0.50); // $0.50 per trade
    const [slippage, setSlippage] = useState(0.05); // 0.05% slippage
    const [maxTradesPerDay, setMaxTradesPerDay] = useState(10);
    const [useWeeklyBias, setUseWeeklyBias] = useState(true);
    const [timeframe, setTimeframe] = useState<Timeframe>('1Day');
    const [dateInfo, setDateInfo] = useState('');

    useEffect(() => {
        if (timeframe !== '1Day') {
            const maxDays = 59; // yfinance limit for intraday
            const newStartDate = new Date();
            newStartDate.setDate(newStartDate.getDate() - maxDays);
            
            const currentStartDate = new Date(startDate);
            const currentEndDate = new Date(endDate);
    
            if ( (currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 3600 * 24) > maxDays + 1) {
                setStartDate(newStartDate.toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
                setDateInfo(`For intraday timeframes, the date range is limited to the last 60 days to ensure data availability.`);
            } else {
                 setDateInfo('');
            }
        } else {
            setDateInfo('');
        }
    }, [timeframe, startDate, endDate]);

    const handleRunBacktest = async () => {
        if (selectedStrategyIds.length === 0) {
            alert("Please select at least one strategy to backtest.");
            return;
        }
        setIsLoading(true);
        setResults(null);
        setError(null);
        setIsSimulatedData(false);
        setProgress(0);
        
        const { barsPerYear, tradeProbability, holdingTime } = getSimulationParams(timeframe);

        const selectedStrategies = savedStrategies.filter(s => selectedStrategyIds.includes(s.id));
        const allSymbols = [...new Set(selectedStrategies.flatMap(s => [...s.assetUniverses.flatMap(u => ASSET_UNIVERSE_TICKER_MAP[u]), ...s.customSymbols]))];
        
        setProgress(10);
        setProgressMessage('Fetching historical data for assets and benchmark...');
        const symbolsToFetch = [...new Set(['SPY', ...allSymbols])];
        const dataResult = await fetchStockHistoricalData(symbolsToFetch, startDate, endDate, timeframe);
        
        setProgress(30);
        setProgressMessage('Querying AI for optimization feedback...');
        const { stopLossFeedback } = await getStrategyOptimizations(selectedStrategies.flatMap(s => s.models), 5, 2);

        if (!dataResult.success || !dataResult.data || Object.keys(dataResult.data).length === 0) {
            setError('Could not fetch real data for any selected assets. Please check asset universes or custom symbols.');
            setIsLoading(false);
            return;
        }

        setProgress(50);
        setProgressMessage('Simulating trades across selected timeframe...');
        const allTrades: Trade[] = [];
        const dailyPnl: { [date: string]: number } = {};

        // --- Portfolio Simulation ---
        for (const strategy of selectedStrategies) {
            const strategySymbols = [...new Set([...strategy.assetUniverses.flatMap(u => ASSET_UNIVERSE_TICKER_MAP[u]), ...strategy.customSymbols])];
            const availableSymbols = strategySymbols.filter(s => dataResult.data![s] && dataResult.data![s].length > 5);
            
            if (availableSymbols.length === 0) continue;

            const timelineBars = dataResult.data![availableSymbols[0]];
            
            for (let i = 5; i < timelineBars.length; i++) {
                const date = timelineBars[i].t.split('T')[0];
                dailyPnl[date] = dailyPnl[date] || 0;

                // Simple signal generation for this strategy
                if (Math.random() < tradeProbability) { 
                    const symbolToTrade = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
                    const symbolBars = dataResult.data![symbolToTrade];
                    
                    if (!symbolBars || i >= symbolBars.length) continue;
                    
                    const currentBar = symbolBars[i];
                    const weeklySma = symbolBars.slice(i - 5, i).reduce((sum, p) => sum + p.c, 0) / 5;
                    const isUptrend = currentBar.c > weeklySma;
                    
                    if (useWeeklyBias && !isUptrend) continue;

                    const potentialRR = 2.5 + Math.random() * 2.5;
                    const entryPrice = currentBar.o * (1 + (slippage / 100));
                    const stopDistance = entryPrice * (strategy.stopLossPercentage / 100);
                    const stopLossPrice = entryPrice - stopDistance;
                    const takeProfitPrice = entryPrice + stopDistance * potentialRR;
                    
                    let exitPrice = currentBar.c;
                    let exitReason: Trade['exitReason'] = 'EOD';
                    
                    if (currentBar.l <= stopLossPrice) {
                        exitPrice = stopLossPrice;
                        exitReason = 'SL';
                    } else if (currentBar.h >= takeProfitPrice) {
                        exitPrice = takeProfitPrice;
                        exitReason = 'TP';
                    }
                    
                    exitPrice = exitPrice * (1 - (slippage / 100));

                    const assetClass = SYMBOL_TO_ASSET_CLASS_MAP.get(symbolToTrade) || AssetClass.USStocks;
                    const tradeValue = initialCapital * 0.02;
                    const positionSize = tradeValue / entryPrice;
                    const grossPnl = (exitPrice - entryPrice) * positionSize;
                    const netPnl = grossPnl - commission;
                    
                    dailyPnl[date] += netPnl;

                    allTrades.push({
                        id: `trade-${i}-${symbolToTrade}`,
                        symbol: symbolToTrade,
                        pnl: netPnl,
                        pnlPercentage: (netPnl / tradeValue) * 100,
                        positionSize,
                        value: tradeValue,
                        leverage: calculateDynamicLeverage(potentialRR, ASSET_LEVERAGE_MAP[assetClass]),
                        holdingTime,
                        rr: potentialRR,
                        type: netPnl > 0 ? 'WIN' : 'LOSS',
                        assetClass,
                        entryPrice,
                        exitPrice,
                        stopLossPrice,
                        takeProfitPrice,
                        commission,
                        slippage: (entryPrice * (slippage / 100)) + (exitPrice * (slippage / 100)),
                        exitReason,
                    });
                }
            }
        }
        
        setProgress(85);
        setProgressMessage('Generating performance curve and calculating metrics...');
        // --- Generate Performance Curve from Aggregated P&L and Benchmark ---
        const performanceData: PerformanceDataPoint[] = [];
        let portfolioValue = initialCapital;
        let peakValue = initialCapital;
        
        const spyData = dataResult.data['SPY'];
        let spyValue = initialCapital;
        const spyInitialPrice = spyData?.[0]?.c;
        const dateToSpyPriceMap = new Map(spyData?.map(bar => [bar.t.split('T')[0], bar.c]));

        const sortedDates = Object.keys(dailyPnl).sort();

        for (const date of sortedDates) {
            portfolioValue += dailyPnl[date];
            if (portfolioValue > peakValue) {
                peakValue = portfolioValue;
            }
            const drawdown = (peakValue - portfolioValue) / peakValue;

            // Calculate benchmark value
            const currentSpyPrice = dateToSpyPriceMap.get(date);
            if (currentSpyPrice && spyInitialPrice) {
                spyValue = initialCapital * (currentSpyPrice / spyInitialPrice);
            }

            performanceData.push({
                date: date,
                strategy: portfolioValue,
                sp500: spyValue,
                drawdown: drawdown,
            });
        }

        if (performanceData.length === 0) {
            setError('Could not generate performance data. No trades were executed in the simulation.');
            setIsLoading(false);
            return;
        }

        const totalReturn = portfolioValue - initialCapital;
        const totalReturnPercent = (totalReturn / initialCapital) * 100;
        const { sortino, calmar } = calculateAdvancedRatios(performanceData, 0.02, barsPerYear);
        
        const winningTrades = allTrades.filter(t => t.type === 'WIN');
        const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
        const avgLoss = allTrades.filter(t => t.type === 'LOSS').length > 0 ? allTrades.filter(t => t.type === 'LOSS').reduce((sum, t) => sum + t.pnl, 0) / allTrades.filter(t => t.type === 'LOSS').length : 0;
        
        setProgress(100);
        setProgressMessage('Finalizing results...');
        setResults({
            metrics: [
                { label: 'Total P&L', value: `$${totalReturn.toFixed(2)}`, changeType: totalReturn > 0 ? 'positive' : 'negative' },
                { label: 'Total Return', value: `${totalReturnPercent.toFixed(2)}%`, changeType: totalReturn > 0 ? 'positive' : 'negative' },
                { label: 'Max Drawdown', value: `${(Math.max(...performanceData.map(p => p.drawdown || 0)) * 100).toFixed(2)}%` },
                { label: 'Sortino Ratio', value: sortino.toFixed(2) },
                { label: 'Calmar Ratio', value: calmar.toFixed(2) },
            ],
            performanceData,
            pnlDistribution: [], // Placeholder for new calculation
            allTrades,
            allocationData: [], // Placeholder for new calculation
            stopLossFeedback,
            summary: {
                trades: allTrades.length,
                wins: winningTrades.length,
                losses: allTrades.length - winningTrades.length,
                winRate: allTrades.length > 0 ? ((winningTrades.length / allTrades.length) * 100).toFixed(2) : '0.00',
                avgWin,
                avgLoss,
                avgRR: allTrades.length > 0 ? allTrades.reduce((sum, t) => sum + t.rr, 0) / allTrades.length : 0,
                avgPositionSize: allTrades.length > 0 ? allTrades.reduce((sum, t) => sum + t.value, 0) / allTrades.length : 0,
                avgLeverage: allTrades.length > 0 ? allTrades.reduce((sum, t) => sum + t.leverage, 0) / allTrades.length : 0,
            },
            config: { startDate, endDate, initialCapital, commission, slippage }
        });
        setIsLoading(false);
    };
    
    const handleStrategySelection = (strategyId: string) => {
        setSelectedStrategyIds(prev =>
            prev.includes(strategyId) ? prev.filter(id => id !== strategyId) : [...prev, strategyId]
        );
    };

    const setBacktestTimeframe = (period: '1Y' | '3Y' | '5Y' | 'YTD') => {
        const newEndDate = new Date();
        const newStartDate = new Date();
        setTimeframe('1Day'); // Quick select always defaults to daily timeframe
        
        if (period === 'YTD') {
            newStartDate.setMonth(0, 1);
        } else {
            const years = parseInt(period.replace('Y', ''), 10);
            newStartDate.setFullYear(newEndDate.getFullYear() - years);
        }

        setStartDate(newStartDate.toISOString().split('T')[0]);
        setEndDate(newEndDate.toISOString().split('T')[0]);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Portfolio Backtesting</h1>

            <div className="bg-secondary p-6 rounded-lg border border-border-color space-y-4">
                <h2 className="text-xl font-semibold">Configuration</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">1. Select Strategies for Portfolio</label>
                        {savedStrategies.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {savedStrategies.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => handleStrategySelection(s.id)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedStrategyIds.includes(s.id) ? 'bg-accent text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                                    >{s.name}</button>
                                ))}
                            </div>
                        ) : <p className="text-gray-400">No saved strategies. Go to the Strategy Maker to create one.</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-primary border border-border-color rounded-md p-2" />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-primary border border-border-color rounded-md p-2" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Quick Select</label>
                        <div className="flex gap-2 bg-primary border border-border-color p-1 rounded-md">
                            {(['1Y', '3Y', '5Y', 'YTD'] as const).map(p => 
                                <button key={p} onClick={() => setBacktestTimeframe(p)} className="flex-1 text-sm py-1 px-2 rounded hover:bg-secondary transition-colors">
                                    {p}
                                </button>
                            )}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="timeframe" className="block text-sm font-medium text-gray-300 mb-1">Timeframe</label>
                        <select 
                            id="timeframe" 
                            value={timeframe} 
                            onChange={e => setTimeframe(e.target.value as Timeframe)} 
                            className="w-full bg-primary border border-border-color rounded-md p-2"
                        >
                            <option value="1Day">1 Day</option>
                            <option value="1Hour">1 Hour</option>
                            <option value="15Min">15 Minute</option>
                            <option value="5Min">5 Minute</option>
                        </select>
                    </div>
                </div>
                {dateInfo && (
                    <div className="bg-blue-900/30 border border-blue-700 text-blue-300 px-4 py-2 rounded-lg flex items-center text-sm">
                        <Info className="w-4 h-4 mr-3 flex-shrink-0" />
                        {dateInfo}
                    </div>
                )}


                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                     <div>
                        <label htmlFor="capital" className="block text-sm font-medium text-gray-300 mb-1">Initial Capital ($)</label>
                        <input type="number" id="capital" value={initialCapital} onChange={e => setInitialCapital(Number(e.target.value))} className="w-full bg-primary border border-border-color rounded-md p-2" />
                    </div>
                     <div>
                        <label htmlFor="commission" className="block text-sm font-medium text-gray-300 mb-1">Commission ($ per trade)</label>
                        <input type="number" id="commission" value={commission} onChange={e => setCommission(Number(e.target.value))} className="w-full bg-primary border border-border-color rounded-md p-2" />
                    </div>
                     <div>
                        <label htmlFor="slippage" className="block text-sm font-medium text-gray-300 mb-1">Slippage (%)</label>
                        <input type="number" id="slippage" value={slippage} onChange={e => setSlippage(Number(e.target.value))} className="w-full bg-primary border border-border-color rounded-md p-2" />
                    </div>
                    <div className="flex items-center pt-6">
                        <input type="checkbox" id="weekly-bias" checked={useWeeklyBias} onChange={e => setUseWeeklyBias(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-accent bg-primary focus:ring-accent" />
                        <label htmlFor="weekly-bias" className="ml-2 block text-sm text-gray-300">Only trade with trend bias</label>
                    </div>
                </div>
                 <p className="text-xs text-center text-gray-400">All trades are simulated with a Risk/Reward ratio of > 2.5x and use the Stop Loss % defined in each strategy.</p>

                <button
                    onClick={handleRunBacktest}
                    disabled={isLoading || selectedStrategyIds.length === 0}
                    className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Run Portfolio Backtest'}
                </button>
                {isLoading && (
                    <div className="mt-4 space-y-2">
                        <div className="w-full bg-primary rounded-full h-2.5 border border-border-color">
                            <div className="bg-accent h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}></div>
                        </div>
                        <p className="text-center text-sm text-accent mt-2 animate-pulse">{progressMessage}</p>
                    </div>
                )}
                {error && <p className="text-negative text-sm text-center mt-2">{error}</p>}
            </div>

            {results && (
                <div className="space-y-6 animate-fade-in bg-secondary border border-border-color rounded-lg p-6">
                    <h2 className="text-2xl font-bold">Backtest Tear Sheet</h2>
                    
                    <div className="bg-primary border border-border-color p-4 rounded-lg">
                        <h4 className="font-semibold text-accent mb-2 flex items-center gap-2"><Lightbulb /> AI Stop Loss Feedback</h4>
                        <p className="text-sm text-text-secondary">{results.stopLossFeedback}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {results.metrics.map((metric: PortfolioMetric) => <KPI key={metric.label} metric={metric} />)}
                    </div>
                     <div className="bg-primary p-6 rounded-lg border border-border-color text-center">
                        <h3 className="text-lg font-bold mb-4">Trade Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-sm">
                            <div><strong>Total Trades</strong><p>{results.summary.trades}</p></div>
                            <div className="text-positive"><strong>Wins</strong><p>{results.summary.wins}</p></div>
                            <div className="text-negative"><strong>Losses</strong><p>{results.summary.losses}</p></div>
                            <div><strong>Win Rate</strong><p>{results.summary.winRate}%</p></div>
                            <div className="text-positive"><strong>Avg Win</strong><p>${results.summary.avgWin.toFixed(2)}</p></div>
                            <div className="text-negative"><strong>Avg Loss</strong><p>${results.summary.avgLoss.toFixed(2)}</p></div>
                            <div><strong>Avg RR</strong><p>{results.summary.avgRR.toFixed(2)}x</p></div>
                             <div><strong>Avg Pos. Size</strong><p>${results.summary.avgPositionSize.toFixed(2)}</p></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-3 bg-primary p-6 rounded-lg border border-border-color h-96">
                             <h3 className="text-lg font-bold mb-4">Portfolio Performance vs. S&P 500 (Trade Markers on Chart)</h3>
                             <PerformanceChart data={results.performanceData} trades={results.allTrades} />
                        </div>
                         <div className="lg:col-span-2 bg-primary p-6 rounded-lg border border-border-color h-96">
                            <h3 className="text-lg font-bold mb-4 flex items-center"><TrendingDown className="mr-2"/>Drawdown Over Time</h3>
                             <ResponsiveContainer width="100%" height="90%">
                                <AreaChart data={results.performanceData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                                    <XAxis dataKey="date" stroke="#888" style={{ fontSize: '0.75rem' }} />
                                    <YAxis stroke="#888" style={{ fontSize: '0.75rem' }} tickFormatter={(value) => typeof value === 'number' ? `${(value * 100).toFixed(0)}%` : ''} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '0.5rem' }}
                                        labelStyle={{ color: '#fff' }}
                                        formatter={(value: unknown) => [typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : '0.00%', 'Drawdown']}
                                    />
                                    <Area type="monotone" dataKey="drawdown" stroke="#DA3633" fill="#DA3633" fillOpacity={0.2} strokeWidth={2} dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="lg:col-span-1 bg-primary p-6 rounded-lg border border-border-color h-96">
                           <h3 className="text-lg font-bold mb-4 flex items-center"><BarChart2 className="mr-2"/>P&L Distribution (placeholder)</h3>
                            <div className="flex items-center justify-center h-full text-text-secondary">P&L chart coming soon.</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
                        <TradeLogTable trades={results.allTrades.slice(0, 50)} title="Trade Log (Last 50 Trades)" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Backtesting;

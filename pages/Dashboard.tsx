
import React, { useState, useEffect, useCallback, useRef } from 'react';
import KPI from '../components/KPI';
import PerformanceChart from '../components/PerformanceChart';
import AllocationPieChart from '../components/AllocationPieChart';
import TradeLogTable from '../components/TradeLogTable';
import { PortfolioMetric, PerformanceDataPoint, Allocation, Trade, SavedStrategy, AlpacaPosition, AssetClass } from '../types';
import { useApp } from '../context/AppContext';
import { fetchPositions, executeTrade, verifyKeysAndFetchAccount } from '../services/brokerService';
import { fetchSnapshots } from '../services/marketDataService';
import { ASSET_COLORS, ASSET_UNIVERSE_TICKER_MAP, SYMBOL_TO_ASSET_CLASS_MAP, ASSET_LEVERAGE_MAP } from '../constants';
import { Play, Pause, AlertTriangle, Send, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const generateMockPerformanceData = (initialCapital: number, days: number) => {
    const data: PerformanceDataPoint[] = [];
    let strategyValue = initialCapital;
    let sp500Value = initialCapital;
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        data.push({
            date: date.toISOString().split('T')[0],
            strategy: strategyValue,
            sp500: sp500Value,
        });
        strategyValue *= (1 + (Math.random() - 0.495) * 0.015);
        sp500Value *= (1 + (Math.random() - 0.48) * 0.008);
    }
    return data;
};

const calculateMaxDrawdown = (data: PerformanceDataPoint[]): { value: number, percentage: number } => {
    let maxDrawdown = 0;
    let peak = -Infinity;
    if (data.length === 0) return { value: 0, percentage: 0 };

    for (const point of data) {
        const value = point.strategy;
        if (value > peak) {
            peak = value;
        }
        const drawdown = peak - value;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }
    const maxDrawdownPercentage = (peak > 0) ? (maxDrawdown / peak) * 100 : 0;
    return { value: maxDrawdown, percentage: maxDrawdownPercentage };
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


const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { savedStrategies, brokerStatus, account, setAccount, tradeLog, addTradeToLog } = useApp();
  const [isBotActive, setIsBotActive] = useState(false);
  const [metrics, setMetrics] = useState<PortfolioMetric[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([]);
  const [allocationData, setAllocationData] = useState<Allocation[]>([]);
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [isTestingTrade, setIsTestingTrade] = useState(false);
  const [testTradeStatus, setTestTradeStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'30D' | '90D' | 'YTD' | '1Y'>('30D');
  const intervalRef = useRef<number | null>(null);
  
  const isReadyToTrade = brokerStatus === 'connected' && selectedStrategyIds.length > 0;

  const updateMetricsFromAccount = useCallback((currentAccount: typeof account, perfData: PerformanceDataPoint[]) => {
    if (!currentAccount) return;
    const portfolioValue = parseFloat(currentAccount.portfolio_value);
    const equityChange = portfolioValue - parseFloat(currentAccount.last_equity);
    const equityChangePercent = (equityChange / parseFloat(currentAccount.last_equity)) * 100;
    const drawdown = calculateMaxDrawdown(perfData);

    setMetrics([
        { label: 'Portfolio Value', value: `$${portfolioValue.toFixed(2)}` },
        { label: 'Today\'s P&L', value: `$${equityChange.toFixed(2)}`, change: `${equityChangePercent.toFixed(2)}%`, changeType: equityChange >= 0 ? 'positive' : 'negative' },
        { label: 'Cash', value: `$${parseFloat(currentAccount.cash).toFixed(2)}` },
        { label: 'Buying Power', value: `$${parseFloat(currentAccount.buying_power).toFixed(2)}` },
        { label: 'Max Drawdown', value: `${drawdown.percentage.toFixed(2)}%` },
    ]);
  }, []);
  
  const updateAllocationsFromPositions = useCallback((positions: AlpacaPosition[]) => {
      const newAllocation: { [key: string]: number } = {};
      if (!positions || positions.length === 0) {
          setAllocationData([]);
          return;
      }

      positions.forEach(pos => {
          const assetClass = pos.asset_class.toUpperCase().includes('CRYPTO') ? AssetClass.Crypto : AssetClass.USStocks;
          newAllocation[assetClass] = (newAllocation[assetClass] || 0) + parseFloat(pos.market_value);
      });
      
      setAllocationData(Object.entries(newAllocation).map(([name, value]) => ({
          name,
          value,
          fill: ASSET_COLORS[name as AssetClass] || '#8884d8'
      })));
  }, []);

  useEffect(() => {
    const daysMap = { '30D': 30, '90D': 90, '1Y': 365 };
    let days = daysMap[timeframe as keyof typeof daysMap] || 30;
    if (timeframe === 'YTD') {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        days = Math.floor((new Date().getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    }
      
    const initialCapital = account ? parseFloat(account.portfolio_value) : 100000;
    const perfData = generateMockPerformanceData(initialCapital, days);
    setPerformanceData(perfData);
    
    if (account) {
        updateMetricsFromAccount(account, perfData);
    } else {
        const drawdown = calculateMaxDrawdown(perfData);
        setMetrics([
          { label: 'Portfolio Value', value: `$${perfData[perfData.length-1]?.strategy.toFixed(2) || initialCapital.toFixed(2)}` },
          { label: 'Today\'s P&L', value: `$0.00` },
          { label: 'Cash', value: `$${initialCapital.toFixed(2)}` },
          { label: 'Buying Power', value: `$${initialCapital.toFixed(2)}` },
          { label: 'Max Drawdown', value: `${drawdown.percentage.toFixed(2)}%` },
        ]);
    }
  }, [account, updateMetricsFromAccount, timeframe]);

  const runBotCycle = useCallback(async () => {
    if (brokerStatus === 'connected') {
        console.log("LIVE MODE: Bot cycle running: fetching positions...");
        const positionsResult = await fetchPositions();
        if(positionsResult.success && positionsResult.data) {
            updateAllocationsFromPositions(positionsResult.data);
        }
    }
    
    // Simulate a completed trade to add to the log
    if (Math.random() < 0.25) { // Increased frequency for demo
        console.log("Executing a new simulated trade...");
        
        const activeStrategies = savedStrategies.filter(s => selectedStrategyIds.includes(s.id));
        if (activeStrategies.length === 0) return;

        const randomStrategy = activeStrategies[Math.floor(Math.random() * activeStrategies.length)];
        
        const universeSymbols = randomStrategy.assetUniverses.flatMap(universe => ASSET_UNIVERSE_TICKER_MAP[universe]);
        const allSymbols = [...new Set([...universeSymbols, ...randomStrategy.customSymbols])];
        
        if (allSymbols.length === 0) return;

        const symbolToTrade = allSymbols[Math.floor(Math.random() * allSymbols.length)];
        
        const assetClass = SYMBOL_TO_ASSET_CLASS_MAP.get(symbolToTrade) || AssetClass.USStocks;
        
        const riskRewardRatio = Math.random() * 2.5 + 2.5; // Enforce > 2.5 RR
        const stopLossPercentage = randomStrategy.stopLossPercentage || 2.0; // Default to 2% SL

        const maxLeverage = ASSET_LEVERAGE_MAP[assetClass];
        const leverage = calculateDynamicLeverage(riskRewardRatio, maxLeverage);

        const portfolioValue = account ? parseFloat(account.portfolio_value) : 100000;
        const tradeValue = portfolioValue * (Math.random() * 0.04 + 0.01); // 1-5% of portfolio

        const entryPrice = Math.random() * 200 + 100;
        const positionSize = tradeValue / entryPrice;

        const pnl = (tradeValue * (Math.random() - 0.4) * 0.15); // Simulate a +/- 15% outcome
        const pnlPercentage = (pnl / tradeValue) * 100;
        
        const stopLossPrice = entryPrice * (1 - stopLossPercentage / 100);
        const takeProfitPrice = entryPrice + (entryPrice - stopLossPrice) * riskRewardRatio;
        const exitReasons: Trade['exitReason'][] = ['TP', 'SL', 'EOD'];

        const newTrade: Trade = {
            id: `trade_${Date.now()}_${Math.random()}`,
            symbol: symbolToTrade,
            pnl,
            pnlPercentage,
            positionSize,
            value: tradeValue,
            leverage,
            holdingTime: `${Math.floor(Math.random() * 48) + 1}h`,
            rr: riskRewardRatio,
            entryPrice: entryPrice,
            exitPrice: entryPrice + (pnl / positionSize),
            stopLossPrice,
            takeProfitPrice,
            type: pnl > 0 ? 'WIN' : 'LOSS',
            assetClass,
            commission: 0.50,
            slippage: entryPrice * positionSize * 0.0001,
            exitReason: exitReasons[Math.floor(Math.random() * exitReasons.length)],
        };
        addTradeToLog(newTrade);
    }
  }, [addTradeToLog, brokerStatus, savedStrategies, selectedStrategyIds, account, updateAllocationsFromPositions]);

  const handleToggleBot = () => {
    if (isBotActive) {
      setIsBotActive(false);
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
        if (!isReadyToTrade) {
            if (brokerStatus !== 'connected') {
                if(selectedStrategyIds.length === 0) return;
            } else {
               navigate('/configuration');
               return;
            }
        }
        setIsBotActive(true);
        runBotCycle(); 
        intervalRef.current = window.setInterval(runBotCycle, 5000); 
    }
  };
  
    const handleTestTrade = async () => {
        setIsTestingTrade(true);
        setTestTradeStatus(null);

        // Fetch current price to set realistic SL/TP
        const snapshotsResult = await fetchSnapshots(['AAPL']);
        let result;
        if (snapshotsResult.success && snapshotsResult.data?.AAPL) {
            const currentPrice = snapshotsResult.data.AAPL.latestQuote.p;
            if (currentPrice > 0) {
                const stopPrice = currentPrice * (1 - 0.02); // 2% SL
                const takeProfitPrice = currentPrice + (currentPrice - stopPrice) * 3; // 3x RR
                
                result = await executeTrade({
                    symbol: 'AAPL',
                    notional: '10',
                    side: 'buy',
                    type: 'market',
                    time_in_force: 'day',
                    order_class: 'bracket',
                    take_profit: { limit_price: takeProfitPrice.toFixed(2) },
                    stop_loss: { stop_price: stopPrice.toFixed(2) }
                });
            } else {
                 result = { success: false, data: null, error: { type: 'API_ERROR', message: "Could not fetch valid price for AAPL."}};
            }
        } else {
            // Fallback for safety, though it should ideally not happen.
            result = await executeTrade({ symbol: 'AAPL', notional: '10', side: 'buy', type: 'market', time_in_force: 'day' });
        }

        if (result.success && result.data) {
            const amount = result.data.notional ? `$${result.data.notional}` : `${result.data.qty} shares of`;
            const orderType = result.data.order_class === 'bracket' ? 'bracket trade' : 'trade';
            setTestTradeStatus({ type: 'success', message: `Test ${orderType} to ${result.data.side} ${amount} ${result.data.symbol} submitted successfully.` });
        } else {
             setTestTradeStatus({ type: 'error', message: result.error?.message || "Failed to execute test trade." });
        }
        setIsTestingTrade(false);
        setTimeout(() => setTestTradeStatus(null), 5000);
    };

    const handleRefreshData = useCallback(async () => {
        setIsRefreshing(true);

        if (brokerStatus === 'connected') {
            const [accountResult, positionsResult] = await Promise.all([
                verifyKeysAndFetchAccount(),
                fetchPositions()
            ]);

            if (accountResult.success && accountResult.data) {
                setAccount(accountResult.data);
            } else {
                console.error("Failed to refresh account data:", accountResult.error?.message);
            }

            if (positionsResult.success && positionsResult.data) {
                updateAllocationsFromPositions(positionsResult.data);
            } else {
                 console.error("Failed to refresh positions data:", positionsResult.error?.message);
            }

        } else {
            // In simulation mode, re-run the initial data generation
            const daysMap = { '30D': 30, '90D': 90, '1Y': 365 };
            let days = daysMap[timeframe as keyof typeof daysMap] || 30;
            if (timeframe === 'YTD') {
                const startOfYear = new Date(new Date().getFullYear(), 0, 1);
                days = Math.floor((new Date().getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) || 1;
            }
            const initialCapital = 100000;
            const perfData = generateMockPerformanceData(initialCapital, days);
            setPerformanceData(perfData);
            const drawdown = calculateMaxDrawdown(perfData);
            setMetrics([
                { label: 'Portfolio Value', value: `$${perfData[perfData.length-1]?.strategy.toFixed(2) || initialCapital.toFixed(2)}` },
                { label: 'Today\'s P&L', value: `$0.00` },
                { label: 'Cash', value: `$${initialCapital.toFixed(2)}` },
                { label: 'Buying Power', value: `$${initialCapital.toFixed(2)}` },
                { label: 'Max Drawdown', value: `${drawdown.percentage.toFixed(2)}%` },
            ]);
            setAllocationData([]);
        }

        setIsRefreshing(false);
    }, [brokerStatus, setAccount, updateAllocationsFromPositions, timeframe]);

  const handleStrategySelection = (strategyId: string) => {
    setSelectedStrategyIds(prev => 
        prev.includes(strategyId) 
            ? prev.filter(id => id !== strategyId) 
            : [...prev, strategyId]
    );
  }

  useEffect(() => {
    return () => { 
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  const canStartBot = (brokerStatus === 'connected' && selectedStrategyIds.length > 0) || (brokerStatus !== 'connected' && selectedStrategyIds.length > 0);

  const winningTrades = tradeLog.filter(t => t.pnl > 0).sort((a, b) => b.pnl - a.pnl).slice(0, 5);
  const losingTrades = tradeLog.filter(t => t.pnl <= 0).sort((a, b) => a.pnl - b.pnl).slice(0, 5);

  const tradeSummary = React.useMemo(() => {
    if (tradeLog.length === 0) {
        return { avgWin: 0, avgLoss: 0, avgRR: 0, avgPositionSize: 0, avgLeverage: 0 };
    }
    const wins = tradeLog.filter(t => t.pnl > 0);
    const losses = tradeLog.filter(t => t.pnl <= 0);
    const avgWin = wins.length > 0 ? wins.reduce((acc, t) => acc + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((acc, t) => acc + t.pnl, 0) / losses.length : 0;
    const avgRR = tradeLog.reduce((acc, t) => acc + t.rr, 0) / tradeLog.length;
    const avgPositionSize = tradeLog.reduce((acc, t) => acc + t.value, 0) / tradeLog.length;
    const avgLeverage = tradeLog.reduce((acc, t) => acc + t.leverage, 0) / tradeLog.length;
    return { avgWin, avgLoss, avgRR, avgPositionSize, avgLeverage };
  }, [tradeLog]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold">Live Trading Dashboard</h1>
            <p className="text-sm text-text-secondary mt-1">Monitor live performance, allocations, and bot activity.</p>
        </div>
        <div className="flex items-center gap-2">
            <button
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className="flex items-center px-4 py-2 rounded-lg font-semibold transition-all duration-200 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-sm"
            >
                {isRefreshing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : <RefreshCw className="w-4 h-4 mr-2" />}
                Refresh Data
            </button>
            <button
                onClick={handleTestTrade}
                disabled={brokerStatus !== 'connected' || isTestingTrade}
                className="flex items-center px-4 py-2 rounded-lg font-semibold transition-all duration-200 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-sm"
            >
                {isTestingTrade ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : <Send className="w-4 h-4 mr-2" />}
                $10 AAPL Test Trade
            </button>
            <button
                onClick={handleToggleBot}
                disabled={!canStartBot && !isBotActive}
                className={`flex items-center px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    isBotActive 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:bg-gray-500 disabled:cursor-not-allowed`}
            >
                {isBotActive ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                {isBotActive ? 'Stop Bot' : 'Start Bot'}
            </button>
        </div>
      </div>
      
      {testTradeStatus && (
        <div className={`text-sm p-3 rounded-md text-center ${testTradeStatus.type === 'success' ? 'bg-green-900/50 text-positive' : 'bg-red-900/50 text-negative'}`}>
            {testTradeStatus.message}
        </div>
      )}

      {isBotActive && brokerStatus !== 'connected' && (
          <div className="bg-orange-900/50 border border-orange-700 text-orange-300 px-4 py-3 rounded-lg flex items-center">
            <AlertTriangle className="w-5 h-5 mr-3" />
            <strong>SIMULATION MODE:</strong> The bot is running with simulated data as the broker is not connected. All trades are fictional.
          </div>
      )}

      {brokerStatus !== 'connected' && (
          <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 px-4 py-3 rounded-lg flex items-center">
            <AlertTriangle className="w-5 h-5 mr-3" />
            Broker not connected. Please go to the <a href="#/configuration" className="font-bold underline hover:text-yellow-100">Configuration</a> page to connect your broker. Bot will run in simulation mode.
          </div>
      )}

      <div className="bg-secondary p-4 rounded-lg border border-border-color">
          <h3 className="text-lg font-bold mb-3">Select Strategies to Run</h3>
          {savedStrategies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
                {savedStrategies.map(s => (
                    <button 
                        key={s.id}
                        onClick={() => handleStrategySelection(s.id)}
                        disabled={isBotActive}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedStrategyIds.includes(s.id) ? 'bg-accent text-white' : 'bg-gray-700 hover:bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {s.name}
                    </button>
                ))}
            </div>
          ) : (
            <p className="text-gray-400">No saved strategies found. Please create one in the Strategy Maker.</p>
          )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {metrics.map(metric => <KPI key={metric.label} metric={metric} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-secondary p-6 rounded-lg border border-border-color">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Live Performance</h3>
                <div className="flex gap-1 bg-primary p-1 rounded-md">
                    {(['30D', '90D', 'YTD', '1Y'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTimeframe(t)}
                            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${timeframe === t ? 'bg-accent text-white' : 'bg-transparent hover:bg-gray-800'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>
            <div className="h-80">
                <PerformanceChart data={performanceData} trades={tradeLog} />
            </div>
        </div>
        <AllocationPieChart data={allocationData} title="Live Portfolio Allocation" />
      </div>

      <div className="space-y-6">
        <div className="bg-secondary p-4 rounded-lg border border-border-color text-center">
            <h3 className="text-lg font-bold mb-2">Trade Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                <div className="text-positive"><strong>Avg Win</strong><p>${tradeSummary.avgWin.toFixed(2)}</p></div>
                <div className="text-negative"><strong>Avg Loss</strong><p>${tradeSummary.avgLoss.toFixed(2)}</p></div>
                <div><strong>Avg RR</strong><p>{tradeSummary.avgRR.toFixed(2)}x</p></div>
                <div><strong>Avg Position Size</strong><p>${tradeSummary.avgPositionSize.toFixed(2)}</p></div>
                <div><strong>Avg Leverage</strong><p>{tradeSummary.avgLeverage.toFixed(1)}x</p></div>
            </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <TradeLogTable trades={winningTrades} title="Top 5 Winning Trades" />
            <TradeLogTable trades={losingTrades} title="Top 5 Losing Trades" />
        </div>
      </div>

    </div>
  );
};

export default Dashboard;

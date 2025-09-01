import React, { useState, useEffect, useCallback } from 'react';
import { fetchStockHistoricalData, fetchCryptoHistoricalData, fetchForexHistoricalData, fetchSnapshots } from '../services/marketDataService';
import { EnhancedMarketOverviewData, MarketMover, ChartableAsset, ChartDataPoint, AlpacaBar, AlpacaCryptoBar, AlpacaForexBar } from '../types';
import { POPULAR_TICKERS } from '../constants';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import MiniChart from '../components/MiniChart';


const MoversList: React.FC<{ title: string; movers: MarketMover[]; type: 'gainer' | 'loser' }> = ({ title, movers, type }) => (
    <div>
        <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${type === 'gainer' ? 'text-positive' : 'text-negative'}`}>
            {type === 'gainer' ? <TrendingUp /> : <TrendingDown />}
            {title}
        </h3>
        <div className="space-y-2">
            {movers.slice(0, 5).map(mover => (
                 <div key={mover.ticker} className="bg-primary p-3 rounded-md flex justify-between items-center text-sm">
                    <div>
                        <p className="font-bold text-text-primary">{mover.ticker}</p>
                        <p className="text-text-secondary text-xs truncate w-32">{mover.companyName}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold text-text-primary">${mover.price.toFixed(2)}</p>
                        <p className={`font-semibold ${type === 'gainer' ? 'text-positive' : 'text-negative'}`}>
                            {mover.changePercent.toFixed(2)}%
                        </p>
                    </div>
                 </div>
            ))}
        </div>
    </div>
);


const MarketOverview: React.FC = () => {
    const [data, setData] = useState<EnhancedMarketOverviewData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const transformToChartableAsset = (
        name: string,
        bars: AlpacaBar[] | AlpacaCryptoBar[] | AlpacaForexBar[] | undefined,
        currentPrice?: number,
        previousPrice?: number
    ): ChartableAsset => {
        if (!bars || bars.length < 2) {
             const price = currentPrice || 0;
             const change = previousPrice ? price - previousPrice : 0;
             const changePercent = previousPrice ? (change / previousPrice) * 100 : 0;
             return { name, value: price, change, changePercent, historicalData: [] };
        }

        const historicalData: ChartDataPoint[] = bars.map(bar => ({
            date: bar.t.split('T')[0],
            value: bar.c
        }));
        
        const latestValue = bars[bars.length - 1].c;
        const previousValue = bars[bars.length - 2].c;
        const change = latestValue - previousValue;
        const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

        return {
            name,
            value: latestValue,
            change,
            changePercent,
            historicalData
        };
    };

    const fetchData = useCallback(async () => {
        if (!data) setIsLoading(true);
        setError(null);
        try {
            const [
                stockDataRes,
                cryptoDataRes,
                forexDataRes,
                moversSnapshotsRes
            ] = await Promise.all([
                fetchStockHistoricalData(['SPY', 'GLD', 'TLT']),
                fetchCryptoHistoricalData('BTC/USD'),
                fetchForexHistoricalData('EUR/USD'),
                fetchSnapshots(POPULAR_TICKERS)
            ]);

            if (!stockDataRes.success || !stockDataRes.data) throw new Error('Failed to fetch stock data.');
            if (!cryptoDataRes.success || !cryptoDataRes.data) throw new Error('Failed to fetch crypto data.');
            if (!forexDataRes.success || !forexDataRes.data) throw new Error('Failed to fetch forex data.');
            if (!moversSnapshotsRes.success || !moversSnapshotsRes.data) throw new Error('Failed to fetch movers data.');

            const sp500 = transformToChartableAsset("S&P 500 (SPY)", stockDataRes.data['SPY']);
            const gold = transformToChartableAsset("Gold (GLD)", stockDataRes.data['GLD']);
            const bondTlt = transformToChartableAsset("20Y Bond (TLT)", stockDataRes.data['TLT']);
            const bitcoin = transformToChartableAsset("Bitcoin (BTC/USD)", cryptoDataRes.data.bars);
            const eurUsd = transformToChartableAsset("EUR/USD", forexDataRes.data.bars);
            
            const moversData = Object.values(moversSnapshotsRes.data).map(snapshot => {
                const price = snapshot.latestQuote?.p || 0;
                const prevClose = snapshot.prevDailyBar?.c || 0;
                const change = price - prevClose;
                const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
                return {
                    ticker: snapshot.symbol,
                    companyName: snapshot.symbol, // Placeholder, asset endpoint needed for full name
                    price,
                    change,
                    changePercent
                };
            }).sort((a, b) => b.changePercent - a.changePercent);

            const gainers = moversData.filter(m => m.changePercent > 0);
            const losers = moversData.filter(m => m.changePercent <= 0).sort((a,b) => a.changePercent - b.changePercent);
            
            setData({
                charts: { sp500, gold, eurUsd, bitcoin, bondTlt },
                movers: { gainers, losers }
            });

        } catch (e: any) {
            setError(e.message || 'Failed to fetch market data from the backend. Please ensure it is running.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [data]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 90000); // Refresh every 90 seconds
        return () => clearInterval(interval);
    }, [fetchData]);

    const renderContent = () => {
        if (isLoading && !data) {
            return (
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex items-start">
                    <AlertTriangle className="w-8 h-8 mr-4 flex-shrink-0"/>
                    <div>
                        <h3 className="font-bold">Error Fetching Market Data</h3>
                        <p className="text-sm">{error}</p>
                         <button onClick={fetchData} className="mt-2 bg-accent text-white px-3 py-1 rounded text-sm font-semibold hover:bg-accent-hover">
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        if (!data) return null;

        return (
            <div className="space-y-6 animate-fade-in">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <MiniChart asset={data.charts.sp500} color="#58A6FF" />
                    <MiniChart asset={data.charts.gold} color="#EAB308" />
                    <MiniChart asset={data.charts.eurUsd} color="#F97316" />
                    <MiniChart asset={data.charts.bitcoin} color="#EF4444" />
                    <MiniChart asset={data.charts.bondTlt} color="#8B5CF6" />
                </div>

                <div>
                    <h2 className="text-2xl font-bold mt-8 mb-4">Today's Top Movers (S&P 500)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-secondary p-6 rounded-lg border border-border-color">
                       <MoversList title="Top Gainers" movers={data.movers.gainers} type="gainer" />
                       <MoversList title="Top Losers" movers={data.movers.losers} type="loser" />
                    </div>
                </div>

            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                 <div>
                    <h1 className="text-3xl font-bold">Market Overview</h1>
                    <p className="text-text-secondary">Live market snapshot from data provider. Updates automatically.</p>
                </div>
                {isLoading && data && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent"></div>}
            </div>
           
            {renderContent()}
        </div>
    );
};

export default MarketOverview;

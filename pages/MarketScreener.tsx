import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ScreenerResult } from '../types';
import { getScreenerData } from '../services/geminiService';
import { fetchSnapshots } from '../services/marketDataService';
import { SECTORS, COUNTRIES } from '../constants';
import { ChevronsUpDown, ArrowUp, ArrowDown, RefreshCw, AlertTriangle, Info } from 'lucide-react';

type SortConfig = {
    key: keyof ScreenerResult;
    direction: 'ascending' | 'descending';
} | null;

const MarketScreener: React.FC = () => {
    const [filters, setFilters] = useState({
        sector: 'All',
        country: 'All',
        marketCapMin: '',
        marketCapMax: '',
    });
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'marketCap', direction: 'descending' });

    const [allAssets, setAllAssets] = useState<ScreenerResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // 1. Fetch base list of assets from Gemini (name, sector, approx. market cap)
            const baseAssets = await getScreenerData();
            const tickers = baseAssets.map(a => a.ticker);

            // 2. Fetch live snapshot data from Alpaca
            const snapshotsResult = await fetchSnapshots(tickers);
            if (!snapshotsResult.success || !snapshotsResult.data) {
                throw new Error(snapshotsResult.error?.message || 'Failed to fetch live market data.');
            }
            const snapshots = snapshotsResult.data;

            // 3. Merge live data into the base list
            const mergedAssets: ScreenerResult[] = baseAssets.map(asset => {
                const snapshot = snapshots[asset.ticker];
                if (snapshot) {
                    const price = snapshot.latestQuote?.p || 0;
                    const prevClose = snapshot.prevDailyBar?.c || 0;
                    const change = price - prevClose;
                    const change1D = prevClose > 0 ? (change / prevClose) * 100 : 0;
                    const volume = (snapshot.dailyBar?.v || 0) / 1_000_000; // to millions
                    return { ...asset, price, change1D, volume };
                }
                // Return asset with 0s if no live data was found
                return { ...asset, price: 0, change1D: 0, volume: 0 };
            });

            setAllAssets(mergedAssets);

        } catch (e: any) {
            setError(e.message || 'Failed to fetch screener data. The API key or backend connection may have issues.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const requestSort = (key: keyof ScreenerResult) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const filteredData = useMemo(() => {
        if (allAssets.length === 0) return [];
        let data = [...allAssets];

        if (filters.sector !== 'All') {
            data = data.filter(item => item.sector === filters.sector);
        }

        if (filters.country !== 'All') {
            data = data.filter(item => item.country === filters.country);
        }

        const minCap = parseFloat(filters.marketCapMin);
        const maxCap = parseFloat(filters.marketCapMax);
        if (!isNaN(minCap)) {
            data = data.filter(item => item.marketCap >= minCap);
        }
        if (!isNaN(maxCap)) {
            data = data.filter(item => item.marketCap <= maxCap);
        }
        
        return data;
    }, [filters, allAssets]);

    const sortedAndFilteredData = useMemo(() => {
        let sortableItems = [...filteredData];
        
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);

    const renderSortArrow = (key: keyof ScreenerResult) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ChevronsUpDown className="w-4 h-4 ml-1 flex-shrink-0 text-text-secondary" />;
        }
        return sortConfig.direction === 'ascending' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />;
    }

    const headers: { key: keyof ScreenerResult, label: string }[] = [
        { key: 'ticker', label: 'Ticker' },
        { key: 'companyName', label: 'Company Name' },
        { key: 'sector', label: 'Sector' },
        { key: 'marketCap', label: 'Market Cap (B)' },
        { key: 'price', label: 'Price ($)' },
        { key: 'change1D', label: 'Change (1D)' },
        { key: 'volume', label: 'Volume (M)' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Market Screener</h1>
                <button
                    onClick={fetchData}
                    disabled={isLoading}
                    className="bg-accent hover:bg-accent-hover text-white font-semibold py-2 px-4 rounded-lg disabled:bg-gray-500 flex items-center justify-center"
                >
                    {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <RefreshCw className="w-5 h-5" />}
                    <span className="ml-2">Refresh Data</span>
                </button>
            </div>
            
             <div className="bg-blue-900/30 border border-blue-700 text-blue-300 px-4 py-3 rounded-lg flex items-start text-sm">
                <Info className="w-5 h-5 mr-3 mt-1 flex-shrink-0" />
                <div>
                <strong>Hybrid Data Mode:</strong> The asset list and static data (sector, market cap) are provided by AI. Live price, change, and volume are fetched from a real market data feed.
                </div>
            </div>


            <div className="bg-secondary p-4 rounded-lg border border-border-color">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="text-sm font-medium">Sector</label>
                        <select name="sector" value={filters.sector} onChange={handleFilterChange} className="w-full bg-primary border border-border-color rounded-md p-2 mt-1">
                            <option value="All">All Sectors</option>
                            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Country/Region</label>
                        <select name="country" value={filters.country} onChange={handleFilterChange} className="w-full bg-primary border border-border-color rounded-md p-2 mt-1">
                            <option value="All">All Regions</option>
                            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="lg:col-span-2">
                        <label className="text-sm font-medium">Market Cap ($B)</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="number" name="marketCapMin" value={filters.marketCapMin} onChange={handleFilterChange} placeholder="Min" className="w-full bg-primary border border-border-color rounded-md p-2" />
                            <span className="text-text-secondary">-</span>
                            <input type="number" name="marketCapMax" value={filters.marketCapMax} onChange={handleFilterChange} placeholder="Max" className="w-full bg-primary border border-border-color rounded-md p-2" />
                        </div>
                    </div>
                </div>
            </div>

             {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex items-start">
                    <AlertTriangle className="w-8 h-8 mr-4 flex-shrink-0"/>
                    <div>
                        <h3 className="font-bold">Error Fetching Screener Data</h3>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

            <div className="bg-secondary p-4 rounded-lg border border-border-color">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-700/50">
                            <tr>
                                {headers.map(header => (
                                    <th key={header.key} scope="col" className="p-3 cursor-pointer whitespace-nowrap" onClick={() => requestSort(header.key)}>
                                        <div className="flex items-center">
                                            {header.label}
                                            {renderSortArrow(header.key)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={headers.length} className="text-center p-8">
                                        <div className="flex items-center justify-center gap-2 text-text-secondary">
                                             <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                                             Fetching and merging live market data...
                                        </div>
                                    </td>
                                </tr>
                            ) : sortedAndFilteredData.length > 0 ? sortedAndFilteredData.map((item) => (
                                <tr key={item.ticker} className="border-b border-border-color hover:bg-gray-700/30">
                                    <td className="p-3 font-bold text-accent">{item.ticker}</td>
                                    <td className="p-3 whitespace-nowrap">{item.companyName}</td>
                                    <td className="p-3">{item.sector}</td>
                                    <td className="p-3">{item.marketCap.toLocaleString()}</td>
                                    <td className="p-3">${item.price.toFixed(2)}</td>
                                    <td className={`p-3 font-medium ${item.change1D >= 0 ? 'text-positive' : 'text-negative'}`}>{item.change1D.toFixed(2)}%</td>
                                    <td className="p-3">{item.volume.toFixed(2)}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={headers.length} className="text-center p-8 text-gray-400">
                                        {allAssets.length > 0 ? "No assets match the current filters." : "No assets could be fetched."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MarketScreener;

import { StrategyModel, AssetClass, AssetUniverse, ScreenerResult, Indicator, StrategyObjective } from './types';

export const STRATEGY_MODELS: StrategyModel[] = [
    StrategyModel.LSTM,
    StrategyModel.LLM,
    StrategyModel.LinearRegression,
    StrategyModel.SVM,
    StrategyModel.RandomForest,
    StrategyModel.MonteCarlo,
    StrategyModel.MeanReversion,
    StrategyModel.SentimentAnalysis,
    StrategyModel.BollingerBands,
    StrategyModel.RSI,
    StrategyModel.MACD,
    StrategyModel.IchimokuCloud,
];

export const ASSET_CLASSES: AssetClass[] = Object.values(AssetClass);

export const ASSET_UNIVERSES: AssetUniverse[] = Object.values(AssetUniverse);

export const INDICATORS: Indicator[] = Object.values(Indicator);

export const STRATEGY_OBJECTIVES: StrategyObjective[] = Object.values(StrategyObjective);


export const ASSET_COLORS: { [key in AssetClass]: string } = {
  [AssetClass.USStocks]: '#3b82f6',
  [AssetClass.GlobalStocks]: '#d946ef',
  [AssetClass.Crypto]: '#f97316',
  [AssetClass.Commodities]: '#16a34a',
  [AssetClass.Forex]: '#ef4444',
  [AssetClass.Bonds]: '#8b5cf6',
  [AssetClass.Indices]: '#eab308',
  [AssetClass.UKStocks]: '#06b6d4',
  [AssetClass.EUStocks]: '#6366f1',
  [AssetClass.AsianStocks]: '#f43f5e',
};

// --- Comprehensive Asset Universe Lists ---
// In a real application, these lists would be fetched dynamically from a data provider.
// These are representative samples.

const SP500_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'JPM', 'JNJ', 'V', 'UNH', 'HD', 'PG', 'BAC', 'MA', 'XOM', 'CVX', 'PFE', 'KO', 'PEP', 'DIS']; // ... and 480 others
const EU_TOP_50_SYMBOLS = ['ASML.AS', 'NVO', 'LVMH.PA', 'MC.PA', 'OR.PA', 'SAP.DE', 'SIE.DE', 'AIR.PA', 'TTE', 'IDEXY']; // ... and 490 others
const UK_TOP_100_SYMBOLS = ['SHEL', 'AZN.L', 'HSBA.L', 'ULVR.L', 'DGE.L', 'BP.L', 'BATS.L', 'GLEN.L', 'RIO.L', 'BARC.L']; // ... and 90 others
const ASIAN_TOP_50_SYMBOLS = ['BABA', 'TM', 'SONY', '600519.SS', 'TSM', 'TCEHY', 'HDB', 'SMFG', 'MUFG', 'INFY']; // ... and 40 others
const TOP_BONDS_SYMBOLS = ['TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'BND', 'AGG', 'TIP', 'JNK', 'VCSH'];
const TOP_INDICES_SYMBOLS = ['^GSPC', '^GDAXI', '^FTSE', '^N225', '^HSI', 'EEM'];
const TOP_FOREX_SYMBOLS = ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X', 'USDCAD=X', 'USDCHF=X', 'NZDUSD=X', 'EURJPY=X', 'GBPJPY=X', 'EURGBP=X', 'AUDJPY=X', 'CADJPY=X', 'CHFJPY=X', 'EURAUD=X', 'EURCAD=X'];
const TOP_COMMODITIES_SYMBOLS = ['GLD', 'SLV', 'USO', 'UNG', 'CORN', 'WEAT', 'SOYB', 'DBA', 'USCI', 'PPLT', 'PALL', 'CPER', 'NIB', 'JO', 'SGG'];

export const POPULAR_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'JNJ', 'V', 'UNH', 'HD', 'PG', 'BAC', 'MA', 'XOM', 'CVX', 'PFE', 'KO', 'PEP', 'DIS', 'NFLX', 'CRM', 'ADBE', 'PYPL', 'INTC', 'CSCO', 'CMCSA', 'ABNB'];


export const ASSET_UNIVERSE_TICKER_MAP: { [key in AssetUniverse]: string[] } = {
    [AssetUniverse.SP500]: SP500_SYMBOLS,
    [AssetUniverse.EU50]: EU_TOP_50_SYMBOLS,
    [AssetUniverse.FTSE100]: UK_TOP_100_SYMBOLS,
    [AssetUniverse.Asian50]: ASIAN_TOP_50_SYMBOLS,
    [AssetUniverse.Bonds]: TOP_BONDS_SYMBOLS,
    [AssetUniverse.Indices]: TOP_INDICES_SYMBOLS,
    [AssetUniverse.Forex]: TOP_FOREX_SYMBOLS,
    [AssetUniverse.Commodities]: TOP_COMMODITIES_SYMBOLS,
};

const ASSET_UNIVERSE_ASSET_CLASS_MAP: { [key in AssetUniverse]: AssetClass } = {
    [AssetUniverse.SP500]: AssetClass.USStocks,
    [AssetUniverse.EU50]: AssetClass.EUStocks,
    [AssetUniverse.FTSE100]: AssetClass.UKStocks,
    [AssetUniverse.Asian50]: AssetClass.AsianStocks,
    [AssetUniverse.Bonds]: AssetClass.Bonds,
    [AssetUniverse.Indices]: AssetClass.Indices,
    [AssetUniverse.Forex]: AssetClass.Forex,
    [AssetUniverse.Commodities]: AssetClass.Commodities,
};

// Create a reverse lookup map for getting an asset class from a symbol
// This is useful for simulations and internal logic.
export const SYMBOL_TO_ASSET_CLASS_MAP = new Map<string, AssetClass>();
for (const universe in ASSET_UNIVERSE_TICKER_MAP) {
    const assetClass = ASSET_UNIVERSE_ASSET_CLASS_MAP[universe as AssetUniverse];
    const symbols = ASSET_UNIVERSE_TICKER_MAP[universe as AssetUniverse];
    symbols.forEach(symbol => {
        SYMBOL_TO_ASSET_CLASS_MAP.set(symbol, assetClass);
    });
}
// Manually add crypto
SYMBOL_TO_ASSET_CLASS_MAP.set('BTC/USD', AssetClass.Crypto);
SYMBOL_TO_ASSET_CLASS_MAP.set('ETH/USD', AssetClass.Crypto);
SYMBOL_TO_ASSET_CLASS_MAP.set('SOL/USD', AssetClass.Crypto);


export const ASSET_LEVERAGE_MAP: { [key in AssetClass]: number } = {
    [AssetClass.USStocks]: 5,
    [AssetClass.GlobalStocks]: 5,
    [AssetClass.UKStocks]: 5,
    [AssetClass.EUStocks]: 5,
    [AssetClass.AsianStocks]: 5,
    [AssetClass.Crypto]: 10,
    [AssetClass.Commodities]: 20,
    [AssetClass.Forex]: 30,
    [AssetClass.Bonds]: 30,
    [AssetClass.Indices]: 20,
};

// Constants for Market Screener filters
export const SECTORS: ScreenerResult['sector'][] = ['Technology', 'Healthcare', 'Financials', 'Consumer Discretionary', 'Industrials', 'Energy', 'Crypto'];
export const COUNTRIES: ScreenerResult['country'][] = ['USA', 'Europe', 'Asia', 'Global'];

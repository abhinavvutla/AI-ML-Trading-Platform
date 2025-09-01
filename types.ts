export interface Trade {
  id: string;
  symbol: string;
  pnl: number;
  pnlPercentage: number;
  positionSize: number;
  value: number;
  leverage: number;
  holdingTime: string;
  rr: number;
  entryPrice: number;
  exitPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  type: 'WIN' | 'LOSS';
  assetClass: string;
  commission: number;
  slippage: number;
  exitReason: 'TP' | 'SL' | 'EOD'; // Take Profit, Stop Loss, End of Day
}

export interface PortfolioMetric {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative';
}

export interface PerformanceDataPoint {
  date: string;
  strategy: number;
  sp500: number;
  drawdown?: number;
}

export interface Allocation {
  name: string;
  value: number;
  fill: string;
  subAllocations?: Allocation[];
}

export enum StrategyModel {
  LSTM = 'LSTM',
  LLM = 'LLM',
  LinearRegression = 'Linear Regression',
  SVM = 'SVM',
  RandomForest = 'Random Forest',
  MonteCarlo = 'Monte Carlo Simulation',
  MeanReversion = 'Mean Reversion Arbitrage',
  SentimentAnalysis = 'Sentiment Analysis',
  BollingerBands = 'Bollinger Bands',
  RSI = 'RSI',
  MACD = 'MACD',
  IchimokuCloud = 'Ichimoku Cloud'
}

export enum AssetClass {
    USStocks = "US Stocks",
    GlobalStocks = "Global Stocks",
    UKStocks = "UK Stocks",
    EUStocks = "EU Stocks",
    AsianStocks = "Asian Stocks",
    Crypto = "Crypto",
    Commodities = "Commodities",
    Forex = "Forex",
    Bonds = "Bonds",
    Indices = "Indices",
}

export enum AssetUniverse {
    SP500 = "S&P 500",
    EU50 = "EU50",
    FTSE100 = "FTSE100",
    Asian50 = "Asian50",
    Bonds = "Bonds",
    Indices = "Indices",
    Forex = "Forex",
    Commodities = "Commodities",
}

// --- New Enums for Strategy Customization ---
export enum StrategyObjective {
    TrendFollowing = 'Trend Following',
    MeanReversion = 'Mean Reversion',
    VolatilityBreakout = 'Volatility Breakout',
}

export enum Indicator {
    RSI = 'RSI',
    MACD = 'MACD',
    BollingerBands = 'Bollinger Bands',
    ATR = 'ATR',
    Stochastic = 'Stochastic',
    ADX = 'ADX',
    OBV = 'On-Balance Volume',
    SMA50 = '50-Day SMA',
    SMA200 = '200-Day SMA',
}


export type FitStatus = 'Good Fit' | 'Potential Overfitting' | 'Potential Underfitting';

export interface SavedStrategy {
  id: string;
  name: string;
  models: StrategyModel[];
  assetUniverses: AssetUniverse[];
  customSymbols: string[];
  trainingPeriodYears: number;
  leverage: { min: number, max: number };
  stopLossPercentage: number;
  trainingStatus: 'Trained' | 'Untrained';
  optimizations: string[];
  sharpeRatio: number;
  validationAccuracy: number;
  fitStatus: FitStatus;
  // --- New fields for ML customization ---
  indicators: Indicator[];
  strategyObjective: StrategyObjective;
}

export interface StrategyDoc {
    model: StrategyModel;
    overview: {
        description: string;
        rrProfile: string;
        maxLeverage: string;
        assetClasses: string;
        markets: string;
        parameters: { name: string; description:string }[];
    };
    codeSnippet: string;
    optimizationTips: string[];
    performanceMetrics: { name: string; description: string }[];
}

export interface ScreenerResult {
  ticker: string;
  companyName: string;
  sector: 'Technology' | 'Healthcare' | 'Financials' | 'Consumer Discretionary' | 'Industrials' | 'Energy' | 'Crypto' | string;
  marketCap: number; // in billions
  price: number;
  change1D: number; // percentage
  volume: number; // in millions
  country: 'USA' | 'Europe' | 'Asia' | 'Global' | string;
}

// --- Types for Revamped Market Overview ---
export interface MarketMover {
    ticker: string;
    companyName: string;
    price: number;
    changePercent: number;
    change: number;
}

export interface ChartDataPoint {
    date: string; // "YYYY-MM-DD"
    value: number;
}

export interface ChartableAsset {
    name: string;
    value: number;
    change: number;
    changePercent: number;
    historicalData: ChartDataPoint[];
}

export interface EnhancedMarketOverviewData {
    charts: {
        sp500: ChartableAsset;
        gold: ChartableAsset;
        eurUsd: ChartableAsset;
        bitcoin: ChartableAsset;
        bondTlt: ChartableAsset;
    };
    movers: {
        gainers: MarketMover[];
        losers: MarketMover[];
    };
}


// --- New type for News Page ---
export type NewsCategory = 'All' | 'Market' | 'Crypto' | 'Economics' | 'Portfolio';

export interface NewsArticle {
  id: string;
  source: string;
  date: string;
  headline: string;
  summary: string;
  category: Omit<NewsCategory, 'All' | 'Portfolio'> | string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  ticker?: string;
  url: string;
}


// --- Real Alpaca API Types ---

export interface AlpacaAccount {
    id: string;
    account_number: string;
    status: string;
    crypto_status?: string;
    currency: string;
    buying_power: string;
    regt_buying_power: string;
    daytrading_buying_power: string;
    non_marginable_buying_power: string;
    cash: string;
    portfolio_value: string;
    equity: string;
    last_equity: string;
    long_market_value: string;
    short_market_value: string;
    initial_margin: string;
    maintenance_margin: string;
    last_maintenance_margin: string;
    sma: string;
    daytrade_count: number;
    created_at: string;
}

export interface AlpacaPosition {
    asset_id: string;
    symbol: string;
    exchange: string;
    asset_class: string;
    avg_entry_price: string;
    qty: string;
    side: string;
    market_value: string;
    cost_basis: string;
    unrealized_pl: string;
    unrealized_plpc: string;
    unrealized_intraday_pl: string;
    unrealized_intraday_plpc: string;
    current_price: string;
    lastday_price: string;
    change_today: string;
}

export interface AlpacaOrder {
    id: string;
    client_order_id: string;
    created_at: string;
    updated_at: string;
    submitted_at: string;
    filled_at: string | null;
    expired_at: string | null;
    canceled_at: string | null;
    failed_at: string | null;
    replaced_at: string | null;
    asset_id: string;
    symbol: string;
    asset_class: string;
    qty: string | null;
    notional: string | null;
    filled_qty: string;
    filled_avg_price: string | null;
    order_class: string;
    order_type: string;
    type: string;
    side: string;
    time_in_force: string;
    limit_price: string | null;
    stop_price: string | null;
    status: 'new' | 'partially_filled' | 'filled' | 'done_for_day' | 'canceled' | 'expired' | 'replaced' | 'pending_cancel' | 'pending_replace';
    extended_hours: boolean;
    legs: AlpacaOrder[] | null;
    trail_percent: string | null;
    trail_price: string | null;
    hwm: string | null;
}

export interface AlpacaBar {
  t: string; // Timestamp
  o: number; // Open
  h: number; // High
  l: number; // Low
  c: number; // Close
  v: number; // Volume
}

export interface AlpacaCryptoBar extends AlpacaBar {
    n: number; // Trade count
    vw: number; // VWAP
}

export interface AlpacaForexBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
}


export interface AlpacaSnapshot {
    symbol: string;
    latestQuote: {
        p: number; // price
    };
    dailyBar: {
        v: number; // volume
    };
    prevDailyBar: {
        c: number; // previous close
    };
    change: number;
    changePercent: number;
}

export interface AlpacaNewsArticle {
    id: number;
    headline: string;
    summary: string;
    author: string;
    created_at: string;
    updated_at: string;
    source: string;
    url: string;
    content: string;
    symbols: string[];
}

// --- Backend Service Types ---

export interface BackendResponse<T> {
  success: boolean;
  data: T | null;
  error?: {
    type: 'API_ERROR' | 'CORS_ERROR' | 'UNKNOWN_ERROR';
    message: string;
  };
}


export interface Suggestion {
    action: 'BUY' | 'SELL' | 'HOLD';
    symbol: string;
    percentage: number;
    reason: string;
}

export interface SentimentData {
    symbol: string;
    bullish: number;
    bearish: number;
    score: number;
}

export interface SentimentResult {
    stocks: SentimentData[];
    crypto: SentimentData[];
}


// --- Backtesting result types ---
export interface BacktestSummary {
    trades: number;
    wins: number;
    losses: number;
    winRate: string;
    avgWin: number;
    avgLoss: number;
    avgRR: number;
    avgPositionSize: number;
    avgLeverage: number;
}

export interface BacktestResults {
    metrics: PortfolioMetric[];
    performanceData: PerformanceDataPoint[];
    pnlDistribution: { name: string; count: number; bucket: number }[];
    allTrades: Trade[];
    allocationData: Allocation[];
    summary: BacktestSummary;
    stopLossFeedback: string;
    config: {
        startDate: string;
        endDate: string;
        initialCapital: number;
        commission: number;
        slippage: number;
    };
}

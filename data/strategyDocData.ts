
import { StrategyDoc, StrategyModel } from '../types';

export const STRATEGY_DOCS_DATA: StrategyDoc[] = [
    {
        model: StrategyModel.LSTM,
        overview: {
            description: "Long Short-Term Memory networks are a type of recurrent neural network (RNN) capable of learning long-term dependencies. They are exceptionally good at remembering patterns over long periods, making them ideal for time-series forecasting.",
            rrProfile: "Medium to High. Can capture complex trends, but may overfit without proper validation. Stop-losses are crucial.",
            maxLeverage: "Low (2-5x). Due to the predictive nature, trades should be sized conservatively until the model proves its edge.",
            assetClasses: "Stocks, Crypto, Forex, Indices (any asset with sufficient historical data).",
            markets: "All markets, but performs best in markets with consistent long-term trends.",
            parameters: [
                { name: "Lookback Period", description: "Number of past time steps (e.g., days) used to predict the next step." },
                { name: "Epochs", description: "Number of times the entire training dataset is passed through the network." },
                { name: "Batch Size", description: "Number of training examples utilized in one iteration." },
                { name: "Neurons/Layers", description: "The architecture of the network, defining its complexity." },
            ]
        },
        codeSnippet: `import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout

# Assume 'data' is a scaled numpy array of historical prices
lookback = 60
X_train, y_train = [], []
for i in range(lookback, len(data)):
    X_train.append(data[i-lookback:i, 0])
    y_train.append(data[i, 0])
X_train, y_train = np.array(X_train), np.array(y_train)
X_train = np.reshape(X_train, (X_train.shape[0], X_train.shape[1], 1))

model = Sequential([
    LSTM(units=50, return_sequences=True, input_shape=(X_train.shape[1], 1)),
    Dropout(0.2),
    LSTM(units=50, return_sequences=False),
    Dropout(0.2),
    Dense(units=1)
])
model.compile(optimizer='adam', loss='mean_squared_error')
model.fit(X_train, y_train, epochs=25, batch_size=32)

# Prediction
# predicted_price = model.predict(last_60_days_scaled)
`,
        optimizationTips: [
            "Start with a simple architecture (1-2 LSTM layers) and add complexity gradually to avoid overfitting.",
            "Use dropout layers (e.g., 20-50%) to prevent the model from becoming too specialized to the training data.",
            "Incorporate multiple features beyond price, such as volume, volatility indices (VIX), or other technical indicators, to give the model more context.",
            "Normalize or scale your input data (e.g., between 0 and 1) for faster and more stable training."
        ],
        performanceMetrics: [
            { name: "Mean Squared Error (MSE)", description: "Measures the average squared difference between the estimated values and the actual value. Lower is better." },
            { name: "Root Mean Squared Error (RMSE)", description: "The square root of MSE, providing an error metric in the same units as the target variable (price)." },
            { name: "Validation Loss", description: "The loss calculated on a separate validation dataset. If it starts increasing while training loss decreases, the model is overfitting." },
        ]
    },
    {
        model: StrategyModel.RSI,
        overview: {
            description: "The Relative Strength Index is a momentum oscillator that measures the speed and change of price movements. It oscillates between 0 and 100, traditionally considered overbought above 70 and oversold below 30.",
            rrProfile: "Low to Medium. Generates frequent signals, best used for mean-reversion or with trend-confirming indicators. Win rate can be low without filters.",
            maxLeverage: "High (10-20x). Often used for short-term scalping where high leverage is common, but requires tight risk management.",
            assetClasses: "Forex, Stocks, Crypto. Most effective in assets that tend to mean-revert rather than trend strongly.",
            markets: "All markets, particularly active during range-bound periods.",
            parameters: [
                { name: "Period", description: "The lookback period for calculating RSI. The standard is 14, but shorter periods (e.g., 7) are more sensitive, while longer periods (e.g., 21) are smoother." },
                { name: "Overbought Level", description: "The threshold above which an asset is considered overbought. Standard is 70." },
                { name: "Oversold Level", description: "The threshold below which an asset is considered oversold. Standard is 30." },
            ]
        },
        codeSnippet: `import pandas as pd
import pandas_ta as ta

# Assume 'df' is a pandas DataFrame with a 'close' column
df.ta.rsi(length=14, append=True)

# Strategy Logic
overbought_level = 70
oversold_level = 30
df['signal'] = 0
# Sell signal: RSI crosses below overbought level
df.loc[(df['RSI_14'].shift(1) > overbought_level) & (df['RSI_14'] <= overbought_level), 'signal'] = -1
# Buy signal: RSI crosses above oversold level
df.loc[(df['RSI_14'].shift(1) < oversold_level) & (df['RSI_14'] >= oversold_level), 'signal'] = 1

# Execute trades based on 'signal' column
`,
        optimizationTips: [
            "Combine RSI with a trend indicator, like a 200-period moving average. Only take buy signals when the price is above the MA, and sell signals when below.",
            "Look for 'divergences'. A bullish divergence occurs when price makes a lower low but RSI makes a higher low, suggesting momentum is shifting upwards.",
            "Adjust the overbought/oversold levels based on the asset. For strong trending assets, levels like 80/20 might be more appropriate to avoid premature exits.",
            "Instead of buying at 30, wait for the RSI to cross back above 30 to confirm a potential reversal before entering."
        ],
        performanceMetrics: [
            { name: "Win Rate", description: "The percentage of trades that are profitable. Crucial for mean-reversion strategies." },
            { name: "Profit Factor", description: "Gross profits divided by gross losses. A value greater than 1 indicates a profitable system." },
            { name: "Signal Accuracy", description: "Measures how often the price moves in the predicted direction after a signal is generated within a defined period." },
        ]
    },
        {
        model: StrategyModel.MACD,
        overview: {
            description: "The Moving Average Convergence Divergence is a trend-following momentum indicator that shows the relationship between two moving averages of a security’s price. The MACD line crossing above the signal line is a bullish signal, and vice versa.",
            rrProfile: "Medium. Aims to capture the bulk of a trend, leading to potentially large wins but can give false signals in choppy, non-trending markets.",
            maxLeverage: "Medium (5-10x). Best used for swing trading, where positions are held for several days or weeks.",
            assetClasses: "Stocks, Indices, Commodities. Works best on assets that exhibit clear trending behavior.",
            markets: "All, but particularly effective in trending markets (bull or bear).",
            parameters: [
                { name: "Fast Period", description: "The lookback for the faster-moving average. Standard is 12." },
                { name: "Slow Period", description: "The lookback for the slower-moving average. Standard is 26." },
                { name: "Signal Period", description: "The lookback for the moving average of the MACD line itself. Standard is 9." },
            ]
        },
        codeSnippet: `import pandas as pd
import pandas_ta as ta

# Assume 'df' is a pandas DataFrame with a 'close' column
df.ta.macd(fast=12, slow=26, signal=9, append=True)

# Strategy Logic (Crossover)
# MACD crosses above Signal Line -> Buy
df.loc[(df['MACD_12_26_9'].shift(1) < df['MACDs_12_26_9'].shift(1)) & (df['MACD_12_26_9'] > df['MACDs_12_26_9']), 'signal'] = 1
# MACD crosses below Signal Line -> Sell
df.loc[(df['MACD_12_26_9'].shift(1) > df['MACDs_12_26_9'].shift(1)) & (df['MACD_12_26_9'] < df['MACDs_12_26_9']), 'signal'] = -1

# Another common strategy is to trade the zero-line crossover
# Buy when MACD crosses above 0, Sell when it crosses below 0
`,
        optimizationTips: [
            "Use the MACD histogram (the difference between the MACD and signal lines) to gauge momentum. When the histogram stops falling and ticks up from below the zero line, it can be an early buy signal.",
            "Confirm MACD signals with price action. For example, after a bullish crossover, wait for the price to break above a recent swing high before entering.",
            "Adjust periods for different timeframes. For weekly charts, longer periods might be more reliable. For intraday charts, shorter periods are common.",
            "Like RSI, watch for divergences between the MACD and price to spot potential trend reversals."
        ],
        performanceMetrics: [
            { name: "Average Win / Average Loss", description: "For trend-following, you want this ratio to be high (e.g., > 2), as you expect a few large wins to cover many small losses." },
            { name: "Sharpe Ratio", description: "Measures risk-adjusted return, which is important for momentum strategies that can have significant drawdowns." },
            { name: "Max Drawdown", description: "The largest peak-to-trough decline. Crucial to measure for trend-following systems to ensure you can stomach the losing streaks." },
        ]
    },
    // Add other models here in the same detailed format...
];

// Add stubs for other models to avoid breaking the UI
const otherModels: StrategyModel[] = [
    StrategyModel.LLM,
    StrategyModel.LinearRegression,
    StrategyModel.SVM,
    StrategyModel.RandomForest,
    StrategyModel.MonteCarlo,
    StrategyModel.MeanReversion,
    StrategyModel.SentimentAnalysis,
    StrategyModel.BollingerBands,
    StrategyModel.IchimokuCloud,
];

otherModels.forEach(model => {
    if (!STRATEGY_DOCS_DATA.find(d => d.model === model)) {
        STRATEGY_DOCS_DATA.push({
            model: model,
            overview: {
                description: `Documentation for ${model} is in progress. This model is used for various quantitative strategies.`,
                rrProfile: "Varies by implementation.",
                maxLeverage: "Varies by implementation.",
                assetClasses: "All",
                markets: "All",
                parameters: [{ name: "N/A", description: "Parameters depend on the specific strategy setup." }]
            },
            codeSnippet: `# Code example for ${model} coming soon.\n\nprint("Hello, ${model}!")`,
            optimizationTips: ["Detailed optimization tips are being developed for this model."],
            performanceMetrics: [{ name: "N/A", description: "Key performance metrics are being curated for this model." }]
        });
    }
});

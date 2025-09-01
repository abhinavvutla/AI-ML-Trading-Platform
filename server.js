
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import yahoo from 'yahoo-finance2';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS Configuration ---
// Whitelist the domains that are allowed to make requests to this server.
const allowedOrigins = [
    'http://localhost:3001', // for local development
    'https://av-algo-trading-platform-737622179332.us-west1.run.app' // your deployed app
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
};

app.use(cors(corsOptions));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Gemini AI Setup ---
const ai = process.env.API_KEY ? new GoogleGenAI({apiKey: process.env.API_KEY}) : null;
const geminiModel = 'gemini-2.5-flash';

// --- In-memory stores ---
const trainingJobs = {}; // Store for ML training simulations

// --- Alpaca Proxy ---
const alpacaProxyHandler = async (req, res) => {
    const { APCA_API_KEY_ID, APCA_API_SECRET_KEY } = process.env;

    if (!APCA_API_KEY_ID || !APCA_API_SECRET_KEY) {
        return res.status(500).json({ message: 'Alpaca API keys are not configured on the server .env file.' });
    }
    const isDataEndpoint = req.headers['x-is-data-endpoint'] === 'true';
    const baseUrl = isDataEndpoint ? 'https://data.alpaca.markets' : 'https://paper-api.alpaca.markets';
    const url = `${baseUrl}${req.originalUrl.replace('/proxy', '')}`;

    try {
        const response = await axios({
            method: req.method,
            url: url,
            headers: {
                'APCA-API-KEY-ID': APCA_API_KEY_ID,
                'APCA-API-SECRET-KEY': APCA_API_SECRET_KEY,
                'Content-Type': 'application/json',
            },
            data: req.body,
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { message: 'Proxy request failed.' };
        res.status(status).json(data);
    }
};

app.use('/proxy', alpacaProxyHandler);


const withAiCheck = (handler) => (req, res) => {
    if (!ai) return res.status(503).json({ message: 'Google AI API key not configured on the server .env file.' });
    return handler(req, res);
};

// --- API Router for Internal Logic (formerly Python server) ---
const apiRouter = express.Router();

// --- Health Check Router ---
const healthRouter = express.Router();

healthRouter.get('/ping', (req, res) => {
    res.json({ success: true, message: 'pong' });
});

healthRouter.get('/env-status', (req, res) => {
    res.json({
        success: true,
        data: {
            alpacaKey: !!process.env.APCA_API_KEY_ID,
            alpacaSecret: !!process.env.APCA_API_SECRET_KEY,
            googleAiKey: !!process.env.API_KEY,
        }
    });
});

healthRouter.get('/gemini-status', withAiCheck(async (req, res) => {
    try {
        await ai.models.generateContent({
            model: geminiModel,
            contents: 'hello',
        });
        res.json({ success: true, message: 'Google AI API key is valid.' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
}));
apiRouter.use('/health', healthRouter);


apiRouter.post('/train-strategy', (req, res) => {
    const jobId = uuidv4();
    const job = {
        status: 'pending',
        submittedAt: new Date().toISOString(),
        results: null,
        error: null,
        config: req.body,
    };
    trainingJobs[jobId] = job;

    setTimeout(() => {
        const currentJob = trainingJobs[jobId];
        const { stopLossPercentage, trainingPeriodYears } = req.body;
        const sharpe = Math.random() * 1.5 + 0.5;
        const accuracy = Math.random() * 0.25 + 0.60;
        const fitStatuses = ['Good Fit', 'Potential Overfitting', 'Potential Underfitting'];
        const fitStatus = fitStatuses[Math.floor(Math.random() * fitStatuses.length)];
        
        currentJob.status = 'completed';
        currentJob.results = {
            sharpeRatio: sharpe,
            validationAccuracy: accuracy,
            fitStatus: fitStatus,
            stopLossFeedback: `A ${stopLossPercentage}% stop loss is a reasonable starting point. Based on simulated volatility, a value between ${(stopLossPercentage * 0.8).toFixed(1)}% and ${(stopLossPercentage * 1.5).toFixed(1)}% may yield better risk-adjusted returns.`,
            optimizations: [
                'Consider using ensemble weighting for your top models to improve signal diversification.',
                `A ${trainingPeriodYears + (Math.random() > 0.5 ? 1 : -1)}-year training period might capture market cycles more effectively.`,
                'Try adding Volume-based indicators like On-Balance Volume (OBV) to confirm price momentum before entry.'
            ]
        };
    }, 8000);

    res.json({ jobId });
});

apiRouter.get('/training-status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = trainingJobs[jobId];
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
});

apiRouter.post('/yfinance/historical', async (req, res) => {
    const { symbols, startDate, endDate, timeframe } = req.body;
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({ message: "Symbols array is required." });
    }
    
    // Map Alpaca timeframe to yahoo-finance2 interval
    const timeframeMap = {
        '5Min': '5m',
        '15Min': '15m',
        '1Hour': '60m',
        '1Day': '1d'
    };
    const interval = timeframeMap[timeframe] || '1d';


    try {
        const queryOptions = {
            period1: startDate,
            period2: endDate,
            interval: interval,
        };
        const result = await yahoo.historical(symbols, queryOptions);

        const formattedData = {};
        for (const symbol of symbols) {
            const symbolData = result[symbol];
            // Check for valid data (is an array and not an error object from yahoo-finance2)
            if (Array.isArray(symbolData)) {
                formattedData[symbol] = symbolData.map(bar => ({
                    t: bar.date.toISOString(),
                    o: bar.open,
                    h: bar.high,
                    l: bar.low,
                    c: bar.close,
                    v: bar.volume
                }));
            } else {
                console.warn(`Could not fetch data for symbol: ${symbol} from Yahoo Finance. It may be delisted or invalid.`);
                // Return empty array for symbols that failed, to prevent frontend errors
                formattedData[symbol] = []; 
            }
        }
        
        res.json(formattedData);

    } catch (error) {
        console.error("Yahoo Finance API Error:", error.message);
        // If the entire API call fails, return empty arrays for all requested symbols
        const emptyData = {};
        symbols.forEach(s => { emptyData[s] = [] });
        res.status(500).json(emptyData);
    }
});

apiRouter.post('/gemini/enrich-news', withAiCheck(async (req, res) => {
    try {
        const { articles } = req.body;
        const headlines = articles.map(a => `${a.id}|${a.headline}`).join('\n');
        
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: `For each news headline below, provide a sentiment (Bullish, Bearish, or Neutral) and a category (Market, Crypto, or Economics). Here are the headlines:\n${headlines}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            sentiment: { type: Type.STRING },
                            category: { type: Type.STRING },
                        }
                    }
                }
            }
        });
        
        const enrichedData = JSON.parse(response.text);
        const enrichedMap = new Map(enrichedData.map(item => [String(item.id), item]));

        const resultArticles = articles.map(article => {
            const enrichment = enrichedMap.get(String(article.id));
            return {
                ...article,
                id: String(article.id),
                date: article.created_at,
                ticker: article.symbols?.[0],
                sentiment: enrichment?.sentiment || 'Neutral',
                category: enrichment?.category || 'Market',
            };
        });
        res.json(resultArticles);
    } catch(e) {
        res.status(500).json({ message: e.message });
    }
}));

apiRouter.get('/gemini/screener-data', withAiCheck(async (req, res) => {
     try {
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: "Generate a list of 25 diverse and well-known public companies from various sectors (e.g., Technology, Healthcare, Financials, etc.) and countries (USA, Europe, Asia).",
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            ticker: { type: Type.STRING },
                            companyName: { type: Type.STRING },
                            sector: { type: Type.STRING },
                            marketCap: { type: Type.NUMBER, description: "Market cap in billions of USD" },
                            country: { type: Type.STRING },
                        }
                    }
                }
            }
        });
        res.json(JSON.parse(response.text));
    } catch(e) {
        res.status(500).json({ message: e.message });
    }
}));

apiRouter.post('/gemini/strategy-from-conversation', withAiCheck(async (req, res) => {
    try {
        const { chatHistory } = req.body;
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: { role: 'user', parts: [{text: `You are an AI assistant for building trading strategies. Based on the following conversation, extract key parameters for a trading strategy and provide a conversational response. The user said: "${chatHistory[chatHistory.length - 1].parts[0].text}"`}] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        conversationalResponse: { type: Type.STRING, description: "A friendly, conversational reply to the user's last message." },
                        strategyName: { type: Type.STRING },
                        models: { type: Type.ARRAY, items: { type: Type.STRING } },
                        assetUniverses: { type: Type.ARRAY, items: { type: Type.STRING } },
                        customSymbols: { type: Type.STRING },
                        trainingPeriodYears: { type: Type.INTEGER },
                        stopLossPercentage: { type: Type.NUMBER },
                    }
                }
            }
        });
        res.json(JSON.parse(response.text));
    } catch(e) {
        res.status(500).json({ message: e.message });
    }
}));

apiRouter.post('/gemini/strategy-optimizations', withAiCheck(async (req, res) => {
    try {
        const { models, trainingPeriod, stopLossPercentage } = req.body;
        
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: `Analyze the following trading strategy parameters and provide optimization suggestions and feedback on the stop loss.
            Models: ${models.join(', ')}
            Training Period: ${trainingPeriod} years
            Stop Loss: ${stopLossPercentage}%`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "Provide 2-3 concise, actionable suggestions to improve the strategy."
                        },
                        stopLossFeedback: { 
                            type: Type.STRING,
                            description: "Provide specific feedback on the given stop loss percentage, considering the models used."
                        },
                    }
                }
            }
        });
        
        res.json(JSON.parse(response.text));
    } catch(e) {
        console.error("Error in /gemini/strategy-optimizations:", e);
        res.status(500).json({ message: e.message });
    }
}));


app.use('/api', apiRouter);


// --- Static File Serving for React App ---
const staticDir = __dirname;
app.use(express.static(staticDir));
app.get('*', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Node.js server running on http://localhost:${PORT}`);
    if (!process.env.APCA_API_KEY_ID || !process.env.APCA_API_SECRET_KEY) {
        console.warn('Warning: Alpaca API keys are missing from .env file. Alpaca proxy will not work.');
    }
    if (!ai) {
        console.warn('Warning: Google AI API key is missing from .env file. AI features will be disabled.');
    }
});
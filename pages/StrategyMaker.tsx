
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { StrategyModel, SavedStrategy, FitStatus, AssetClass, AssetUniverse, Indicator, StrategyObjective } from '../types';
import { STRATEGY_MODELS, ASSET_UNIVERSES, ASSET_UNIVERSE_TICKER_MAP, SYMBOL_TO_ASSET_CLASS_MAP, INDICATORS, STRATEGY_OBJECTIVES } from '../constants';
import { getStrategyFromConversation } from '../services/geminiService';
import { startTrainingJob, getTrainingStatus, TrainingStatusResponse } from '../services/strategyService';
import { BrainCircuit, CheckCircle, Info, Trash2, Wand2, RefreshCw, TrendingUp, Target, ShieldCheck, ShieldAlert, ShieldX, Zap, Edit, Send, Bot, Globe, Lightbulb, Clock, GitCommit, Waves, MoveRight, Sigma, BarChart, GitBranch, Crosshair } from 'lucide-react';

type TrainingResult = {
    id: string;
    optimizations: string[];
    sharpeRatio: number;
    validationAccuracy: number;
    fitStatus: FitStatus;
    stopLossFeedback: string;
};

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

const IndicatorIcons: { [key in Indicator]: React.ReactNode } = {
    [Indicator.RSI]: <GitCommit className="w-4 h-4" />,
    [Indicator.MACD]: <GitBranch className="w-4 h-4" />,
    [Indicator.BollingerBands]: <Waves className="w-4 h-4" />,
    [Indicator.ATR]: <Sigma className="w-4 h-4" />,
    [Indicator.Stochastic]: <Crosshair className="w-4 h-4" />,
    [Indicator.ADX]: <TrendingUp className="w-4 h-4" />,
    [Indicator.OBV]: <BarChart className="w-4 h-4" />,
    [Indicator.SMA50]: <MoveRight className="w-4 h-4" />,
    [Indicator.SMA200]: <MoveRight className="w-4 h-4" />,
};

const FitStatusIndicator = ({ status }: { status: FitStatus }) => {
    const commonClasses = "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold cursor-help";
    switch (status) {
        case 'Good Fit':
            return (
                <div 
                    className={`${commonClasses} bg-green-900/50 text-positive`}
                    title="The model performs well on both training and validation data, suggesting it has learned the underlying patterns effectively."
                >
                    <ShieldCheck className="w-5 h-5" /> Good Fit
                </div>
            );
        case 'Potential Overfitting':
            return (
                <div 
                    className={`${commonClasses} bg-yellow-900/50 text-yellow-300`}
                    title="Over-specified (Overfitting): The model performs exceptionally well on training data but poorly on new, unseen data. It may have memorized noise instead of learning the signal. Consider simplifying the model or using more data."
                >
                    <ShieldAlert className="w-5 h-5" /> Over-specified (Overfitting)
                </div>
            );
        case 'Potential Underfitting':
            return (
                <div 
                    className={`${commonClasses} bg-orange-900/50 text-orange-300`}
                    title="Under-specified (Underfitting): The model performs poorly on both training and new data. It's likely too simple to capture the underlying trend. Consider using a more complex model or adding more features."
                >
                    <ShieldX className="w-5 h-5" /> Under-specified (Underfitting)
                </div>
            );
    }
}

const getSymbolsForStrategy = (strategy: SavedStrategy): string[] => {
    const universeSymbols = strategy.assetUniverses.flatMap(universe => ASSET_UNIVERSE_TICKER_MAP[universe] || []);
    return [...new Set([...universeSymbols, ...strategy.customSymbols])];
};


const getAssetClassesFromSymbols = (symbols: string[]): AssetClass[] => {
    const classes = new Set<AssetClass>();
    symbols.forEach(symbol => {
        const assetClass = SYMBOL_TO_ASSET_CLASS_MAP.get(symbol);
        if (assetClass) {
            classes.add(assetClass);
        } else { // Fallback for custom symbols not in our map
             if (symbol.includes('/')) classes.add(AssetClass.Forex);
             else classes.add(AssetClass.USStocks);
        }
    });
    return Array.from(classes);
};

const getMarketsFromSymbols = (symbols: string[]): string[] => {
    const markets = new Set<string>();
    symbols.forEach(symbol => {
        if (symbol.includes('.DE') || symbol.includes('.PA') || symbol.includes('.AS')) {
            markets.add('EU');
        } else if (symbol.includes('.L')) {
            markets.add('UK');
        } else if (symbol.includes('.SS')) {
            markets.add('Asia');
        } else if (symbol.includes('/')) {
            markets.add('Global');
        } else {
            markets.add('US');
        }
    });
    if (markets.size === 0) return ['US']; // Default
    return Array.from(markets);
};

const StrategyCard: React.FC<{ strategy: SavedStrategy; index: number; onRetrain: (s: SavedStrategy) => void; onRemove: (id: string) => void; }> = ({ strategy, index, onRetrain, onRemove }) => {
    const trainingEndDate = new Date();
    const trainingStartDate = new Date();
    trainingStartDate.setFullYear(trainingEndDate.getFullYear() - strategy.trainingPeriodYears);
    
    const allSymbols = getSymbolsForStrategy(strategy);
    const description = `AI-trained strategy combining: ${strategy.models.join(', ')}. Trained on ${allSymbols.slice(0, 4).join(', ')}${allSymbols.length > 4 ? ',...' : ''} from ${trainingStartDate.toISOString().split('T')[0]} to ${trainingEndDate.toISOString().split('T')[0]}.`;
    const assetClasses = getAssetClassesFromSymbols(allSymbols);
    const markets = getMarketsFromSymbols(allSymbols);

    return (
        <div className="bg-primary p-4 rounded-lg border border-border-color flex flex-col space-y-4 text-sm text-text-secondary h-full">
            <div className="flex justify-between items-start">
                <h4 className="text-3xl font-bold text-text-primary">{String(index + 1).padStart(2, '0')}</h4>
                <span className="bg-accent text-white px-3 py-1 rounded-full text-xs font-semibold">Trained</span>
            </div>
            <p className="text-text-primary leading-relaxed flex-grow min-h-[6em]">{description}</p>
            <div>
                <h5 className="font-semibold mb-2 text-text-secondary">Asset Classes:</h5>
                <div className="flex flex-wrap gap-2">
                    {assetClasses.length > 0 ? assetClasses.map(ac => <span key={ac} className="bg-secondary px-2 py-1 rounded text-xs text-text-primary border border-border-color">{ac}</span>) : <span className="text-xs text-gray-500">Not specified</span>}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h5 className="font-semibold mb-2 text-text-secondary">Markets:</h5>
                    <div className="flex flex-wrap gap-2">
                         {markets.map(m => <span key={m} className="bg-secondary px-2 py-1 rounded text-xs text-text-primary border border-border-color">{m}</span>)}
                    </div>
                </div>
                <div>
                    <h5 className="font-semibold mb-2 text-text-secondary">Stop Loss:</h5>
                    <p className="text-text-primary">{strategy.stopLossPercentage}%</p>
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-4 mt-auto border-t border-border-color">
                <button onClick={() => onRetrain(strategy)} title="Edit/Retrain Strategy" className="text-accent hover:text-accent-hover p-2 rounded-full bg-secondary hover:bg-gray-700"><Edit className="w-4 h-4"/></button>
                <button onClick={() => onRemove(strategy.id)} title="Delete Strategy" className="text-negative hover:text-red-400 p-2 rounded-full bg-secondary hover:bg-gray-700"><Trash2 className="w-4 h-4"/></button>
            </div>
        </div>
    );
};


const StrategyMaker: React.FC = () => {
    const { savedStrategies, saveStrategy, removeStrategy } = useApp();
    
    const [strategyName, setStrategyName] = useState('');
    const [selectedModels, setSelectedModels] = useState<StrategyModel[]>([]);
    const [selectedUniverses, setSelectedUniverses] = useState<AssetUniverse[]>([]);
    const [customSymbols, setCustomSymbols] = useState('');
    const [trainingPeriodYears, setTrainingPeriodYears] = useState(3);
    const [minLeverage, setMinLeverage] = useState(2);
    const [maxLeverage, setMaxLeverage] = useState(5);
    const [stopLossPercentage, setStopLossPercentage] = useState(2);
    const [editingStrategyId, setEditingStrategyId] = useState<string | null>(null);

    // New state for ML customization
    const [selectedIndicators, setSelectedIndicators] = useState<Indicator[]>([Indicator.RSI, Indicator.MACD, Indicator.SMA50]);
    const [strategyObjective, setStrategyObjective] = useState<StrategyObjective>(StrategyObjective.TrendFollowing);

    const [trainingStatus, setTrainingStatus] = useState<'idle' | 'submitting' | 'polling' | 'completed' | 'error'>('idle');
    const [jobId, setJobId] = useState<string | null>(null);
    const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
    const [trainingError, setTrainingError] = useState<string | null>(null);
    const [appliedMessage, setAppliedMessage] = useState('');
    const [trainingProgress, setTrainingProgress] = useState(0);

    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isCoPilotLoading, setIsCoPilotLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const pollingIntervalRef = useRef<number | null>(null);
    const progressIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    // Cleanup polling on component unmount
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, []);

    const handleCoPilotSubmit = async (e?: React.FormEvent) => {
        if(e) e.preventDefault();
        if (!chatInput.trim() || isCoPilotLoading) return;

        const newUserMessage: ChatMessage = { role: 'user', text: chatInput };
        const newHistory = [...chatHistory, newUserMessage];
        
        setChatHistory(newHistory);
        setChatInput('');
        setIsCoPilotLoading(true);

        const geminiHistory = newHistory.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        const response = await getStrategyFromConversation(geminiHistory);

        if (response.strategyName) setStrategyName(response.strategyName);
        if (response.models) setSelectedModels(response.models);
        if (response.assetUniverses) setSelectedUniverses(response.assetUniverses);
        if (response.customSymbols) setCustomSymbols(response.customSymbols);
        if (response.trainingPeriodYears) setTrainingPeriodYears(response.trainingPeriodYears);
        if (response.minLeverage) setMinLeverage(response.minLeverage);
        if (response.maxLeverage) setMaxLeverage(response.maxLeverage);
        if (response.stopLossPercentage) setStopLossPercentage(response.stopLossPercentage);
        
        const newModelMessage: ChatMessage = { role: 'model', text: response.conversationalResponse };
        setChatHistory(prev => [...prev, newModelMessage]);
        setIsCoPilotLoading(false);
    };

    const handleModelToggle = (model: StrategyModel) => {
        setSelectedModels(prev => prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]);
    };
    
    const handleIndicatorToggle = (indicator: Indicator) => {
        setSelectedIndicators(prev => prev.includes(indicator) ? prev.filter(i => i !== indicator) : [...prev, indicator]);
    };

    const handleUniverseToggle = (universe: AssetUniverse) => {
        setSelectedUniverses(prev => prev.includes(universe) ? prev.filter(u => u !== universe) : [...prev, universe]);
    };

    const stopAllTimers = () => {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
    
    const pollJobStatus = (currentJobId: string) => {
        stopAllTimers();
        setTrainingProgress(0);
        
        progressIntervalRef.current = window.setInterval(() => {
            setTrainingProgress(prev => {
                if (prev >= 95) {
                    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                    return 95;
                }
                return prev + 5;
            });
        }, 400); // Simulates 8 second completion

        pollingIntervalRef.current = window.setInterval(async () => {
            console.log("Polling for job status:", currentJobId);
            const statusRes = await getTrainingStatus(currentJobId);

            if (statusRes.success && statusRes.data) {
                if (statusRes.data.status === 'completed') {
                    stopAllTimers();
                    setTrainingProgress(100);
                    setTrainingStatus('completed');
                    setJobId(null);
                    setTrainingResult({
                        id: editingStrategyId || `strat_${Date.now()}`,
                        ...statusRes.data.results!,
                    });
                } else if (statusRes.data.status === 'failed') {
                    stopAllTimers();
                    setTrainingProgress(0);
                    setTrainingStatus('error');
                    setTrainingError(statusRes.data.error || 'Training job failed on the server.');
                    setJobId(null);
                }
            } else {
                stopAllTimers();
                setTrainingProgress(0);
                setTrainingStatus('error');
                setTrainingError(statusRes.error?.message || 'Failed to get job status.');
                setJobId(null);
            }
        }, 3000);
    };

    const handleTrainStrategy = async () => {
        const universeSymbols = selectedUniverses.flatMap(universe => ASSET_UNIVERSE_TICKER_MAP[universe]);
        const manualSymbols = customSymbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        const symbolsToTrain = [...new Set([...universeSymbols, ...manualSymbols])];

        if (!strategyName || selectedModels.length === 0 || symbolsToTrain.length === 0 || selectedIndicators.length === 0) {
            alert('Please provide a strategy name, select at least one model, one indicator, and an asset universe or custom symbols.');
            return;
        }
        
        setTrainingStatus('submitting');
        setTrainingResult(null);
        setTrainingError(null);
        setTrainingProgress(0);

        const jobRes = await startTrainingJob({
            models: selectedModels,
            symbols: symbolsToTrain,
            trainingPeriodYears,
            stopLossPercentage,
            indicators: selectedIndicators,
            strategyObjective,
        });

        if (jobRes.success && jobRes.data?.jobId) {
            setJobId(jobRes.data.jobId);
            setTrainingStatus('polling');
            pollJobStatus(jobRes.data.jobId);
        } else {
            setTrainingStatus('error');
            setTrainingError(jobRes.error?.message || 'Failed to submit training job.');
        }
    };

    const handleSaveStrategy = () => {
        if (!trainingResult) return;
        
        const newStrategy: SavedStrategy = {
            id: trainingResult.id,
            name: strategyName,
            models: selectedModels,
            assetUniverses: selectedUniverses,
            customSymbols: customSymbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
            trainingPeriodYears,
            leverage: { min: minLeverage, max: maxLeverage },
            stopLossPercentage: stopLossPercentage,
            trainingStatus: 'Trained',
            optimizations: trainingResult.optimizations,
            sharpeRatio: trainingResult.sharpeRatio,
            validationAccuracy: trainingResult.validationAccuracy,
            fitStatus: trainingResult.fitStatus,
            indicators: selectedIndicators,
            strategyObjective: strategyObjective,
        };
        saveStrategy(newStrategy);
        resetForm();
    };

    const handleRetrain = (strategy: SavedStrategy) => {
        setEditingStrategyId(strategy.id);
        setStrategyName(strategy.name);
        setSelectedModels(strategy.models);
        setSelectedUniverses(strategy.assetUniverses);
        setCustomSymbols(strategy.customSymbols.join(', '));
        setTrainingPeriodYears(strategy.trainingPeriodYears);
        setMinLeverage(strategy.leverage.min);
        setMaxLeverage(strategy.leverage.max);
        setStopLossPercentage(strategy.stopLossPercentage);
        setSelectedIndicators(strategy.indicators);
        setStrategyObjective(strategy.strategyObjective);
        setTrainingStatus('idle');
        setTrainingResult(null);
        setChatHistory([]);
    }

    const handleApplySuggestion = (suggestion: string) => {
        let message = '';
        if (suggestion.includes('ensemble weighting')) {
            const requiredModels: StrategyModel[] = [StrategyModel.LSTM, StrategyModel.LinearRegression, StrategyModel.RandomForest];
            setSelectedModels(prev => [...new Set([...prev, ...requiredModels])]);
            message = 'Applied: Added LSTM, Linear Regression, and Random Forest for weighting.';
        } else {
            const periodMatch = suggestion.match(/(\d+)-year training period/);
            if (periodMatch && periodMatch[1]) {
                const years = parseInt(periodMatch[1], 10);
                setTrainingPeriodYears(years);
                message = `Applied: Training period set to ${years} years.`;
            }
        }
        
        if (message) {
            setAppliedMessage(message);
            setTimeout(() => setAppliedMessage(''), 3000);
        }
    };

    const resetForm = () => {
        setStrategyName('');
        setSelectedModels([]);
        setSelectedUniverses([]);
        setCustomSymbols('');
        setTrainingPeriodYears(3);
        setMinLeverage(2);
        setMaxLeverage(5);
        setStopLossPercentage(2);
        setSelectedIndicators([Indicator.RSI, Indicator.MACD, Indicator.SMA50]);
        setStrategyObjective(StrategyObjective.TrendFollowing);
        setTrainingResult(null);
        setEditingStrategyId(null);
        setChatHistory([]);
        setTrainingStatus('idle');
        setJobId(null);
        setTrainingError(null);
        setTrainingProgress(0);
    }
    
    const getTrainingButtonText = () => {
        const actionText = editingStrategyId ? '2. Retrain Strategy' : '2. Train Strategy';
        switch (trainingStatus) {
            case 'idle': return actionText;
            case 'submitting': return 'Submitting Job...';
            case 'polling': return 'Training in Progress...';
            case 'completed': return 'Training Complete!';
            case 'error': return 'Training Failed';
        }
    }
    const isTraining = trainingStatus === 'submitting' || trainingStatus === 'polling';

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Strategy Maker</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-secondary p-6 rounded-lg border border-border-color space-y-6">
                    <h2 className="text-xl font-semibold flex items-center">
                        <BrainCircuit className="w-6 h-6 mr-2 text-accent" /> 
                        {editingStrategyId ? `Editing: ${strategyName}` : '1. Configure Strategy Parameters'}
                    </h2>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Strategy Name</label>
                        <input type="text" value={strategyName} onChange={e => setStrategyName(e.target.value)} placeholder="e.g., Aggressive Growth LLM/LSTM" className="w-full bg-primary border border-border-color rounded-md p-2" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Select Asset Universes</label>
                        <div className="flex flex-wrap gap-2">
                            {ASSET_UNIVERSES.map(universe => (
                                <button
                                    key={universe}
                                    onClick={() => handleUniverseToggle(universe)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedUniverses.includes(universe) ? 'bg-accent text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >{universe}</button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Add Custom Symbols (Optional)</label>
                        <input type="text" value={customSymbols} onChange={e => setCustomSymbols(e.target.value)} placeholder="e.g., AAPL, TSLA, EUR/USD, GLD" className="w-full bg-primary border border-border-color rounded-md p-2" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Combine Models</label>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                            {STRATEGY_MODELS.map(model => (
                                <button key={model} onClick={() => handleModelToggle(model)} className={`text-left p-2 rounded-md text-sm transition-colors ${selectedModels.includes(model) ? 'bg-accent text-white' : 'bg-primary hover:bg-gray-700'}`}>
                                    {model}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Feature Engineering & Indicators</label>
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {INDICATORS.map(indicator => (
                                <button key={indicator} onClick={() => handleIndicatorToggle(indicator)} className={`flex items-center gap-2 p-2 rounded-md text-sm transition-colors ${selectedIndicators.includes(indicator) ? 'bg-accent text-white' : 'bg-primary hover:bg-gray-700'}`}>
                                    {IndicatorIcons[indicator]}
                                    <span>{indicator}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Strategy Objective</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {STRATEGY_OBJECTIVES.map(objective => (
                                <button key={objective} onClick={() => setStrategyObjective(objective)} className={`text-center p-2 rounded-md text-sm transition-colors ${strategyObjective === objective ? 'bg-accent text-white' : 'bg-primary hover:bg-gray-700'}`}>
                                    {objective}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Training Period (years)</label>
                        <input type="number" value={trainingPeriodYears} onChange={e => setTrainingPeriodYears(Number(e.target.value))} className="w-full bg-primary border border-border-color rounded-md p-2" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Stop Loss (%)</label>
                            <input type="number" value={stopLossPercentage} onChange={e => setStopLossPercentage(Number(e.target.value))} className="w-full bg-primary border border-border-color rounded-md p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Max Leverage</label>
                            <input type="number" value={maxLeverage} onChange={e => setMaxLeverage(Number(e.target.value))} className="w-full bg-primary border border-border-color rounded-md p-2" />
                        </div>
                    </div>
                     <p className="text-xs text-center text-gray-400">All trades will be placed with a Risk/Reward ratio of > 2.5x.</p>

                    {appliedMessage && (
                        <div className="text-sm text-positive p-2 bg-green-900/50 rounded-md text-center">{appliedMessage}</div>
                    )}

                    <button
                        onClick={handleTrainStrategy}
                        disabled={isTraining}
                        className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 flex items-center justify-center"
                    >
                        {isTraining ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> : <BrainCircuit className="w-5 h-5 mr-2"/>}
                        {getTrainingButtonText()}
                    </button>
                    {isTraining && (
                        <div className="mt-2 space-y-2">
                            <div className="w-full bg-primary rounded-full h-2.5 border border-border-color">
                                <div className="bg-accent h-2.5 rounded-full" style={{ width: `${trainingProgress}%`, transition: 'width 0.4s linear' }}></div>
                            </div>
                            <p className="text-center text-sm text-accent animate-pulse">
                                Simulating training... Job ID: {jobId?.split('-')[0]}
                            </p>
                        </div>
                    )}
                    {trainingError && <div className="text-sm text-negative text-center mt-2">{trainingError}</div>}
                </div>
                
                <div className="space-y-8">
                    {trainingResult && (
                        <div className="bg-secondary p-6 rounded-lg border border-green-700 animate-fade-in space-y-4">
                            <h3 className="text-lg font-semibold flex items-center text-positive"><CheckCircle className="w-5 h-5 mr-2" />3. Training Complete!</h3>
                            
                            <h4 className="font-semibold text-gray-300">Simulated Performance</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                               <FitStatusIndicator status={trainingResult.fitStatus} />
                               <div className="bg-primary p-2 rounded-lg flex items-center justify-center gap-2 text-sm"><TrendingUp className="w-5 h-5 text-accent" /> Sharpe Ratio: <span className="font-bold">{trainingResult.sharpeRatio.toFixed(2)}</span></div>
                               <div className="bg-primary p-2 rounded-lg flex items-center justify-center gap-2 text-sm"><Target className="w-5 h-5 text-accent" /> Validation Accuracy: <span className="font-bold">{(trainingResult.validationAccuracy * 100).toFixed(1)}%</span></div>
                            </div>
                            
                            <div className="bg-primary border border-border-color p-4 rounded-lg">
                                <h4 className="font-semibold text-accent mb-2 flex items-center gap-2"><Lightbulb /> AI Stop Loss Feedback</h4>
                                <p className="text-sm text-text-secondary">{trainingResult.stopLossFeedback}</p>
                            </div>

                            <h4 className="font-semibold pt-2 text-gray-300">AI-Powered Optimization Suggestions:</h4>
                            <ul className="list-none space-y-2 text-sm text-gray-300">
                                {trainingResult.optimizations.map((opt, i) => (
                                <li key={i} className="flex items-start gap-2 p-2 bg-primary rounded-md">
                                    <span className="mt-1 text-accent">&bull;</span>
                                    <span>{opt}</span>
                                    {(opt.includes("training period") || opt.includes("ensemble weighting")) &&
                                        <button onClick={() => handleApplySuggestion(opt)} className="ml-auto flex-shrink-0 bg-accent/80 hover:bg-accent text-white px-2 py-1 text-xs rounded-md flex items-center gap-1">
                                            <Wand2 className="w-3 h-3"/> Apply
                                        </button>
                                    }
                                </li>
                                ))}
                            </ul>
                            <div className="flex gap-4">
                               <button onClick={handleSaveStrategy} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">4. Save Strategy</button>
                               <button onClick={resetForm} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Discard</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-secondary p-6 rounded-lg border border-border-color">
                        <h2 className="text-xl font-semibold mb-4 flex items-center"><Globe className="w-6 h-6 mr-2 text-accent"/>Strategy Bank</h2>
                        {savedStrategies.length > 0 ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {savedStrategies.map((s, i) => (
                                <StrategyCard
                                    key={s.id}
                                    strategy={s}
                                    index={i}
                                    onRetrain={handleRetrain}
                                    onRemove={removeStrategy}
                                />
                             ))}
                           </div>
                        ) : (
                            <p className="text-center text-gray-400 py-4">No strategies saved yet.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-secondary p-6 rounded-lg border border-border-color space-y-4 mt-8">
                <h2 className="text-xl font-semibold flex items-center mb-2">
                    <Bot className="w-6 h-6 mr-3 text-accent" />
                    AI Strategy Co-Pilot
                </h2>
                <div 
                    ref={chatContainerRef}
                    className="h-48 overflow-y-auto bg-primary p-3 rounded-md border border-border-color space-y-3"
                >
                    {chatHistory.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                             {msg.role === 'model' && <Bot className="w-5 h-5 text-accent flex-shrink-0 mt-1" />}
                            <p className={`p-2 rounded-lg text-sm max-w-[80%] ${msg.role === 'model' ? 'bg-secondary' : 'bg-accent text-white'}`}>
                                {msg.text}
                            </p>
                        </div>
                    ))}
                    {isCoPilotLoading && (
                         <div className="flex items-start gap-2">
                            <Bot className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                            <p className="p-2 rounded-lg text-sm bg-secondary animate-pulse">Thinking...</p>
                        </div>
                    )}
                     {chatHistory.length === 0 && !isCoPilotLoading && (
                        <div className="flex items-center justify-center h-full text-text-secondary">
                            <p>Describe your ideal strategy... e.g., "a safe strategy for retirement with a 5% stop loss"</p>
                        </div>
                     )}
                </div>
                <form onSubmit={handleCoPilotSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Chat with the Co-Pilot to build or refine your strategy..."
                        className="w-full bg-primary border border-border-color rounded-md p-2"
                        disabled={isCoPilotLoading}
                    />
                    <button 
                        type="submit" 
                        className="bg-accent hover:bg-accent-hover text-white p-2 rounded-md disabled:bg-gray-500"
                        disabled={!chatInput.trim() || isCoPilotLoading}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StrategyMaker;

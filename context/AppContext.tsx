import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { SavedStrategy, AlpacaAccount, Trade, FitStatus, Indicator, StrategyObjective } from '../types';

type BrokerStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface AppContextType {
  savedStrategies: SavedStrategy[];
  saveStrategy: (strategy: SavedStrategy) => void;
  removeStrategy: (strategyId: string) => void;
  brokerStatus: BrokerStatus;
  setBrokerStatus: (status: BrokerStatus) => void;
  account: AlpacaAccount | null;
  setAccount: (account: AlpacaAccount | null) => void;
  tradeLog: Trade[];
  addTradeToLog: (trade: Trade) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [savedStrategies, setSavedStrategies] = useState<SavedStrategy[]>(() => {
    try {
      const saved = localStorage.getItem('savedStrategies');
      const strategies: SavedStrategy[] = saved ? JSON.parse(saved) : [];
      // Add default values to old strategies for backward compatibility
      return strategies.map(s => ({
          ...s,
          stopLossPercentage: s.stopLossPercentage || 2.0, // Default to 2% SL
          fitStatus: s.fitStatus || 'Good Fit', // Default fit status
          indicators: s.indicators || [Indicator.RSI, Indicator.MACD], // Default indicators
          strategyObjective: s.strategyObjective || StrategyObjective.TrendFollowing, // Default objective
      }));
    } catch (error) {
      return [];
    }
  });

  const [tradeLog, setTradeLog] = useState<Trade[]>(() => {
    try {
      const saved = localStorage.getItem('tradeLog');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  });

  const [brokerStatus, setBrokerStatus] = useState<BrokerStatus>('disconnected');
  const [account, setAccount] = useState<AlpacaAccount | null>(null);

  const saveStrategy = (strategy: SavedStrategy) => {
    setSavedStrategies(prev => {
        const existingIndex = prev.findIndex(s => s.id === strategy.id);
        if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex] = strategy;
            return updated;
        }
        return [...prev, strategy];
    });
  };

  const removeStrategy = (strategyId: string) => {
    setSavedStrategies(prev => prev.filter(s => s.id !== strategyId));
  };

  const addTradeToLog = (trade: Trade) => {
    setTradeLog(prev => [trade, ...prev]);
  }

  useEffect(() => {
    localStorage.setItem('savedStrategies', JSON.stringify(savedStrategies));
  }, [savedStrategies]);
  
  useEffect(() => {
    localStorage.setItem('tradeLog', JSON.stringify(tradeLog));
  }, [tradeLog]);

  return (
    <AppContext.Provider value={{ savedStrategies, saveStrategy, removeStrategy, brokerStatus, setBrokerStatus, account, setAccount, tradeLog, addTradeToLog }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

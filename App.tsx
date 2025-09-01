
import React from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Home, BarChart2, Cpu, FileText, Bot, Sliders, Settings, Rss, Filter, LayoutGrid, Newspaper, Server } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import Backtesting from './pages/Backtesting';
import StrategyMaker from './pages/StrategyMaker';
import StrategyDocuments from './pages/StrategyDocuments';
import PortfolioOptimisation from './pages/PortfolioOptimisation';
import SentimentAnalysis from './pages/SentimentAnalysis';
import Configuration from './pages/Configuration';
import MarketScreener from './pages/MarketScreener';
import MarketOverview from './pages/MarketOverview';
import News from './pages/News';
import HealthCheck from './pages/HealthCheck';

const navItems = [
  { path: '/', label: 'Live Dashboard', icon: Home },
  { path: '/market-overview', label: 'Market Overview', icon: LayoutGrid },
  { path: '/news', label: 'News', icon: Newspaper },
  { path: '/market-screener', label: 'Market Screener', icon: Filter },
  { path: '/sentiment-analysis', label: 'Sentiment Analysis', icon: Rss },
  { path: '/backtesting', label: 'Backtesting', icon: BarChart2 },
  { path: '/strategy-maker', label: 'Strategy Maker', icon: Cpu },
  { path: '/portfolio-optimisation', label: 'Portfolio Optimisation', icon: Bot },
  { path: '/strategy-documents', label: 'Strategy Docs', icon: FileText },
  { path: '/health-check', label: 'Health Check', icon: Server },
  { path: '/configuration', label: 'Configuration', icon: Settings },
];

const SideNav = () => {
  return (
    <nav className="w-64 h-screen bg-secondary p-4 flex flex-col fixed top-0 left-0 border-r border-border-color">
      <div className="flex items-center mb-10">
        <Sliders className="w-8 h-8 text-accent" />
        <h1 className="text-lg font-bold ml-2">AI Algo Trading Platform - AV</h1>
      </div>
      <ul>
        {navItems.map((item) => (
          <li key={item.path} className="mb-2">
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center p-2 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'hover:bg-gray-700'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};


const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="flex">
        <SideNav />
        <main className="flex-1 ml-64 p-8 bg-primary min-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/market-overview" element={<MarketOverview />} />
            <Route path="/news" element={<News />} />
            <Route path="/backtesting" element={<Backtesting />} />
            <Route path="/strategy-maker" element={<StrategyMaker />} />
            <Route path="/market-screener" element={<MarketScreener />} />
            <Route path="/strategy-documents" element={<StrategyDocuments />} />
            <Route path="/portfolio-optimisation" element={<PortfolioOptimisation />} />
            <Route path="/sentiment-analysis" element={<SentimentAnalysis />} />
            <Route path="/health-check" element={<HealthCheck />} />
            <Route path="/configuration" element={<Configuration />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
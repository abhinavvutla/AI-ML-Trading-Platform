import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { fetchNews } from '../services/marketDataService';
import { enrichNewsArticles } from '../services/geminiService';
import { NewsArticle, NewsCategory } from '../types';
import { Newspaper, Flame, Bitcoin, BarChartHorizontal, User, AlertTriangle, Info, ExternalLink } from 'lucide-react';

const getSentimentClasses = (sentiment: NewsArticle['sentiment']) => {
    switch (sentiment) {
        case 'Bullish': return 'border-positive/50 bg-positive/10 text-positive';
        case 'Bearish': return 'border-negative/50 bg-negative/10 text-negative';
        case 'Neutral': return 'border-yellow-400/50 bg-yellow-400/10 text-yellow-300';
        default: return 'border-gray-500/50 bg-gray-500/10 text-gray-300';
    }
};

const NewsCard: React.FC<{ article: NewsArticle }> = ({ article }) => {
    const sentimentClasses = getSentimentClasses(article.sentiment);
    const timeAgo = new Intl.RelativeTimeFormat('en', { style: 'short' });
    
    let hoursAgo = 0;
    try {
        const articleDate = new Date(article.date);
        if(!isNaN(articleDate.getTime())) {
            hoursAgo = Math.round((new Date().getTime() - articleDate.getTime()) / (1000 * 60 * 60));
        }
    } catch(e) {
        console.error("Invalid date format for article:", article.id);
    }
    

    return (
        <div className="bg-primary p-4 rounded-lg border border-border-color flex flex-col md:flex-row gap-4 animate-fade-in">
            <div className="flex-grow">
                <div className="flex items-center gap-3 text-sm text-text-secondary mb-2">
                    <span>{article.source}</span>
                    <span>&bull;</span>
                    <span>{hoursAgo > 0 ? timeAgo.format(-hoursAgo, 'hour') : 'Just now'}</span>
                </div>
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-lg font-bold text-text-primary hover:text-accent cursor-pointer transition-colors group">
                    {article.headline}
                    <ExternalLink className="w-4 h-4 inline-block ml-2 text-text-secondary group-hover:text-accent transition-colors" />
                </a>
                <p className="text-sm text-text-secondary mt-2">{article.summary}</p>
            </div>
            <div className="flex-shrink-0 md:w-40 flex flex-col items-start md:items-end justify-between">
                 <div className={`px-2 py-1 text-xs font-semibold rounded-full border ${sentimentClasses}`}>
                    {article.sentiment}
                </div>
                {article.ticker && (
                    <div className="mt-2 md:mt-0 bg-secondary px-3 py-1 text-sm font-mono rounded-md text-accent">
                        {article.ticker}
                    </div>
                )}
            </div>
        </div>
    );
};

const News: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<NewsCategory>('All');
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const categories: { name: NewsCategory, icon: React.ReactNode }[] = [
        { name: 'All', icon: <Newspaper size={18} /> },
        { name: 'Market', icon: <Flame size={18} /> },
        { name: 'Crypto', icon: <Bitcoin size={18} /> },
        { name: 'Economics', icon: <BarChartHorizontal size={18} /> },
    ];

    const performFetch = useCallback(async () => {
        // Don't show main loader on background refresh
        if (articles.length === 0) {
            setIsLoading(true);
        }
        setError(null);
        try {
            // 1. Fetch real-time news articles
            const newsResponse = await fetchNews();
            if (!newsResponse.success || !newsResponse.data) {
                throw new Error(newsResponse.error?.message || 'Could not fetch news from data provider.');
            }

            // 2. Enrich the real articles with AI sentiment and category
            const enrichedArticles = await enrichNewsArticles(newsResponse.data.news);

            // 3. Sort by date descending
            enrichedArticles.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
            });

            setArticles(enrichedArticles);
        } catch (e: any) {
            setError(e.message || 'Failed to fetch or process news. The backend or AI service may be unavailable.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [articles.length]);

    useEffect(() => {
        performFetch();
        const interval = setInterval(performFetch, 300000); // Refresh every 5 minutes
        return () => clearInterval(interval);
    }, [performFetch]);

    const filteredNews = useMemo(() => {
        if (activeCategory === 'All') {
            return articles;
        }
        return articles.filter(article => article.category === activeCategory);
    }, [activeCategory, articles]);
    
    const renderContent = () => {
        if (isLoading && articles.length === 0) {
            return (
                 <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                </div>
            )
        }

        if (error) {
             return (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex items-start">
                    <AlertTriangle className="w-8 h-8 mr-4 flex-shrink-0"/>
                    <div>
                        <h3 className="font-bold">Error Fetching News</h3>
                        <p className="text-sm">{error}</p>
                         <button onClick={performFetch} className="mt-2 bg-accent text-white px-3 py-1 rounded text-sm font-semibold hover:bg-accent-hover">
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        if (articles.length === 0) {
            return <p className="text-center py-10 text-gray-400">No news articles available at the moment.</p>
        }

        return (
            <div className="space-y-4">
                {filteredNews.map(article => (
                    <NewsCard key={article.id} article={article} />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Market News</h1>

             <div className="bg-blue-900/30 border border-blue-700 text-blue-300 px-4 py-3 rounded-lg flex items-start text-sm">
                <Info className="w-5 h-5 mr-3 mt-1 flex-shrink-0" />
                <div>
                <strong>AI-Enhanced Live Data:</strong> News articles are fetched from a live market data feed. Sentiment and category are then added by an AI model for enhanced analysis.
                </div>
            </div>

            <div className="bg-secondary p-2 rounded-lg border border-border-color flex flex-wrap items-center gap-2">
                {categories.map(({ name, icon }) => (
                     <button
                        key={name}
                        onClick={() => setActiveCategory(name)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                            activeCategory === name
                                ? 'bg-accent text-white'
                                : 'text-text-secondary hover:bg-primary'
                        }`}
                    >
                        {icon}
                        {name}
                    </button>
                ))}
            </div>

            {renderContent()}

        </div>
    );
};

export default News;

import React, { useState } from 'react';
import { StrategyModel } from '../types';
import { STRATEGY_DOCS_DATA } from '../data/strategyDocData';

const TabButton = ({ label, active, onClick, icon }: { label: string, active: boolean, onClick: () => void, icon: React.ReactNode }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            active 
                ? 'bg-secondary border-b-2 border-accent text-accent' 
                : 'text-text-secondary hover:bg-secondary/50'
        }`}
    >
        {icon}
        {label}
    </button>
);

const CodeBlock = ({ code }: { code: string }) => (
    <pre className="bg-primary p-4 rounded-md text-sm text-gray-300 overflow-x-auto">
        <code>{code}</code>
    </pre>
);

import { BarChart, BookOpen, Code, Lightbulb, CheckSquare } from 'lucide-react';

const StrategyDocuments: React.FC = () => {
    const [selectedModel, setSelectedModel] = useState<StrategyModel>(StrategyModel.LSTM);
    const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'tips' | 'metrics'>('overview');

    const docData = STRATEGY_DOCS_DATA.find(d => d.model === selectedModel);

    return (
        <div className="flex gap-8 h-[calc(100vh-4rem)]">
            {/* Sidebar */}
            <nav className="w-1/4 bg-secondary p-4 rounded-lg border border-border-color overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Models & Indicators</h2>
                <ul className="space-y-1">
                    {STRATEGY_DOCS_DATA.map(item => (
                        <li key={item.model}>
                            <button
                                onClick={() => {
                                    setSelectedModel(item.model);
                                    setActiveTab('overview');
                                }}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                    selectedModel === item.model 
                                        ? 'bg-accent text-white font-semibold' 
                                        : 'hover:bg-gray-700'
                                }`}
                            >
                                {item.model}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Main Content */}
            <main className="w-3/4 flex flex-col">
                {docData ? (
                    <div className="flex-grow bg-secondary border border-border-color rounded-lg flex flex-col">
                        <div className="p-6 border-b border-border-color">
                            <h1 className="text-3xl font-bold text-text-primary">{docData.model}</h1>
                            <p className="text-text-secondary mt-1">{docData.overview.description}</p>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 border-b border-border-color flex gap-2">
                            <TabButton label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BookOpen size={16}/>} />
                            <TabButton label="Code Snippet" active={activeTab === 'code'} onClick={() => setActiveTab('code')} icon={<Code size={16}/>} />
                            <TabButton label="Optimization Tips" active={activeTab === 'tips'} onClick={() => setActiveTab('tips')} icon={<Lightbulb size={16}/>} />
                            <TabButton label="Performance Metrics" active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} icon={<CheckSquare size={16}/>} />
                        </div>
                        
                        {/* Tab Content */}
                        <div className="p-6 overflow-y-auto flex-grow">
                            {activeTab === 'overview' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-primary p-4 rounded-lg">
                                            <h4 className="font-bold text-accent mb-2">Typical Risk/Reward</h4>
                                            <p className="text-sm">{docData.overview.rrProfile}</p>
                                        </div>
                                        <div className="bg-primary p-4 rounded-lg">
                                            <h4 className="font-bold text-accent mb-2">Max Recommended Leverage</h4>
                                            <p className="text-sm">{docData.overview.maxLeverage}</p>
                                        </div>
                                        <div className="bg-primary p-4 rounded-lg">
                                            <h4 className="font-bold text-accent mb-2">Common Asset Classes</h4>
                                            <p className="text-sm">{docData.overview.assetClasses}</p>
                                        </div>
                                        <div className="bg-primary p-4 rounded-lg">
                                            <h4 className="font-bold text-accent mb-2">Primary Markets</h4>
                                            <p className="text-sm">{docData.overview.markets}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-accent mb-3">Key Parameters</h4>
                                        <ul className="space-y-3">
                                            {docData.overview.parameters.map(p => (
                                                <li key={p.name} className="bg-primary p-3 rounded-lg">
                                                    <p className="font-semibold text-text-primary">{p.name}</p>
                                                    <p className="text-sm text-text-secondary">{p.description}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                             {activeTab === 'code' && (
                                <div className="animate-fade-in">
                                    <h3 className="font-bold text-accent mb-4">Example Python Implementation</h3>
                                    <CodeBlock code={docData.codeSnippet} />
                                </div>
                            )}
                            
                            {activeTab === 'tips' && (
                                <div className="animate-fade-in">
                                    <h3 className="font-bold text-accent mb-4">Tuning & Optimization</h3>
                                    <ul className="space-y-3">
                                        {docData.optimizationTips.map((tip, index) => (
                                             <li key={index} className="flex items-start gap-3 bg-primary p-4 rounded-lg">
                                                <Lightbulb className="w-5 h-5 text-accent flex-shrink-0 mt-1"/>
                                                <p className="text-sm">{tip}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                             {activeTab === 'metrics' && (
                                <div className="animate-fade-in">
                                    <h3 className="font-bold text-accent mb-4">Relevant Evaluation Metrics</h3>
                                     <ul className="space-y-3">
                                        {docData.performanceMetrics.map((metric, index) => (
                                             <li key={index} className="bg-primary p-3 rounded-lg">
                                                <p className="font-semibold text-text-primary">{metric.name}</p>
                                                <p className="text-sm text-text-secondary">{metric.description}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                        </div>
                    </div>
                ) : (
                    <div className="text-center p-10">Select a model to view its documentation.</div>
                )}
            </main>
        </div>
    );
};

export default StrategyDocuments;
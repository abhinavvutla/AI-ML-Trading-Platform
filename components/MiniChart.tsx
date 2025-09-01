import React from 'react';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';
import { ChartableAsset } from '../types';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface MiniChartProps {
    asset: ChartableAsset;
    color: string;
}

const MiniChart: React.FC<MiniChartProps> = ({ asset, color }) => {
    const isPositive = asset.changePercent >= 0;
    
    return (
        <div className="bg-primary p-4 rounded-lg border border-border-color h-full flex flex-col justify-between">
            <div>
                <h3 className="text-text-secondary text-sm font-medium">{asset.name}</h3>
                <p className="text-2xl font-bold text-text-primary mt-1">
                    {asset.name.includes('Yield') ? `${asset.value.toFixed(3)}%` : asset.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </p>
                <div className={`flex items-center text-sm font-semibold mt-1 ${isPositive ? 'text-positive' : 'text-negative'}`}>
                    {isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    <span className="ml-1">
                        {asset.change.toFixed(2)} ({asset.changePercent.toFixed(2)}%)
                    </span>
                </div>
            </div>
            <div className="w-full h-16 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={asset.historicalData}>
                         <Tooltip
                            contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '0.5rem' }}
                            labelStyle={{ color: '#fff' }}
                            formatter={(value: number) => {
                                const formattedValue = asset.name.includes('Yield')
                                    ? `${value.toFixed(3)}%`
                                    : value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                                return [formattedValue, null];
                            }}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.date || ''}
                            cursor={{ stroke: '#8B949E', strokeWidth: 1, strokeDasharray: '2 2' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MiniChart;
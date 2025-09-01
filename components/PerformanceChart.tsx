
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter } from 'recharts';
import { PerformanceDataPoint, Trade } from '../types';

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  trades: Trade[];
}

const CustomDot: React.FC<any> = (props) => {
  const { cx, cy, payload, tradeMarkersByDate } = props;
  
  const marker = tradeMarkersByDate[payload.date];

  if (marker) {
    return (
      <svg x={cx - 5} y={cy - 5} width={10} height={10} fill={marker.type === 'buy' ? "#238636" : "#DA3633"} viewBox="0 0 1024 1024">
        <circle cx="512" cy="512" r="512" />
      </svg>
    );
  }

  return null;
};

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, trades }) => {
    
    // Create a map of trade dates for efficient lookup in the CustomDot component
    const tradeMarkersByDate = React.useMemo(() => {
        const map: { [date: string]: { type: 'buy' | 'sell' } } = {};
        if (trades && data && trades.length > 0 && data.length > 0) {
            const dataDates = data.map(d => d.date);
            const step = Math.floor(dataDates.length / trades.length);
            trades.forEach((trade, index) => {
                const dateIndex = Math.min(index * step, dataDates.length - 1);
                const date = dataDates[dateIndex];
                if (date) {
                    // Mark entry points as 'buy' and exit points as 'sell'
                    // For simplicity, we'll mark the entry
                     map[date] = { type: 'buy' }; // All entries are green dots
                }
            });
        }
        return map;
    }, [trades, data]);

    const tradeExitMarkers = React.useMemo(() => {
       const markers: any[] = [];
        if (trades && data && trades.length > 0 && data.length > 0) {
            const dataDates = data.map(d => d.date);
            const dateToValueMap = new Map(data.map(d => [d.date, d.strategy]));
            const step = Math.floor(dataDates.length / trades.length);

            trades.forEach((trade, index) => {
                const dateIndex = Math.min((index * step) + 1, dataDates.length - 1); // approximate exit
                const date = dataDates[dateIndex];
                 if (date && dateToValueMap.has(date)) {
                   markers.push({ date, value: dateToValueMap.get(date), fill: '#DA3633' });
                }
            });
        }
        return markers;
    }, [trades, data]);
  
  return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
          <XAxis dataKey="date" stroke="#888" style={{ fontSize: '0.75rem' }} />
          <YAxis
            stroke="#888"
            style={{ fontSize: '0.75rem' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            domain={['dataMin', 'dataMax']}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ bottom: 0 }} />
          <Line type="monotone" dataKey="sp500" stroke="#8B949E" strokeWidth={2} dot={false} name="S&P 500" />
          <Line 
            type="monotone" 
            dataKey="strategy" 
            stroke="#58A6FF" 
            strokeWidth={2} 
            name="Strategy" 
            dot={<CustomDot tradeMarkersByDate={tradeMarkersByDate} />} 
            activeDot={{ r: 6 }}
          />
          <Scatter data={tradeExitMarkers} fill="#DA3633" shape="circle" name="Sell"/>
        </LineChart>
      </ResponsiveContainer>
  );
};

export default PerformanceChart;

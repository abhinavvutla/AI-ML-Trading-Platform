
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Allocation } from '../types';

interface AllocationPieChartProps {
  data: Allocation[];
  title: string;
}

const AllocationPieChart: React.FC<AllocationPieChartProps> = ({ data, title }) => {
  return (
    <div className="bg-secondary p-6 rounded-lg border border-border-color h-96">
      <h3 className="text-lg font-bold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 40 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
              const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
              const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
              return (
                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12">
                  {`${(percent * 100).toFixed(0)}%`}
                </text>
              );
            }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ bottom: 0, left: 0, right: 0 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AllocationPieChart;

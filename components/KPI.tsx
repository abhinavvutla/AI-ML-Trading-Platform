
import React from 'react';
import { PortfolioMetric } from '../types';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KPIProps {
  metric: PortfolioMetric;
}

const KPI: React.FC<KPIProps> = ({ metric }) => {
  const isPositive = metric.changeType === 'positive';
  const isNegative = metric.changeType === 'negative';

  return (
    <div className="bg-secondary p-4 rounded-lg border border-border-color">
      <p className="text-sm text-gray-400 mb-1">{metric.label}</p>
      <div className="flex items-baseline">
        <h3 className="text-2xl font-bold">{metric.value}</h3>
        {metric.change && (
          <span className={`ml-2 text-sm font-semibold flex items-center ${isPositive ? 'text-positive' : 'text-negative'}`}>
            {isPositive && <ArrowUpRight className="w-4 h-4" />}
            {isNegative && <ArrowDownRight className="w-4 h-4" />}
            {metric.change}
          </span>
        )}
      </div>
    </div>
  );
};

export default KPI;

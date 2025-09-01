import React, { useState } from 'react';
import { Trade } from '../types';
import { ChevronsUpDown } from 'lucide-react';

interface TradeLogTableProps {
  trades: Trade[];
  title: string;
}

const TradeLogTable: React.FC<TradeLogTableProps> = ({ trades, title }) => {
    const [sortConfig, setSortConfig] = useState<{ key: keyof Trade; direction: 'ascending' | 'descending' } | null>({ key: 'pnl', direction: 'descending' });

    const sortedTrades = React.useMemo(() => {
        let sortableItems = [...trades];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [trades, sortConfig]);

    const requestSort = (key: keyof Trade) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const headers: { key: keyof Trade, label: string }[] = [
        { key: 'symbol', label: 'Symbol' },
        { key: 'exitReason', label: 'Exit Reason' },
        { key: 'pnl', label: 'P&L ($)' },
        { key: 'value', label: 'Value ($)' },
        { key: 'commission', label: 'Commission ($)' },
        { key: 'slippage', label: 'Slippage ($)' },
        { key: 'leverage', label: 'Leverage' },
        { key: 'rr', label: 'RR' },
        { key: 'stopLossPrice', label: 'SL Price' },
        { key: 'takeProfitPrice', label: 'TP Price' },
    ];

  return (
    <div className="bg-secondary p-4 rounded-lg border border-border-color">
      <h3 className="text-lg font-bold mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-700/50">
            <tr>
              {headers.map(header => (
                <th key={header.key} scope="col" className="p-3 cursor-pointer whitespace-nowrap" onClick={() => requestSort(header.key)}>
                  <div className="flex items-center">
                    {header.label}
                    <ChevronsUpDown className="w-4 h-4 ml-1 flex-shrink-0" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTrades.length > 0 ? sortedTrades.map((trade) => (
              <tr key={trade.id} className="border-b border-border-color hover:bg-gray-700/30">
                <td className="p-3 font-medium">{trade.symbol}</td>
                <td className="p-3">{trade.exitReason}</td>
                <td className={`p-3 font-medium ${trade.pnl > 0 ? 'text-positive' : 'text-negative'}`}>${trade.pnl.toFixed(2)}</td>
                <td className="p-3">${trade.value.toFixed(2)}</td>
                <td className="p-3">${trade.commission.toFixed(2)}</td>
                <td className="p-3">${trade.slippage.toFixed(2)}</td>
                <td className="p-3">{trade.leverage}x</td>
                <td className="p-3">{trade.rr.toFixed(2)}x</td>
                <td className="p-3">${trade.stopLossPrice.toFixed(2)}</td>
                <td className="p-3">${trade.takeProfitPrice.toFixed(2)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={headers.length} className="text-center p-4 text-gray-400">No trades to display.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TradeLogTable;
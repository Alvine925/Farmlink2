import React from 'react';
import { Package, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatCard } from './StatCard';
import { Product, Order } from '../../types';

interface OverviewTabProps {
  products: Product[];
  orders: Order[];
  chartData: any[];
  chartView: 'daily' | 'weekly' | 'monthly';
  setChartView: (view: 'daily' | 'weekly' | 'monthly') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  products,
  orders,
  chartData,
  chartView,
  setChartView
}) => {
  const totalRevenue = orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          icon={<Package className="w-6 h-6" />} 
          label="Active Listings" 
          value={products.length} 
          color="bg-blue-50 text-blue-600" 
        />
        <StatCard 
          icon={<TrendingUp className="w-6 h-6" />} 
          label="Total Orders" 
          value={orders.length} 
          color="bg-emerald-50 text-emerald-600" 
        />
        <StatCard 
          icon={<DollarSign className="w-6 h-6" />} 
          label="Revenue" 
          value={`$${totalRevenue.toFixed(2)}`} 
          color="bg-amber-50 text-amber-600" 
        />
        <StatCard 
          icon={<TrendingUp className="w-6 h-6" />} 
          label="Conversion" 
          value="12%" 
          color="bg-purple-50 text-purple-600" 
        />
      </div>

      {/* Analytics Chart */}
      <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Sales Performance
            </h2>
            <p className="text-sm text-stone-500">Revenue and order volume over time</p>
          </div>
          
          <div className="flex items-center gap-2 bg-stone-50 p-1 rounded-2xl border border-stone-100">
            {(['daily', 'weekly', 'monthly'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setChartView(view)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                  chartView === view 
                    ? 'bg-white text-emerald-700 shadow-sm border border-stone-100' 
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                yId="left"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis 
                yId="right"
                orientation="right"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '16px', 
                  border: '1px solid #f3f4f6',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  padding: '12px'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                labelStyle={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              />
              <Area 
                yId="left"
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                name="Revenue ($)"
              />
              <Area 
                yId="right"
                type="monotone" 
                dataKey="orders" 
                stroke="#f59e0b" 
                strokeWidth={3}
                fillOpacity={0}
                name="Orders"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center gap-8 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-stone-600">Total Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs font-bold text-stone-600">Order Volume</span>
          </div>
        </div>
      </div>
    </>
  );
};

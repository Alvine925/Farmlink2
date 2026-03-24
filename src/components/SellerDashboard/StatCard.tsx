import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-stone-500">{label}</p>
        <p className="text-2xl font-bold text-stone-900">{value}</p>
      </div>
    </div>
  </div>
);

import React from 'react';
import { Users, Waves, Trophy, Signal } from 'lucide-react';

interface StatsData {
  total: number;
  male: number;
  female: number;
  ku6: number;
  ku8: number;
  ku10: number;
  ku12: number;
  ku14: number;
  ku16: number;
}

interface Props {
  stats: StatsData;
}

export default function StatsDashboard({ stats }: Props) {
  const displayStats = [
    { label: 'Total Atlet', value: stats.total, color: 'text-white', bg: 'bg-brand-blue' },
    { label: 'Laki-laki', value: stats.male, color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: 'Perempuan', value: stats.female, color: 'text-pink-700', bg: 'bg-pink-50' },
    { label: 'KU 6', value: stats.ku6, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'KU 8', value: stats.ku8, color: 'text-emerald-700', bg: 'bg-emerald-100' },
    { label: 'KU 10', value: stats.ku10, color: 'text-teal-700', bg: 'bg-teal-50' },
    { label: 'KU 12', value: stats.ku12, color: 'text-teal-700', bg: 'bg-teal-100' },
    { label: 'KU 14', value: stats.ku14, color: 'text-indigo-700', bg: 'bg-indigo-50' },
    { label: 'KU 16', value: stats.ku16, color: 'text-indigo-700', bg: 'bg-indigo-100' },
  ];

  return (
    <section>
      <h3 className="text-[11px] uppercase font-black tracking-[0.2em] text-slate-400 mb-4 px-2">Live Status</h3>
      <div className="grid grid-cols-2 gap-3">
        {displayStats.map((stat, i) => (
          <div key={i} className={`stat-card group hover:shadow-md transition-all cursor-default border-none ${stat.bg} ${i === 0 ? 'col-span-2 py-6' : ''}`}>
            <span className={`text-2xl font-black tracking-tight leading-none mb-1 ${stat.color}`}>{stat.value}</span>
            <span className={`text-[9px] uppercase font-bold tracking-wider text-center ${i === 0 ? 'text-white/60' : 'text-slate-400'}`}>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

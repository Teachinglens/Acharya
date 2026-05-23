import React, { useState } from 'react';
import { AthleteData } from '../types';

interface Props {
  athletes: AthleteData[];
}

export default function AthleteTable({ athletes }: Props) {
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Off'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const getAthleteStatus = (trainingSchedule?: string) => {
    const s = trainingSchedule?.trim().toLowerCase() || '';
    if (s === 'rest' || s.includes('rest') || s === '') {
      return 'Off';
    }
    return 'Active';
  };

  const filteredAthletes = athletes.filter(athlete => {
    const status = getAthleteStatus(athlete.trainingSchedule);
    const matchesFilter = statusFilter === 'All' || status === statusFilter;
    const matchesSearch = athlete.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (athlete.school && athlete.school.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const activeCount = athletes.filter(a => getAthleteStatus(a.trainingSchedule) === 'Active').length;
  const offCount = athletes.filter(a => getAthleteStatus(a.trainingSchedule) === 'Off').length;

  return (
    <div className="card flex-1 flex flex-col overflow-hidden min-h-[400px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Athlete Directory</h2>
          <span className="text-[10px] bg-brand-light px-2 py-1 rounded text-brand-blue font-bold tracking-tight">SOURCE: SPREADSHEET [R]</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Cari atlet/sekolah..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-brand-blue bg-slate-50/50 w-full sm:w-auto"
          />
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {(['All', 'Active', 'Off'] as const).map((filter) => {
              const count = filter === 'All' ? athletes.length : filter === 'Active' ? activeCount : offCount;
              return (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-white shadow-sm text-slate-800'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {filter} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b-2 border-slate-100">
              <th className="py-3 px-2 text-[11px] uppercase text-slate-400 font-bold tracking-widest">Name</th>
              <th className="py-3 px-2 text-[11px] uppercase text-slate-400 font-bold tracking-widest">Gender</th>
              <th className="py-3 px-2 text-[11px] uppercase text-slate-400 font-bold tracking-widest">School</th>
              <th className="py-3 px-2 text-[11px] uppercase text-slate-400 font-bold tracking-widest">Schedule</th>
              <th className="py-3 px-2 text-[11px] uppercase text-slate-400 font-bold tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredAthletes.map((athlete) => {
              const status = getAthleteStatus(athlete.trainingSchedule);
              return (
                <tr key={athlete.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-3 px-2 text-sm font-medium text-slate-800">{athlete.fullName}</td>
                  <td className="py-3 px-2 text-sm text-slate-500 uppercase">{athlete.gender || '-'}</td>
                  <td className="py-3 px-2 text-sm text-slate-500">{athlete.school || '-'}</td>
                  <td className="py-3 px-2 text-[11px] font-bold text-slate-500 uppercase tracking-tight">{athlete.trainingSchedule || '-'}</td>
                  <td className="py-3 px-2 text-sm">
                    <div className="flex items-center gap-1.5">
                      {status === 'Active' ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                          <span className="text-[11px] font-bold text-green-600 uppercase">Active</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                          <span className="text-[11px] font-bold text-orange-600 uppercase">Off</span>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredAthletes.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 italic">No athlete data found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React from 'react';
import { AthleteData } from '../types';

interface Props {
  athletes: AthleteData[];
}

export default function AthleteTable({ athletes }: Props) {
  return (
    <div className="card flex-1 flex flex-col overflow-hidden min-h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Active Athlete Directory</h2>
        <span className="text-[10px] bg-brand-light px-2 py-1 rounded text-brand-blue font-bold tracking-tight">SOURCE: SPREADSHEET [R]</span>
      </div>
      
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b-2 border-slate-100">
              <th className="py-3 px-2 text-[11px] uppercase text-slate-400 font-bold tracking-widest">Name</th>
              <th className="py-3 px-2 text-[11px] uppercase text-slate-400 font-bold tracking-widest">Gender</th>
              <th className="py-3 px-2 text-[11px] uppercase text-slate-400 font-bold tracking-widest">School</th>
              <th className="py-3 px-2 text-[11px] uppercase text-slate-400 font-bold tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {athletes.map((athlete, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                <td className="py-3 px-2 text-sm font-medium">{athlete.fullName}</td>
                <td className="py-3 px-2 text-sm text-slate-500 uppercase">{athlete.gender || '-'}</td>
                <td className="py-3 px-2 text-sm text-slate-500">{athlete.school}</td>
                <td className="py-3 px-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                    <span className="text-[11px] font-bold text-green-600 uppercase">Active</span>
                  </div>
                </td>
              </tr>
            ))}
            {athletes.length === 0 && (
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

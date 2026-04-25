import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CompetitionResult, SWIMMING_EVENTS } from '../types';
import { Trophy, Timer, Search } from 'lucide-react';

export default function BestTimeDashboard() {
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(SWIMMING_EVENTS[2]); // Default to 25M gaya bebas

  useEffect(() => {
    // Only fetch entries that have a time recorded
    const q = query(collection(db, 'competition_entries'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(d => d.time && d.time !== '');
      setResults(data);
    });
    return unsubscribe;
  }, []);

  // Filter to get only the best time for each athlete in the selected event
  const bestTimes = results
    .filter(r => r.eventName === selectedEvent)
    .filter(r => r.athleteName.toLowerCase().includes(searchTerm.toLowerCase()))
    .reduce((acc: CompetitionResult[], current) => {
      const existing = acc.find(item => item.athleteName === current.athleteName);
      if (!existing) {
        acc.push(current);
      } else {
        // Simple comparison: usually lower time is better, but this handles simple strings
        // In real app, you'd convert to milliseconds for accurate numeric comparison
        if (current.time < existing.time) { 
          const idx = acc.indexOf(existing);
          acc[idx] = current;
        }
      }
      return acc;
    }, [])
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Cari nama atlet..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-medium"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-brand-blue outline-none focus:ring-2 focus:ring-brand-blue/20"
          value={selectedEvent}
          onChange={e => setSelectedEvent(e.target.value)}
        >
          {SWIMMING_EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
        </select>
      </div>

      <div className="card min-h-[400px] flex flex-col border-none shadow-2xl shadow-amber-200/20 bg-gradient-to-b from-white to-amber-50/10">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-xl text-amber-600 shadow-sm">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tighter text-slate-800">Elite Performance</h2>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">Live Leaderboard • {selectedEvent}</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] bg-slate-900 text-white px-3 py-1 rounded font-black tracking-widest mb-1">OFFICIAL RECORDS</span>
            <span className="text-[10px] font-bold text-slate-400 italic">Kab. Pandeglang, Banten</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-5 px-4 text-[10px] uppercase font-black tracking-[0.3em] text-slate-300">Rank</th>
                <th className="py-5 px-4 text-[10px] uppercase font-black tracking-[0.3em] text-slate-300">Athlete Profile</th>
                <th className="py-5 px-4 text-[10px] uppercase font-black tracking-[0.3em] text-slate-300 text-right pr-10">Splits / Final Time</th>
                <th className="py-5 px-4 text-[10px] uppercase font-black tracking-[0.3em] text-slate-300">Venue / Event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bestTimes.map((res, i) => (
                <tr key={res.id} className="group hover:bg-amber-50/40 transition-all duration-300">
                  <td className="py-6 px-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm ${
                      i === 0 ? 'bg-amber-400 text-white shadow-amber-200' : 
                      i === 1 ? 'bg-slate-300 text-white shadow-slate-200' :
                      i === 2 ? 'bg-orange-300 text-white shadow-orange-200' : 'bg-slate-50 text-slate-400'
                    }`}>
                      {i + 1}
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800 group-hover:text-brand-blue transition-colors uppercase tracking-tight">
                        {res.athleteName}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Athlete ID: {res.id?.slice(-6).toUpperCase()}</span>
                    </div>
                  </td>
                  <td className="py-6 px-4 text-right pr-10">
                    <div className="flex items-center justify-end gap-3">
                      <Timer className={`w-4 h-4 ${i === 0 ? 'text-amber-500' : 'text-slate-300'}`} />
                      <span className={`text-xl font-black tabular-nums tracking-tighter ${i === 0 ? 'text-amber-600' : 'text-brand-blue'}`}>
                        {res.time}
                      </span>
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter truncate max-w-[150px]">
                        {res.competitionName || 'Competition'}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {res.date || 'No Date'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {bestTimes.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">No records for this event</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

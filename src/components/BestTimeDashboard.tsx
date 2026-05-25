import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CompetitionResult, SWIMMING_EVENTS, Competition, AthleteData } from '../types';
import { Trophy, Timer, Search, Trash2 } from 'lucide-react';

interface Props {
  competitions?: Competition[];
  athletes?: AthleteData[];
  isAdmin?: boolean;
}

export default function BestTimeDashboard({ competitions = [], athletes = [], isAdmin = false }: Props) {
  const [results, setResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(SWIMMING_EVENTS[2]); // Default to 25M gaya bebas
  const [genderFilter, setGenderFilter] = useState<string>('All');
  const [kuFilter, setKuFilter] = useState<string>('All');
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    source: string;
    athleteName: string;
    eventName: string;
    time: string;
  } | null>(null);

  const compareTimes = (timeA: string, timeB: string) => {
    if (!timeA || !timeB) return 0;
    const toMs = (timeStr: string) => {
      try {
        const parts = timeStr.split(':');
        let mins = 0;
        let secsWithMs = '';
        
        if (parts.length > 1) {
          mins = parseInt(parts[0]) || 0;
          secsWithMs = parts[1];
        } else {
          secsWithMs = parts[0];
        }

        const secsParts = secsWithMs.split('.');
        const secs = parseInt(secsParts[0]) || 0;
        const ms = parseInt(secsParts[1]) || 0;
        
        return (mins * 60 * 1000) + (secs * 1000) + (ms * 10);
      } catch (e) {
        return 9999999; // Fallback for invalid formats
      }
    };
    return toMs(timeA) - toMs(timeB);
  };

  useEffect(() => {
    const qEntries = query(collection(db, 'competition_entries'));

    const enrichData = (item: any, source: 'competition_entries') => {
      const athlete = athletes.find(a => a.fullName.trim().toLowerCase() === item.athleteName?.trim().toLowerCase());
      
      let gender = item.gender;
      let ku = item.ku;

      if (athlete) {
        if (!gender) {
          const g = athlete.gender?.trim().toLowerCase();
          gender = (g === 'laki-laki' || g === 'l' || g === 'male') ? 'Male' : 'Female';
        }
        if (!ku && athlete.birthDate) {
          const yearParts = athlete.birthDate.split('/');
          const birthYear = parseInt(yearParts[yearParts.length - 1] || '0');
          const age = 2026 - birthYear;
          if (age <= 6) ku = '6';
          else if (age <= 8) ku = '8';
          else if (age <= 10) ku = '10';
          else if (age <= 12) ku = '12';
          else if (age <= 14) ku = '14';
          else if (age <= 16) ku = '16';
          else ku = 'Senior';
        }
      }

      return { ...item, gender: gender || 'Male', ku: ku || '10', source };
    };

    const combineData = (entries: any[]) => {
      const entriesResults = entries
        .filter(d => d.time && d.time.trim() !== '')
        .map(d => {
          let compName = d.competitionName;
          let compDate = d.date;

          if ((!compName || compName === 'Competition') && d.competitionId && competitions.length > 0) {
            const match = competitions.find(c => c.id === d.competitionId);
            if (match) {
              compName = match.name;
              compDate = match.date;
            }
          }

          return enrichData({
            id: d.id,
            athleteName: d.athleteName,
            eventName: d.eventName,
            time: d.time.trim(),
            competitionName: compName || 'Competition',
            date: compDate || 'No Date',
            gender: d.gender,
            ku: d.ku
          }, 'competition_entries');
        });

      return entriesResults;
    };

    const unsubscribeEntries = onSnapshot(qEntries, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResults(combineData(entries));
    }, (error) => {
      console.error('Entries listener error:', error);
    });

    return () => {
      unsubscribeEntries();
    };
  }, [competitions, athletes]); // Re-run when dependencies change to re-map names/metadata

  const deleteRecord = (id: string, source: string, athleteName: string, eventName: string, time: string) => {
    setConfirmDelete({ id, source, athleteName, eventName, time });
  };

  const executeDeleteRecord = async (id: string, source: string) => {
    try {
      await deleteDoc(doc(db, source, id));
    } catch (err) {
      console.error('Delete record error:', err);
      alert('Gagal menghapus catatan');
    }
  };

  // Filter to get only the best time for each athlete in the selected event
  const bestTimes = results
    .filter(r => r.eventName === selectedEvent)
    .filter(r => r.athleteName?.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(r => genderFilter === 'All' || r.gender === genderFilter)
    .filter(r => kuFilter === 'All' || r.ku === kuFilter)
    .reduce((acc: any[], current) => {
      const existing = acc.find(item => item.athleteName.trim().toLowerCase() === current.athleteName.trim().toLowerCase());
      if (!existing) {
        acc.push({ ...current });
      } else {
        // Compare times to keep the best one
        if (compareTimes(current.time, existing.time) < 0) {
          const idx = acc.indexOf(existing);
          acc[idx] = { ...current };
        }
      }
      return acc;
    }, [])
    .sort((a, b) => compareTimes(a.time, b.time));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Nama..."
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
        <select 
          className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-brand-blue outline-none focus:ring-2 focus:ring-brand-blue/20"
          value={genderFilter}
          onChange={e => setGenderFilter(e.target.value)}
        >
          <option value="All">Semua Gender</option>
          <option value="Male">Laki-laki</option>
          <option value="Female">Perempuan</option>
        </select>
        <select 
          className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-brand-blue outline-none focus:ring-2 focus:ring-brand-blue/20"
          value={kuFilter}
          onChange={e => setKuFilter(e.target.value)}
        >
          <option value="All">Semua KU</option>
          <option value="6">KU-6 kebawah</option>
          <option value="8">KU-7 s/d 8</option>
          <option value="10">KU-9 s/d 10</option>
          <option value="12">KU-11 s/d 12</option>
          <option value="14">KU-13 s/d 14</option>
          <option value="16">KU-15 s/d 16</option>
          <option value="Senior">KU-17 keatas</option>
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
                    <div className="flex flex-col relative group/row">
                      <span className="text-sm font-black text-slate-800 group-hover:text-brand-blue transition-colors uppercase tracking-tight flex items-center gap-2">
                        {res.athleteName}
                        {isAdmin && (
                          <button 
                            onClick={() => deleteRecord(res.id, res.source, res.athleteName, selectedEvent, res.time)}
                            className="opacity-0 group-hover/row:opacity-100 text-slate-200 hover:text-red-500 transition-all p-1"
                            title="Hapus Record"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
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

      {confirmDelete && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-8 pb-4 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-500">
                <Trash2 size={28} />
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Konfirmasi Hapus</h3>
              <p className="text-slate-500 text-xs font-semibold mt-2 leading-relaxed">
                Apakah Anda yakin ingin menghapus catatan waktu <strong className="text-brand-blue">{confirmDelete.time}</strong> untuk <strong className="text-slate-850">"{confirmDelete.athleteName}"</strong> pada nomor <strong className="text-slate-850">"{confirmDelete.eventName}"</strong>?
              </p>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button 
                type="button" 
                onClick={() => setConfirmDelete(null)} 
                className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={async () => {
                  const { id, source } = confirmDelete;
                  setConfirmDelete(null);
                  await executeDeleteRecord(id, source);
                }}
                className="bg-red-500 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-650 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

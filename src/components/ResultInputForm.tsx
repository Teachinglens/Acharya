import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SWIMMING_EVENTS } from '../types';
import { Loader2, Trophy } from 'lucide-react';

export default function ResultInputForm() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    athleteName: '',
    eventName: SWIMMING_EVENTS[0],
    time: '',
    competitionName: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'competition_results'), {
        ...form,
        createdAt: serverTimestamp()
      });
      alert('Catatan waktu berhasil disimpan!');
      setForm(prev => ({ ...prev, time: '', competitionName: '' }));
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-500" /> Input Catatan Waktu
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Atlet</label>
            <input 
              required
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm outline-none focus:border-brand-blue"
              value={form.athleteName}
              onChange={e => setForm({...form, athleteName: e.target.value})}
              placeholder="Nama Lengkap"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nomor Perlombaan</label>
            <select 
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm outline-none focus:border-brand-blue"
              value={form.eventName}
              onChange={e => setForm({...form, eventName: e.target.value})}
            >
              {SWIMMING_EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Waktu (mm:ss.ms)</label>
            <input 
              required
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm outline-none focus:border-brand-blue"
              value={form.time}
              onChange={e => setForm({...form, time: e.target.value})}
              placeholder="00:32.45"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Lomba</label>
            <input 
              required
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm outline-none focus:border-brand-blue"
              value={form.competitionName}
              onChange={e => setForm({...form, competitionName: e.target.value})}
              placeholder="Jakarta Open"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal</label>
            <input 
              type="date"
              required
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm outline-none focus:border-brand-blue"
              value={form.date}
              onChange={e => setForm({...form, date: e.target.value})}
            />
          </div>
        </div>

        <button 
          disabled={loading}
          className="w-full p-3 bg-brand-blue text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-brand-navy transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Simpan Catatan Waktu'}
        </button>
      </form>
    </div>
  );
}

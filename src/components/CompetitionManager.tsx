import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, serverTimestamp, deleteDoc, deleteField, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Competition, CompetitionEntry, AthleteData, SWIMMING_EVENTS } from '../types';
import { getKelompokUmur, normalizeGender, getBirthYear, isSameAthlete } from '../lib/athleteUtils';
import { Plus, Trophy, Users, Clock, Trash2, ArrowLeft, Loader2, Save, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  athletes: AthleteData[];
  filterStroke?: string;
  filterKU?: string;
  isAdmin?: boolean;
}

export default function CompetitionManager({ athletes, filterStroke = 'All', filterKU = 'All', isAdmin = false }: Props) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [entries, setEntries] = useState<CompetitionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingComp, setIsAddingComp] = useState(false);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    type: 'competition' | 'entry';
    title: string;
  } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'competitions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCompetitions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Competition)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!selectedComp) {
      setEntries([]);
      return;
    }
    const q = query(collection(db, 'competition_entries'), where('competitionId', '==', selectedComp.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CompetitionEntry)));
    });
    return unsubscribe;
  }, [selectedComp]);

  const addCompetition = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await addDoc(collection(db, 'competitions'), {
        name: formData.get('name'),
        date: formData.get('date'),
        location: formData.get('location'),
        status: 'upcoming',
        createdAt: serverTimestamp()
      });
      setIsAddingComp(false);
    } catch (err) {
      console.error(err);
      alert('Gagal menambah kompetisi');
    }
  };

  const addEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedComp?.id || selectedAthletes.length === 0 || selectedEvents.length === 0) return;
    
    setLoading(true);
    try {
      const promises = selectedAthletes.flatMap(athleteName => {
        const athlete = athletes.find(a => isSameAthlete(a.fullName, athleteName));
        const gender = normalizeGender(athlete?.gender);
        const ku = getKelompokUmur(athlete?.birthDate);

        return selectedEvents.map(eventName => 
          addDoc(collection(db, 'competition_entries'), {
            competitionId: selectedComp.id,
            competitionName: selectedComp.name,
            date: selectedComp.date,
            athleteName: athlete?.fullName || athleteName,
            athleteId: athlete?.id || '',
            gender,
            ku,
            eventName,
            status: 'registered'
          })
        )
      });
      
      await Promise.all(promises);
      setIsAddingEntry(false);
      setSelectedAthletes([]);
      setSelectedEvents([]);
    } catch (err) {
      console.error(err);
      alert('Gagal mendaftarkan atlet');
    } finally {
      setLoading(false);
    }
  };

  const updateTime = async (entryId: string, time: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    try {
      if (time === '') {
        await updateDoc(doc(db, 'competition_entries', entryId), {
          time: deleteField(),
          status: 'registered'
        });
      } else {
        await updateDoc(doc(db, 'competition_entries', entryId), {
          time,
          status: 'finished'
        });
      }
    } catch (err) {
      console.error(err);
      alert('Gagal update waktu: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  const deleteCompetition = (id: string, name: string) => {
    setConfirmDelete({
      id,
      type: 'competition',
      title: name
    });
  };

  const executeDeleteCompetition = async (compId: string) => {
    setLoading(true);
    try {
      // 1. Delete all entries associated with this competition (using filtered query)
      const entriesQuery = query(collection(db, 'competition_entries'), where('competitionId', '==', compId));
      const snapshot = await getDocs(entriesQuery);
      
      if (!snapshot.empty) {
        const entryPromises = snapshot.docs.map(d => deleteDoc(doc(db, 'competition_entries', d.id)));
        await Promise.all(entryPromises);
      }

      // 2. Delete the competition itself
      await deleteDoc(doc(db, 'competitions', compId));
      
      setSelectedComp(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Gagal menghapus kompetisi: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = (id: string, name: string) => {
    setConfirmDelete({
      id,
      type: 'entry',
      title: name
    });
  };

  const executeDeleteEntry = async (entryId: string) => {
    try {
      await deleteDoc(doc(db, 'competition_entries', entryId));
    } catch (err) {
      console.error('Delete entry error:', err);
      alert('Gagal menghapus entri: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-brand-blue" /></div>;
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!selectedComp ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col gap-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Daftar Perlombaan</h2>
              {isAdmin && (
                <button 
                  onClick={() => setIsAddingComp(true)}
                  className="btn-primary py-2 px-4 flex items-center gap-2"
                >
                  <Plus size={16} /> Tambah Perlombaan
                </button>
              )}
            </div>

            {isAddingComp && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card border-2 border-brand-blue/20 bg-white"
              >
                <form onSubmit={addCompetition} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Perlombaan</label>
                    <input required name="name" placeholder="Contoh: Jakarta Open 2024" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-800 outline-none focus:border-brand-blue" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal</label>
                    <input required name="date" type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-800 outline-none focus:border-brand-blue" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lokasi</label>
                    <input name="location" placeholder="Contoh: Kolam Renang Senayan" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-800 outline-none focus:border-brand-blue" />
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setIsAddingComp(false)} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">Batal</button>
                    <button className="bg-brand-blue text-white px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-brand-navy active:scale-95 transition-all">Simpan Perlombaan</button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {competitions.map(comp => (
                <div 
                  key={comp.id} 
                  onClick={() => setSelectedComp(comp)}
                  className="card group hover:border-brand-blue cursor-pointer transition-all border-none bg-white shadow-lg overflow-hidden flex flex-col p-0"
                >
                  <div className="h-2 bg-brand-blue group-hover:h-3 transition-all"></div>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-slate-50 p-2.5 rounded-xl text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-all shadow-sm">
                        <Trophy size={20} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm ${
                          comp.status === 'completed' ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-green-50 text-green-600 border-green-100'
                        }`}>
                          {comp.status}
                        </span>
                        {isAdmin && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCompetition(comp.id!, comp.name);
                            }}
                            className="p-1.5 rounded-full bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <h3 className="font-black text-slate-800 text-lg group-hover:text-brand-blue transition-colors uppercase tracking-tight leading-tight mb-2">{comp.name}</h3>
                    <div className="mt-auto pt-4 border-t border-slate-50 space-y-2">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         <Calendar size={12} className="text-slate-300" /> {comp.date}
                       </div>
                       <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         <div className="w-3 h-3 bg-slate-100 rounded-full flex items-center justify-center text-[8px] font-black italic text-slate-400">@</div> {comp.location}
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setSelectedComp(null)}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-blue transition-colors"
              >
                <ArrowLeft size={14} /> Kembali
              </button>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">{selectedComp.name}</h2>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => deleteCompetition(selectedComp.id!, selectedComp.name)}
                      className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      title="Hapus Kompetisi"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button 
                      onClick={() => setIsAddingEntry(true)}
                      className="btn-primary py-2 px-4 flex items-center gap-2"
                    >
                      <Plus size={16} /> Tambah Atlet & Nomor
                    </button>
                  </>
                )}
              </div>
            </div>

            {isAddingEntry && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card border-2 border-brand-blue/20 bg-white"
              >
                <form onSubmit={addEntry} className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">1. Pilih Atlet ({selectedAthletes.length})</label>
                      <input 
                        type="text" 
                        placeholder="Cari nama..." 
                        value={athleteSearch}
                        onChange={(e) => setAthleteSearch(e.target.value)}
                        className="text-[10px] p-1 border-b border-slate-200 outline-none focus:border-brand-blue font-bold uppercase tracking-widest bg-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto p-2 bg-slate-50/50 rounded-lg">
                      {athletes.filter(a => a.fullName.toLowerCase().includes(athleteSearch.toLowerCase())).map(a => (
                        <label key={a.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${
                          selectedAthletes.includes(a.fullName) ? 'bg-brand-blue/10 border-brand-blue' : 'bg-white border-slate-100 hover:border-slate-300'
                        }`}>
                          <input 
                            type="checkbox"
                            className="hidden"
                            checked={selectedAthletes.includes(a.fullName)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedAthletes([...selectedAthletes, a.fullName]);
                              else setSelectedAthletes(selectedAthletes.filter(name => name !== a.fullName));
                            }}
                          />
                          <span className={`text-[10px] font-bold uppercase tracking-tight truncate ${
                            selectedAthletes.includes(a.fullName) ? 'text-brand-blue' : 'text-slate-600'
                          }`}>{a.fullName}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {selectedAthletes.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3"
                    >
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block pb-2 border-b border-slate-100">2. Pilih Nomor Lomba ({selectedEvents.length})</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-2 bg-slate-50/50 rounded-lg">
                        {SWIMMING_EVENTS.map(ev => (
                          <label key={ev} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${
                            selectedEvents.includes(ev) ? 'bg-brand-blue/10 border-brand-blue' : 'bg-white border-slate-100 hover:border-slate-300'
                          }`}>
                            <input 
                              type="checkbox"
                              className="hidden"
                              checked={selectedEvents.includes(ev)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedEvents([...selectedEvents, ev]);
                                else setSelectedEvents(selectedEvents.filter(name => name !== ev));
                              }}
                            />
                            <span className={`text-[10px] font-bold uppercase tracking-tight ${
                              selectedEvents.includes(ev) ? 'text-brand-blue' : 'text-slate-600'
                            }`}>{ev}</span>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsAddingEntry(false);
                        setSelectedAthletes([]);
                        setSelectedEvents([]);
                      }} 
                      className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Batal
                    </button>
                    <button 
                      disabled={selectedAthletes.length === 0 || selectedEvents.length === 0}
                      className="bg-brand-blue text-white px-8 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-brand-navy active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Daftarkan {selectedAthletes.length > 0 && selectedEvents.length > 0 ? (selectedAthletes.length * selectedEvents.length) : ''} Entri
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="card p-0 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="py-4 px-6 text-[10px] uppercase font-black tracking-widest text-slate-400">Athlete</th>
                    <th className="py-4 px-6 text-[10px] uppercase font-black tracking-widest text-slate-400">Event</th>
                    <th className="py-4 px-6 text-[10px] uppercase font-black tracking-widest text-slate-400">Record Time</th>
                    {isAdmin && <th className="py-4 px-6 text-[10px] uppercase font-black tracking-widest text-slate-400 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries
                    .filter(entry => {
                      if (filterStroke !== 'All' && !entry.eventName.toLowerCase().includes(filterStroke.toLowerCase())) return false;
                      if (filterKU !== 'All') {
                        const athlete = athletes.find(a => isSameAthlete(a.fullName, entry.athleteName));
                        if (!athlete || !athlete.birthDate) return false;
                        const entryKU = getKelompokUmur(athlete.birthDate);
                        if (entryKU !== filterKU) return false;
                      }
                      return true;
                    })
                    .map(entry => (
                    <tr key={entry.id} className={`group hover:bg-slate-50/50 transition-all ${entry.time ? 'bg-green-50/30' : ''}`}>
                      <td className="py-4 px-6 font-bold text-slate-700 uppercase tracking-tight">{entry.athleteName}</td>
                      <td className="py-4 px-6 text-xs font-bold text-brand-blue uppercase tracking-widest">{entry.eventName}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <input 
                            defaultValue={entry.time}
                            onBlur={(e) => {
                              if (e.target.value !== (entry.time || '')) {
                                updateTime(entry.id!, e.target.value);
                              }
                            }}
                            placeholder="00:00.00"
                            className={`w-24 p-2 text-xs font-black tabular-nums border rounded outline-none shadow-sm transition-all ${
                              entry.time ? 'border-green-500 bg-white ring-2 ring-green-100 ring-offset-1' : 'border-slate-200 focus:border-brand-blue'
                            }`}
                            readOnly={!isAdmin}
                          />
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteEntry(entry.id!, `${entry.athleteName} - ${entry.eventName}`);
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-red-500 transition-all active:scale-90 shadow-sm hover:shadow-md"
                            title="Hapus Entri"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">Belum ada atlet terdaftar</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {confirmDelete && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-8 pb-4 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-500">
                <Trash2 size={28} />
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Konfirmasi Hapus</h3>
              <p className="text-slate-500 text-xs font-semibold mt-2 leading-relaxed">
                Apakah Anda yakin ingin menghapus {confirmDelete.type === 'competition' ? 'kompetisi' : 'entri'}{' '}
                <strong className="text-slate-800">"{confirmDelete.title}"</strong>?
                {confirmDelete.type === 'competition' && ' Semua entri atlet di dalam kompetisi ini juga akan dihapus permanen.'}
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
                  const { id, type } = confirmDelete;
                  setConfirmDelete(null);
                  if (type === 'competition') {
                    await executeDeleteCompetition(id);
                  } else {
                    await executeDeleteEntry(id);
                  }
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

import React, { useEffect, useState } from 'react';
import { fetchAthletesFromSheet } from './services/sheetService';
import { AthleteData, Competition } from './types';
import AthleteTable from './components/AthleteTable';
import StatsDashboard from './components/StatsDashboard';
import BestTimeDashboard from './components/BestTimeDashboard';
import ResultInputForm from './components/ResultInputForm';
import CompetitionManager from './components/CompetitionManager';
import Gallery from './components/Gallery';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Image as ImageIcon, Newspaper, ExternalLink, ChevronRight, Trophy } from 'lucide-react';
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [athletes, setAthletes] = useState<AthleteData[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStroke, setFilterStroke] = useState<string>('All');
  const [filterKU, setFilterKU] = useState<string>('All');

  const GFORM_URL = "https://forms.gle/YiXFCbfaTo5bWmxc8";

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch from Spreadsheet
      const sheetData = await fetchAthletesFromSheet();
      setAthletes(sheetData);
    } catch (error) {
      console.error('Failed to sync data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = athletes.reduce((acc, a) => {
    acc.total++;
    
    // Gender
    const g = a.gender?.trim().toLowerCase();
    if (g === 'laki-laki' || g === 'l' || g === 'male') acc.male++;
    else if (g === 'perempuan' || g === 'p' || g === 'female') acc.female++;

    // KU (Kelompok Umur) based on year difference
    if (a.birthDate) {
      const parts = a.birthDate.split('/');
      const year = parts.length === 3 ? parseInt(parts[2]) : null;
      if (year && !isNaN(year)) {
        const currentYear = 2026;
        const age = currentYear - year;
        if (age <= 6) acc.ku6++;
        else if (age <= 8) acc.ku8++;
        else if (age <= 10) acc.ku10++;
        else if (age <= 12) acc.ku12++;
        else if (age <= 14) acc.ku14++;
        else if (age <= 16) acc.ku16++;
      }
    }
    return acc;
  }, {
    total: 0, male: 0, female: 0,
    ku6: 0, ku8: 0, ku10: 0, ku12: 0, ku14: 0, ku16: 0
  });

  useEffect(() => {
    loadData();

    // Listen to Competitions for Sidebar
    const q = query(collection(db, 'competitions'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCompetitions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Competition)));
    });

    return () => unsubscribe();
  }, []);

  const upcomingMeets = competitions
    .filter(c => {
      if (c.status === 'completed') return false;
      const meetDate = new Date(c.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return meetDate >= today;
    })
    .slice(0, 3);

  const isSidebarHidden = activeTab === 'Dashboard' || activeTab === 'Best Time' || activeTab === 'Gallery';

  return (
    <div className={`main-grid ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <header className="header">
        <div className="flex items-center gap-4">
          <img 
            src="/logo.png" 
            alt="Acharya Swimming Club Logo" 
            className="w-14 h-14 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=ASC";
            }}
          />
          <div>
            <div className="font-extrabold text-xl tracking-tighter leading-none">ACHARYA</div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Swimming Club</div>
          </div>
        </div>
        
        <nav className="flex gap-10">
          {['Dashboard', 'Schedules', 'Best Time', 'Gallery', 'News'].map((item) => (
            <button 
              key={item} 
              onClick={() => setActiveTab(item)}
              className={`text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer relative group ${activeTab === item ? 'text-brand-blue' : 'text-slate-400 hover:text-brand-blue'}`}
            >
              {item}
              <span className={`absolute -bottom-1 left-0 h-0.5 bg-brand-blue transition-all duration-300 ${activeTab === item ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
            </button>
          ))}
        </nav>
        
        {activeTab !== 'Gallery' && (
          <button 
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-3 bg-green-50 px-4 py-2 rounded-full border border-green-100 shadow-sm hover:bg-green-100 transition-colors disabled:opacity-50 group"
          >
            <div className="relative flex h-2 w-2">
              <span className={`${loading ? 'animate-spin' : 'animate-ping'} absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75`}></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </div>
            <span className="text-[10px] font-black text-green-700 tracking-widest uppercase">
              {loading ? 'Synchronizing...' : 'Live Data Feed'}
            </span>
          </button>
        )}
      </header>

      <aside className="sidebar">
        {activeTab === 'Schedules' ? (
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-[11px] uppercase font-black tracking-[0.2em] text-slate-400 px-2">Filter Gaya</h3>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setFilterStroke('All')}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${filterStroke === 'All' ? 'bg-brand-blue text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                >
                  All
                </button>
                {['Bebas', 'Dada', 'Punggung', 'Kupu', 'Papan'].map(stroke => (
                  <button 
                    key={stroke}
                    onClick={() => setFilterStroke(stroke)}
                    className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${filterStroke === stroke ? 'bg-brand-blue text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    {stroke}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-[11px] uppercase font-black tracking-[0.2em] text-slate-400 px-2">Filter Kelompok Umur</h3>
              <div className="grid grid-cols-2 gap-2">
                {['All', '6', '8', '10', '12', '14', '16'].map(ku => (
                  <button 
                    key={ku}
                    onClick={() => setFilterKU(ku)}
                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${filterKU === ku ? 'bg-brand-blue border-brand-blue text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                  >
                    {ku === 'All' ? 'Semua KU' : `KU ${ku}`}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <StatsDashboard stats={stats} />
        )}
        
        <section className="mt-4">
          <h3 className="text-[11px] uppercase font-black tracking-[0.2em] text-slate-400 mb-4 px-2 flex items-center justify-between">
            Upcoming Meets <Calendar className="w-3 h-3" />
          </h3>
          <div className="flex flex-col gap-3">
            {upcomingMeets.length > 0 ? (
              upcomingMeets.map((meet, i) => (
                <div 
                  key={meet.id || i} 
                  onClick={() => setActiveTab('Schedules')}
                  className="group cursor-pointer"
                >
                  <div className="border-l-[3px] border-brand-blue pl-4 pr-2 py-2 group-hover:bg-slate-50 transition-colors rounded-r-lg">
                    <strong className="text-xs block mb-1 group-hover:text-brand-blue transition-colors line-clamp-1 uppercase tracking-tight">{meet.name}</strong>
                    <p className="text-[10px] text-slate-500 font-bold tracking-tight uppercase">{meet.date} | {meet.location}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-2 py-4 border border-dashed border-slate-200 rounded-lg text-center">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No upcoming meets</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => setActiveTab('Schedules')}
            className="w-full mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 hover:text-brand-blue transition-colors uppercase tracking-widest"
          >
            View All Meets <ChevronRight className="w-3 h-3" />
          </button>
        </section>

        {activeTab !== 'Schedules' && (
          <section className="mt-auto">
            <h3 className="text-[11px] uppercase font-black tracking-[0.2em] text-slate-400 mb-4 px-2">Gallery Preview</h3>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((n) => (
                <div key={n} className="aspect-square bg-brand-light rounded-lg overflow-hidden group cursor-pointer relative">
                  <div className="absolute inset-0 bg-brand-blue opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  <ImageIcon className="absolute inset-0 m-auto w-6 h-6 text-brand-blue/20" />
                  <img 
                    src={`https://images.unsplash.com/photo-1530549387631-f535c76c0f0c?q=80&w=2070&auto=format&fit=crop`} 
                    alt="Swimming" 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </aside>

      <main className={`content-area transition-colors duration-500 ${
        activeTab === 'Dashboard' ? 'bg-brand-zinc' : 
        activeTab === 'Schedules' ? 'bg-slate-50' :
        activeTab === 'Best Time' ? 'bg-amber-50/30' : 'bg-brand-zinc'
      }`}>
        <AnimatePresence mode="wait">
          {activeTab === 'Dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="flex flex-col gap-6"
            >
              {/* Stats at the top since sidebar is hidden */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="stat-card bg-brand-blue text-white shadow-lg overflow-hidden relative">
                   <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-bl-full"></div>
                   <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Total Atlet</div>
                   <div className="text-3xl font-black">{stats.total}</div>
                </div>
                <div className="stat-card bg-blue-50 text-blue-700 shadow-sm">
                   <div className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">Laki-laki</div>
                   <div className="text-3xl font-black">{stats.male}</div>
                </div>
                <div className="stat-card bg-pink-50 text-pink-700 shadow-sm">
                   <div className="text-[10px] font-black text-pink-300 uppercase tracking-widest mb-1">Perempuan</div>
                   <div className="text-3xl font-black">{stats.female}</div>
                </div>
                <div className="stat-card bg-emerald-50 text-emerald-700 shadow-sm">
                   <div className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1">KU 6-10</div>
                   <div className="text-3xl font-black">{stats.ku6 + stats.ku8 + stats.ku10}</div>
                </div>
                <div className="stat-card bg-teal-50 text-teal-700 shadow-sm">
                   <div className="text-[10px] font-black text-teal-300 uppercase tracking-widest mb-1">KU 11-14</div>
                   <div className="text-3xl font-black">{stats.ku12 + stats.ku14}</div>
                </div>
                <div className="stat-card bg-indigo-50 text-indigo-700 shadow-sm">
                   <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">KU 15+</div>
                   <div className="text-3xl font-black">{stats.ku16}</div>
                </div>
              </div>

              <div className="card bg-brand-blue text-white overflow-hidden relative min-h-[340px] flex items-center border-none shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-blue via-brand-blue to-brand-navy"></div>
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none rotate-12">
                  <Newspaper className="w-80 h-80" />
                </div>
                <div className="flex justify-between items-center w-full relative z-10 px-8 py-12">
                  <div className="max-w-4xl text-left">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full mb-4 inline-block">Featured News</span>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif italic mb-6 leading-tight">Practice Make Perfect</h1>
                    <div className="text-lg text-white/80 font-medium leading-relaxed mb-8 max-w-3xl space-y-4">
                      <p>Acharya Swimming Club adalah club resmi dibawah binaan Akuatik Kab. Pandeglang sejak Juni 2023.</p>
                      <p>Acharya Swimming Club adalah wadah pembinaan olahraga renang yang berfokus pada pengembangan kemampuan teknik, mental, dan karakter atlet sejak usia dini hingga tingkat prestasi.</p>
                      <p>Didirikan dengan semangat mencetak generasi yang sehat, disiplin, dan berprestasi, Acharya Swimming Club menghadirkan program latihan yang terstruktur, menyenangkan, dan berorientasi pada hasil.</p>
                    </div>
                    <div className="flex gap-4">
                      <a 
                        href={GFORM_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-white text-brand-blue px-6 py-3 rounded-lg font-bold hover:bg-brand-light transition-all active:scale-95 text-xs inline-block"
                      >
                        Daftar Sekarang
                      </a>
                      <button className="bg-white/10 text-white border border-white/20 px-6 py-3 rounded-lg font-bold hover:bg-white/20 transition-all active:scale-95 text-xs">
                        Lihat Prestasi
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AthleteTable athletes={athletes} />
                
                <div className="flex flex-col gap-6">
                  <div className="card h-full">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6 flex items-center justify-between">
                      Jadwal Latihan Mingguan
                    </h3>
                    <div className="space-y-4">
                      {[
                        { day: 'Kamis', time: '15:30 - 17:00' },
                        { day: 'Sabtu', time: '15:30 - 17:00' },
                        { day: 'Minggu', time: '08:00 - 09:30' },
                      ].map((sched, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-brand-light rounded-xl border border-brand-blue/5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-brand-blue font-black shadow-sm">
                              {sched.day.charAt(0)}
                            </div>
                            <div>
                              <div className="text-xs font-black uppercase tracking-tight text-slate-700">{sched.day}</div>
                              <div className="text-[10px] text-brand-blue font-black tracking-widest">{sched.time}</div>
                            </div>
                          </div>
                          <Calendar size={14} className="text-slate-300" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'Schedules' ? (
            <motion.div 
              key="schedules"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CompetitionManager 
                athletes={athletes} 
                filterStroke={filterStroke}
                filterKU={filterKU}
              />
            </motion.div>
          ) : activeTab === 'Best Time' ? (
            <motion.div 
              key="best-time"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6"
            >
              <BestTimeDashboard />
            </motion.div>
          ) : activeTab === 'Gallery' ? (
            <motion.div 
              key="gallery"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Gallery />
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-300 uppercase font-black tracking-widest">
              Coming Soon
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

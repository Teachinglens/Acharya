import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageIcon, Plus, Trash2, X, Upload, Loader2 } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Album, Photo } from '../types';

export default function Gallery() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingAlbum, setIsAddingAlbum] = useState(false);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const albumsQuery = query(collection(db, 'albums'), orderBy('createdAt', 'desc'));
    const unsubscribeAlbums = onSnapshot(albumsQuery, (snapshot) => {
      setAlbums(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Album)));
      setLoading(false);
    });

    const photosQuery = query(collection(db, 'photos'), orderBy('createdAt', 'desc'));
    const unsubscribePhotos = onSnapshot(photosQuery, (snapshot) => {
      setPhotos(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Photo)));
    });

    return () => {
      unsubscribeAlbums();
      unsubscribePhotos();
    };
  }, []);

  const handleCreateAlbum = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await addDoc(collection(db, 'albums'), {
        title: formData.get('title'),
        description: formData.get('description'),
        createdAt: serverTimestamp()
      });
      setIsAddingAlbum(false);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat album');
    }
  };

  const handleAddPhoto = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!selectedAlbumId) return;

    try {
      await addDoc(collection(db, 'photos'), {
        albumId: selectedAlbumId,
        url: formData.get('url'),
        title: formData.get('title'),
        description: formData.get('description'),
        createdAt: serverTimestamp()
      });
      setIsAddingPhoto(false);
      setSelectedAlbumId('');
    } catch (err) {
      console.error(err);
      alert('Gagal menambah foto');
    }
  };

  const deleteAlbum = async (id: string) => {
    if (!window.confirm('Hapus album ini dan semua foto di dalamnya?')) return;
    try {
      await deleteDoc(doc(db, 'albums', id));
      // Delete associated photos
      const albumPhotos = photos.filter(p => p.albumId === id);
      await Promise.all(albumPhotos.map(p => deleteDoc(doc(db, 'photos', p.id!))));
    } catch (err) {
      console.error(err);
    }
  };

  const deletePhoto = async (id: string) => {
    if (!window.confirm('Hapus foto ini?')) return;
    try {
      await deleteDoc(doc(db, 'photos', id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-brand-blue" /></div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-10 py-4 pb-20"
    >
      <header className="max-w-4xl px-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-serif italic text-brand-blue mb-4 leading-tight">Momen Kebersamaan & Prestasi</h1>
          <p className="text-slate-500 font-medium leading-relaxed max-w-2xl">
            Koleksi dokumentasi kegiatan Acharya Swimming Club, mulai dari sesi latihan teknis harian hingga semarak kejuaraan antar atlet.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAddingAlbum(true)}
            className="flex items-center gap-2 bg-white text-brand-blue border border-brand-blue/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all shadow-sm"
          >
            <Plus size={14} /> Album Baru
          </button>
          <button 
            onClick={() => setIsAddingPhoto(true)}
            className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-navy transition-all shadow-md active:scale-95"
          >
            <Upload size={14} /> Unggah Foto
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isAddingAlbum && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4"
          >
            <div className="bg-white rounded-3xl p-8 border-2 border-brand-blue/10 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Buat Album Baru</h3>
                <button onClick={() => setIsAddingAlbum(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateAlbum} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Judul Album</label>
                  <input required name="title" placeholder="Contoh: Latihan Pagi Minggu" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deskripsi Singkat</label>
                  <input name="description" placeholder="Contoh: Fokus pada teknik stroke dada" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue" />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button className="bg-brand-blue text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-brand-navy active:scale-95 transition-all">Simpan Album</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {isAddingPhoto && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4"
          >
            <div className="bg-white rounded-3xl p-8 border-2 border-brand-blue/10 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Unggah Foto Baru</h3>
                <button onClick={() => setIsAddingPhoto(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddPhoto} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pilih Album</label>
                    <select 
                      required 
                      value={selectedAlbumId}
                      onChange={(e) => setSelectedAlbumId(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue"
                    >
                      <option value="">Pilih Album...</option>
                      {albums.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">URL Gambar (Unsplash/Direct Link)</label>
                    <input required name="url" placeholder="https://images.unsplash.com/..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Judul Foto</label>
                    <input name="title" placeholder="Opsional" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deskripsi Foto</label>
                    <input name="description" placeholder="Opsional" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button disabled={!selectedAlbumId} className="bg-brand-blue text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-brand-navy active:scale-95 transition-all disabled:opacity-50">Unggah Foto</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {showGuide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-black text-brand-blue uppercase tracking-tight">Panduan Pengelolaan Gallery</h3>
                <button onClick={() => setShowGuide(false)} className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 text-slate-400 hover:text-brand-blue transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center text-[10px]">1</span>
                    Membuat Album
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed pl-8">
                    Klik tombol <strong>Album Baru</strong> untuk mengelompokkan foto berdasarkan acara atau kategori latihan. Berikan judul yang informatif agar mudah dicari oleh atlet.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center text-[10px]">2</span>
                    Unggah Foto (Direct Link)
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed pl-8">
                    Sistem ini menggunakan <strong>Direct Image URL</strong>. Anda bisa menggunakan platform seperti Unsplash atau Google Photos (yang dipublikasikan). Pastikan URL berakhir dengan ekstensi gambar (.jpg, .png).
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center text-[10px]">3</span>
                    Tips Menggunakan Unsplash
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed pl-8 bg-brand-blue/5 p-4 rounded-2xl">
                    Cari foto di <a href="https://unsplash.com" target="_blank" rel="noreferrer" className="text-brand-blue underline">Unsplash.com</a>, kemudian: <br/>
                    1. Klik kanan pada gambar <br/>
                    2. Pilih <strong>"Copy Image Address"</strong> <br/>
                    3. Tempelkan ke kolom URL di form unggah foto.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center text-[10px]">4</span>
                    Menghapus Konten
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed pl-8">
                    Gunakan ikon <Trash2 size={12} className="inline mx-1"/> pada judul album untuk menghapus seluruh album, atau arahkan kursor ke foto untuk menghapus foto secara spesifik.
                  </p>
                </div>
              </div>
              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setShowGuide(false)}
                  className="bg-brand-blue text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-brand-navy shadow-lg transition-all active:scale-95"
                >
                  Dimengerti
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {albums.map((album) => {
        const albumPhotos = photos.filter(p => p.albumId === album.id);
        return (
          <section key={album.id} className="flex flex-col gap-6">
            <div className="px-4 flex justify-between items-end">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 mb-1 flex items-center gap-3">
                  {album.title}
                  <button 
                    onClick={() => deleteAlbum(album.id!)}
                    className="text-slate-200 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{album.description}</p>
              </div>
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{albumPhotos.length} Photos</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4 text-left">
              {albumPhotos.map((photo) => (
                <motion.div 
                  key={photo.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-slate-100 rounded-3xl overflow-hidden shadow-sm group cursor-pointer relative"
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <div className="absolute inset-0 bg-brand-blue opacity-0 group-hover:opacity-10 transition-opacity z-10"></div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePhoto(photo.id!);
                      }}
                      className="absolute top-4 right-4 z-20 bg-white/90 p-2 rounded-xl text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                    <img 
                      src={photo.url} 
                      alt={photo.title || album.title} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  {(photo.title || photo.description) && (
                    <div className="p-4 bg-white">
                      {photo.title && <h4 className="text-[10px] font-black uppercase tracking-tight text-slate-800 line-clamp-1">{photo.title}</h4>}
                      {photo.description && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest line-clamp-1 mt-0.5">{photo.description}</p>}
                    </div>
                  )}
                </motion.div>
              ))}
              {albumPhotos.length === 0 && (
                <div 
                  onClick={() => {
                    setSelectedAlbumId(album.id!);
                    setIsAddingPhoto(true);
                  }}
                  className="aspect-[4/3] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-300 hover:border-brand-blue hover:text-brand-blue transition-all cursor-pointer group"
                >
                  <Upload size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Tambah Foto</span>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {albums.length === 0 && (
        <section className="bg-slate-50 rounded-3xl p-20 text-center mx-4 border border-dashed border-slate-200">
          <div className="bg-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <ImageIcon className="text-brand-blue" size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Belum ada Album</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Mulai unggah dokumentasi kegiatan Acharya Swimming Club di sini</p>
          <button 
            onClick={() => setIsAddingAlbum(true)}
            className="bg-brand-blue text-white px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-brand-navy transition-all active:scale-95 shadow-lg"
          >
            Buat Album Pertama Anda
          </button>
        </section>
      )}

      <section className="bg-brand-blue rounded-[3rem] p-16 text-center mx-4 mt-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-white rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10">
          <h3 className="text-3xl font-serif italic text-white mb-4">Ingin Menambahkan Dokumentasi?</h3>
          <p className="text-white/60 text-sm font-medium mb-8 max-w-xl mx-auto">
            Gunakan fitur di atas untuk mengelola album foto klub. Pastikan URL gambar yang digunakan adalah tautan langsung yang valid.
          </p>
          <button 
            onClick={() => setShowGuide(true)}
            className="bg-white text-brand-blue px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-50 transition-all active:scale-95 shadow-xl"
          >
            Panduan Pengelolaan
          </button>
        </div>
      </section>
    </motion.div>
  );
}


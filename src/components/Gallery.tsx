import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageIcon, Plus, Trash2, X, Upload, Loader2, Edit2, AlertCircle } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Album, Photo } from '../types';

interface Props {
  isAdmin?: boolean;
}

function transformImageUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();

  // 1. Google Drive shared link
  const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=))([a-zA-Z0-9_-]{25,45})/;
  const driveMatch = cleaned.match(driveRegex);
  if (driveMatch && driveMatch[1]) {
    return `https://docs.google.com/uc?export=view&id=${driveMatch[1]}`;
  }

  // 2. Dropbox link
  if (cleaned.includes('dropbox.com')) {
    return cleaned.replace('?dl=0', '?raw=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');
  }

  return cleaned;
}

function isGooglePhotosUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('photos.app.goo.gl') || url.includes('photos.google.com/share') || (url.includes('photos.google.com') && !url.includes('lh3.googleusercontent.com'));
}

function ImageWithFallback({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [hasError, setHasError] = useState(false);
  const [processedSrc, setProcessedSrc] = useState(src);

  useEffect(() => {
    setProcessedSrc(transformImageUrl(src));
    setHasError(false);
  }, [src]);

  if (hasError) {
    return (
      <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-6 text-center border border-slate-100 rounded-3xl min-h-[180px]">
        <AlertCircle className="text-orange-400 w-8 h-8 mb-2 animate-bounce" />
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Gambar Gagal Dimuat</span>
        <span className="text-[8px] font-bold text-slate-400 mt-1 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap block mx-auto">
          {src}
        </span>
      </div>
    );
  }

  return (
    <img 
      src={processedSrc} 
      alt={alt} 
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
}

export default function Gallery({ isAdmin = false }: Props) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingAlbum, setIsAddingAlbum] = useState(false);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
  const [showGuide, setShowGuide] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    type: 'album' | 'photo';
    title: string;
  } | null>(null);

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
        url: transformImageUrl(formData.get('url') as string),
        title: formData.get('title'),
        description: formData.get('description'),
        createdAt: serverTimestamp()
      });
      setIsAddingPhoto(false);
      setSelectedAlbumId('');
      setNewPhotoUrl('');
    } catch (err) {
      console.error(err);
      alert('Gagal menambah foto');
    }
  };

  const handleEditPhoto = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPhoto || !editingPhoto.id) return;

    try {
      const { id, ...updateData } = editingPhoto;
      await updateDoc(doc(db, 'photos', id), {
        ...updateData,
        url: transformImageUrl(updateData.url || '')
      });
      setEditingPhoto(null);
    } catch (err) {
      console.error(err);
      alert('Gagal mengedit foto');
    }
  };

  const deleteAlbum = (id: string, title: string) => {
    setConfirmDelete({
      id,
      type: 'album',
      title
    });
  };

  const executeDeleteAlbum = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'albums', id));
      // Delete associated photos
      const albumPhotos = photos.filter(p => p.albumId === id);
      await Promise.all(albumPhotos.map(p => deleteDoc(doc(db, 'photos', p.id!))));
    } catch (err) {
      console.error(err);
    }
  };

  const deletePhoto = (id: string, title?: string) => {
    setConfirmDelete({
      id,
      type: 'photo',
      title: title || 'Foto'
    });
  };

  const executeDeletePhoto = async (id: string) => {
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
        {isAdmin && (
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
        )}
      </header>

      <AnimatePresence>
        {isAddingAlbum && (
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
                <h3 className="text-xl font-black text-brand-blue uppercase tracking-tight">Buat Album Baru</h3>
                <button onClick={() => setIsAddingAlbum(false)} className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 text-slate-400 hover:text-brand-blue transition-all">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateAlbum} className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Judul Album</label>
                    <input required name="title" placeholder="Contoh: Latihan Pagi Minggu" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue shadow-inner" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deskripsi Singkat</label>
                    <input name="description" placeholder="Contoh: Fokus pada teknik stroke dada" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue shadow-inner" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddingAlbum(false)} className="px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Batal</button>
                  <button className="bg-brand-blue text-white px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-brand-navy shadow-lg transition-all active:scale-95">Simpan Album</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {isAddingPhoto && (
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
                <h3 className="text-xl font-black text-brand-blue uppercase tracking-tight">Unggah Foto Baru</h3>
                <button onClick={() => { setIsAddingPhoto(false); setSelectedAlbumId(''); setNewPhotoUrl(''); }} className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 text-slate-400 hover:text-brand-blue transition-all">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddPhoto} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pilih Album</label>
                    <select 
                      required 
                      value={selectedAlbumId}
                      onChange={(e) => setSelectedAlbumId(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue shadow-inner"
                    >
                      <option value="">Pilih Album...</option>
                      {albums.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">URL Gambar (Direct Link)</label>
                    <input 
                      required 
                      name="url" 
                      value={newPhotoUrl}
                      onChange={(e) => setNewPhotoUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..." 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue shadow-inner" 
                    />
                    {isGooglePhotosUrl(newPhotoUrl) && (
                      <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl mt-2 text-orange-850 text-[10px] font-semibold tracking-wide leading-relaxed">
                        ⚠️ <strong className="font-extrabold uppercase">Peringatan Tautan Google Photos:</strong><br />
                        Tautan album/halaman sharing Google Photos biasa (<code className="bg-orange-100/60 px-1 rounded">photos.app.goo.gl</code>) tidak dapat dimuat langsung sebagai gambar banner.<br />
                        <span className="font-bold underline mt-1 block">Solusi agar berjalan lancar:</span>
                        1. Buka foto tersebut di browser.<br />
                        2. <strong>Klik kanan pada gambar</strong>, lalu pilih <strong className="text-brand-blue">"Salin Alamat Gambar" (Copy Image Address)</strong>.<br />
                        3. Tempelkan (Paste) alamat hasil salinan tersebut di kolom atas.
                      </div>
                    )}
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">Pastikan URL gambar valid dan bisa diakses publik</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Judul Foto</label>
                    <input name="title" placeholder="Opsional" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue shadow-inner" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deskripsi Foto</label>
                    <input name="description" placeholder="Opsional" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue shadow-inner" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setIsAddingPhoto(false); setSelectedAlbumId(''); setNewPhotoUrl(''); }} className="px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Batal</button>
                  <button disabled={!selectedAlbumId} className="bg-brand-blue text-white px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-brand-navy shadow-lg transition-all active:scale-95 disabled:opacity-50">Unggah Foto</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {editingPhoto && (
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
                <h3 className="text-xl font-black text-brand-blue uppercase tracking-tight">Edit Detail Foto</h3>
                <button onClick={() => setEditingPhoto(null)} className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 text-slate-400 hover:text-brand-blue transition-all">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditPhoto} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pilih Album</label>
                    <select 
                      required 
                      value={editingPhoto.albumId}
                      onChange={(e) => setEditingPhoto({ ...editingPhoto, albumId: e.target.value })}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue shadow-inner"
                    >
                      {albums.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">URL Gambar (Direct Link)</label>
                    <input 
                      required 
                      value={editingPhoto.url || ''}
                      onChange={(e) => setEditingPhoto({ ...editingPhoto, url: e.target.value })}
                      placeholder="https://images.unsplash.com/..." 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue shadow-inner" 
                    />
                    {isGooglePhotosUrl(editingPhoto.url || '') && (
                      <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl mt-2 text-orange-850 text-[10px] font-semibold tracking-wide leading-relaxed">
                        ⚠️ <strong className="font-extrabold uppercase">Peringatan Tautan Google Photos:</strong><br />
                        Tautan album/halaman sharing Google Photos biasa (<code className="bg-orange-100/60 px-1 rounded">photos.app.goo.gl</code>) tidak dapat dimuat langsung sebagai gambar banner.<br />
                        <span className="font-bold underline mt-1 block">Solusi agar berjalan lancar:</span>
                        1. Buka foto tersebut di browser.<br />
                        2. <strong>Klik kanan pada gambar</strong>, lalu pilih <strong className="text-brand-blue">"Salin Alamat Gambar" (Copy Image Address)</strong>.<br />
                        3. Tempelkan (Paste) alamat hasil salinan tersebut di kolom atas.
                      </div>
                    )}
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">Pastikan URL gambar valid dan bisa diakses publik</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Judul Foto</label>
                    <input 
                      value={editingPhoto.title || ''}
                      onChange={(e) => setEditingPhoto({ ...editingPhoto, title: e.target.value })}
                      placeholder="Opsional" 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue shadow-inner" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deskripsi Foto</label>
                    <input 
                      value={editingPhoto.description || ''}
                      onChange={(e) => setEditingPhoto({ ...editingPhoto, description: e.target.value })}
                      placeholder="Opsional" 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-blue shadow-inner" 
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setEditingPhoto(null)} className="px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Batal</button>
                  <button className="bg-brand-blue text-white px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-brand-navy shadow-lg transition-all active:scale-95">Simpan Perubahan</button>
                </div>
              </form>
            </motion.div>
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

        {confirmDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 pb-4 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-500">
                  <Trash2 size={28} />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Konfirmasi Hapus</h3>
                <p className="text-slate-500 text-xs font-semibold mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus {confirmDelete.type === 'album' ? 'album' : 'foto'}{' '}
                  <strong className="text-slate-800">"{confirmDelete.title}"</strong>?
                  {confirmDelete.type === 'album' && ' Semua foto di dalam album ini juga akan dihapus permanen.'}
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
                    if (type === 'album') {
                      await executeDeleteAlbum(id);
                    } else {
                      await executeDeletePhoto(id);
                    }
                  }}
                  className="bg-red-500 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-650 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Ya, Hapus
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
                  {isAdmin && (
                    <button 
                      onClick={() => deleteAlbum(album.id!, album.title)}
                      className="text-slate-200 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
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
                    {isAdmin && (
                      <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPhoto(photo);
                          }}
                          className="bg-white/90 p-2 rounded-xl text-brand-blue hover:bg-brand-blue hover:text-white shadow-lg transition-all"
                          title="Edit Foto"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePhoto(photo.id!, photo.title);
                          }}
                          className="bg-white/90 p-2 rounded-xl text-red-500 hover:bg-red-500 hover:text-white shadow-lg transition-all"
                          title="Hapus Foto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    <ImageWithFallback 
                      src={photo.url} 
                      alt={photo.title || album.title} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
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
              {isAdmin && (
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
          {isAdmin && (
            <button 
              onClick={() => setIsAddingAlbum(true)}
              className="bg-brand-blue text-white px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-brand-navy transition-all active:scale-95 shadow-lg"
            >
              Buat Album Pertama Anda
            </button>
          )}
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
            {isAdmin 
              ? "Gunakan fitur di atas untuk mengelola album foto klub. Pastikan URL gambar yang digunakan adalah tautan langsung yang valid."
              : "Dokumentasi ini dikelola langsung oleh administrator klub untuk memastikan kualitas konten."
            }
          </p>
          {isAdmin && (
            <button 
              onClick={() => setShowGuide(true)}
              className="bg-white text-brand-blue px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-50 transition-all active:scale-95 shadow-xl"
            >
              Panduan Pengelolaan
            </button>
          )}
        </div>
      </section>
    </motion.div>
  );
}


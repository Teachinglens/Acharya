import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Edit2,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  Newspaper,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  EDITORIAL_COVER_PRESETS,
  estimateReadingMinutes,
  formatEditorialDate,
  resolveNewsCoverUrl,
  serializeCoverChoice,
} from '../lib/newsAssets';
import { NEWS_CATEGORIES, NewsCategory, NewsItem } from '../types';

interface Props {
  isAdmin: boolean;
  user: User | null;
  onLogin: () => void;
  initialArticleId?: string | null;
  onClearInitialArticle?: () => void;
}

interface NewsFormState {
  title: string;
  summary: string;
  content: string;
  category: NewsCategory;
  author: string;
  date: string;
  imageUrl: string;
  isFeatured: boolean;
  status: 'published' | 'draft';
}

const getTodayIso = () => new Date().toISOString().split('T')[0];

const EMPTY_FORM = (defaultAuthor?: string): NewsFormState => ({
  title: '',
  summary: '',
  content: '',
  category: 'Prestasi',
  author: defaultAuthor || 'Tim Media Acharya',
  date: getTodayIso(),
  imageUrl: 'preset:championship',
  isFeatured: false,
  status: 'published',
});

const SAMPLE_ARTICLES: Omit<NewsFormState, 'date'>[] = [
  {
    title: 'Atlet Muda Acharya Borong Medali di Kejuaraan Akuatik Kabupaten',
    summary:
      'Kontingen Acharya Swimming Club tampil impresif di lintasan 25M dan 50M dengan catatan waktu terbaik baru di berbagai kelompok umur.',
    content:
      'Pandeglang — Kontingen Acharya Swimming Club kembali menorehkan prestasi membanggakan pada kejuaraan renang tingkat kabupaten akhir pekan ini. Sebanyak 18 atlet turun di nomor gaya bebas, gaya dada, gaya punggung, dan papan latihan mulai dari Kelompok Umur 6 hingga 16.\n\nPelatih kepala menyampaikan bahwa pencapaian ini merupakan buah dari disiplin latihan rutin setiap Kamis, Sabtu, dan Minggu. Sejumlah perenang pemula berhasil menembus rekor pribadi mereka lebih cepat hingga dua detik dibanding evaluasi bulan sebelumnya.\n\nKe depan, tim kepelatihan akan memfokuskan program pada teknik pembalikan (turn), efisiensi tarikan tangan, serta kesiapan mental menghadapi kejuaraan antar-klub tingkat provinsi.',
    category: 'Prestasi',
    author: 'Tim Media Acharya',
    imageUrl: 'preset:community',
    isFeatured: true,
    status: 'published',
  },
  {
    title: 'Penyesuaian Program Latihan Teknik Stroke & Daya Tahan',
    summary:
      'Mulai bulan ini, sesi Kamis dan Sabtu difokuskan pada perbaikan streamline, pernapasan bilateral, dan akselerasi start.',
    content:
      'Untuk menjaga konsistensi perkembangan teknik seluruh anggota klub, tim pelatih Acharya Swimming Club menyusun pembaruan kurikulum latihan mingguan.\n\nPada sesi Kamis sore pukul 15:30 - 17:00, atlet akan mendapat porsi drill teknis yang lebih mendalam sesuai tingkat kemampuan masing-masing. Sementara sesi Sabtu dan Minggu pagi difokuskan pada daya tahan, pace control, serta simulasi perlombaan singkat.\n\nOrang tua dan wali atlet diimbau memastikan kehadiran tepat waktu 15 menit sebelum masuk kolam agar sesi pemanasan darat dapat berjalan optimal.',
    category: 'Latihan',
    author: 'Tim Kepelatihan Acharya',
    imageUrl: 'preset:training',
    isFeatured: false,
    status: 'published',
  },
  {
    title: 'Pendaftaran Anggota Baru & Uji Catatan Waktu Internal',
    summary:
      'Acharya Swimming Club membuka kesempatan bagi perenang muda Pandeglang untuk bergabung dan mengikuti time trial bulanan.',
    content:
      'Acharya Swimming Club resmi membuka pendaftaran anggota baru untuk kelompok usia dini hingga remaja. Program pembinaan dirancang bertahap mulai dari pengenalan air, penguasaan empat gaya dasar, hingga persiapan kompetisi resmi di bawah binaan Akuatik Kab. Pandeglang.\n\nBersamaan dengan itu, seluruh atlet aktif dijadwalkan mengikuti sesi pencatatan waktu internal (Time Trial) pada akhir bulan sebagai tolok ukur pembaruan Best Time klub.\n\nInformasi pendaftaran dapat diakses langsung melalui tautan formulir resmi di halaman Dashboard atau menghubungi pengurus klub di tepi kolam saat jadwal latihan.',
    category: 'Pengumuman',
    author: 'Pengurus Acharya SC',
    imageUrl: 'preset:championship',
    isFeatured: false,
    status: 'published',
  },
];

function NewsImage({
  imageUrl,
  category,
  title,
  className,
}: {
  imageUrl?: string;
  category?: NewsCategory;
  title: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = useMemo(() => resolveNewsCoverUrl(imageUrl, category), [imageUrl, category]);

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  if (failed || !resolvedSrc) {
    return (
      <div
        className={`w-full h-full bg-gradient-to-br from-brand-blue/15 via-slate-100 to-brand-navy/10 flex flex-col items-center justify-center p-6 text-center ${className || ''}`}
      >
        <Newspaper className="w-10 h-10 text-brand-blue/40 mb-2" />
        <span className="text-xs font-serif italic text-brand-navy/70 line-clamp-2 max-w-[240px]">
          {title}
        </span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={title}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export default function News({
  isAdmin,
  user,
  onLogin,
  initialArticleId,
  onClearInitialArticle,
}: Props) {
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | NewsCategory>('Semua');
  const [adminStatusFilter, setAdminStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState<NewsItem | null>(null);

  // Composer state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<NewsFormState>(() => EMPTY_FORM());
  const [submitting, setSubmitting] = useState(false);
  const [seedingSamples, setSeedingSamples] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Confirm delete modal
  const [confirmDelete, setConfirmDelete] = useState<NewsItem | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  useEffect(() => {
    setLoading(true);
    const newsRef = collection(db, 'news');
    const q = isAdmin ? query(newsRef) : query(newsRef, where('status', '==', 'published'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: NewsItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || 'Tanpa Judul',
            summary: data.summary || '',
            content: data.content || '',
            category: (NEWS_CATEGORIES.includes(data.category) ? data.category : 'Pengumuman') as NewsCategory,
            author: data.author || 'Tim Media Acharya',
            date: data.date || '',
            imageUrl: data.imageUrl || '',
            isFeatured: Boolean(data.isFeatured),
            status: data.status === 'draft' ? 'draft' : 'published',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });

        items.sort((a, b) => {
          if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) {
            return a.isFeatured ? -1 : 1;
          }
          const dateCompare = (b.date || '').localeCompare(a.date || '');
          if (dateCompare !== 0) return dateCompare;
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });

        setArticles(items);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'news');
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  // Open article requested externally (e.g. from Dashboard)
  useEffect(() => {
    if (initialArticleId && articles.length > 0) {
      const match = articles.find((a) => a.id === initialArticleId);
      if (match) {
        setActiveArticle(match);
        onClearInitialArticle?.();
      }
    }
  }, [initialArticleId, articles, onClearInitialArticle]);

  // Keep activeArticle synced on live edits
  useEffect(() => {
    if (activeArticle?.id) {
      const updated = articles.find((a) => a.id === activeArticle.id);
      if (updated) setActiveArticle(updated);
    }
  }, [articles, activeArticle?.id]);

  const filteredArticles = useMemo(() => {
    return articles.filter((item) => {
      if (isAdmin && adminStatusFilter !== 'all' && item.status !== adminStatusFilter) {
        return false;
      }
      if (selectedCategory !== 'Semua' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          (item.summary && item.summary.toLowerCase().includes(q)) ||
          item.content.toLowerCase().includes(q) ||
          (item.author && item.author.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [articles, isAdmin, adminStatusFilter, selectedCategory, searchQuery]);

  const publishedCount = useMemo(
    () => articles.filter((a) => a.status === 'published').length,
    [articles]
  );
  const draftCount = useMemo(
    () => articles.filter((a) => a.status === 'draft').length,
    [articles]
  );

  const leadArticle = filteredArticles[0] || null;
  const secondaryArticles = filteredArticles.slice(1, 4);
  const archiveArticles = filteredArticles.slice(4);

  const openCreateModal = () => {
    setEditingId(null);
    setFormState(EMPTY_FORM(user?.displayName || 'Tim Media Acharya'));
    setIsComposerOpen(true);
  };

  const openEditModal = (article: NewsItem) => {
    setEditingId(article.id || null);
    setFormState({
      title: article.title,
      summary: article.summary || '',
      content: article.content,
      category: article.category,
      author: article.author || 'Tim Media Acharya',
      date: article.date || getTodayIso(),
      imageUrl: article.imageUrl || 'preset:championship',
      isFeatured: Boolean(article.isFeatured),
      status: article.status || 'published',
    });
    setIsComposerOpen(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const cleanTitle = formState.title.trim().slice(0, 200);
    const cleanContent = formState.content.trim().slice(0, 20000);
    const autoSummary =
      formState.summary.trim() ||
      cleanContent.replace(/\s+/g, ' ').slice(0, 180) + (cleanContent.length > 180 ? '...' : '');
    const cleanSummary = autoSummary.slice(0, 500);
    const cleanAuthor = (formState.author.trim() || 'Tim Media Acharya').slice(0, 120);
    const cleanDate = (formState.date.trim() || getTodayIso()).slice(0, 50);
    const cleanImageUrl = serializeCoverChoice(formState.imageUrl).slice(0, 2000);

    if (!cleanTitle || !cleanContent) {
      showToast('Judul dan isi berita wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: cleanTitle,
        summary: cleanSummary,
        content: cleanContent,
        category: formState.category,
        author: cleanAuthor,
        date: cleanDate,
        imageUrl: cleanImageUrl,
        isFeatured: Boolean(formState.isFeatured),
        status: formState.status,
      };

      if (editingId) {
        await updateDoc(doc(db, 'news', editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        showToast('Berita berhasil diperbarui.');
      } else {
        await addDoc(collection(db, 'news'), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast(
          formState.status === 'published'
            ? 'Berita baru berhasil diterbitkan.'
            : 'Berita disimpan sebagai draf.'
        );
      }

      setIsComposerOpen(false);
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(
        error,
        editingId ? OperationType.UPDATE : OperationType.CREATE,
        editingId ? `news/${editingId}` : 'news'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickToggleStatus = async (article: NewsItem) => {
    if (!isAdmin || !article.id) return;
    const nextStatus = article.status === 'published' ? 'draft' : 'published';
    try {
      await updateDoc(doc(db, 'news', article.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      showToast(nextStatus === 'published' ? 'Berita diterbitkan.' : 'Berita dipindahkan ke Draf.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `news/${article.id}`);
    }
  };

  const handleQuickToggleFeatured = async (article: NewsItem) => {
    if (!isAdmin || !article.id) return;
    const nextFeatured = !article.isFeatured;
    try {
      await updateDoc(doc(db, 'news', article.id), {
        isFeatured: nextFeatured,
        updatedAt: serverTimestamp(),
      });
      showToast(nextFeatured ? 'Ditandai sebagai Berita Utama.' : 'Dilepas dari Berita Utama.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `news/${article.id}`);
    }
  };

  const handleDeleteArticle = async () => {
    if (!isAdmin || !confirmDelete?.id) return;
    const targetId = confirmDelete.id;
    setConfirmDelete(null);
    try {
      await deleteDoc(doc(db, 'news', targetId));
      if (activeArticle?.id === targetId) {
        setActiveArticle(null);
      }
      showToast('Berita telah dihapus.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `news/${targetId}`);
    }
  };

  const handleSeedSamples = async () => {
    if (!isAdmin) return;
    setSeedingSamples(true);
    try {
      const today = new Date();
      await Promise.all(
        SAMPLE_ARTICLES.map((sample, idx) => {
          const d = new Date(today);
          d.setDate(today.getDate() - idx * 3);
          const isoDate = d.toISOString().split('T')[0];
          return addDoc(collection(db, 'news'), {
            ...sample,
            date: isoDate,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        })
      );
      showToast('3 contoh berita klub berhasil dimuat.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'news');
    } finally {
      setSeedingSamples(false);
    }
  };

  const handleShareArticle = async (article: NewsItem) => {
    const shareText = `${article.title} — Acharya Swimming Club\n${article.summary || ''}`;
    try {
      await navigator.clipboard.writeText(shareText);
      if (article.id) {
        setCopiedId(article.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
      showToast('Ringkasan berita disalin ke clipboard.');
    } catch {
      showToast('Salin teks gagal.');
    }
  };

  // Render Article Reader View
  if (activeArticle) {
    const paragraphs = activeArticle.content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    const relatedArticles = articles
      .filter((a) => a.id !== activeArticle.id && (isAdmin || a.status === 'published'))
      .slice(0, 3);

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto w-full pb-16"
      >
        {/* Reader Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-200">
          <button
            onClick={() => setActiveArticle(null)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-blue transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            Kembali ke Daftar Berita
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleShareArticle(activeArticle)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {copiedId === activeArticle.id ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
              {copiedId === activeArticle.id ? 'Tersalin' : 'Bagikan'}
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => openEditModal(activeArticle)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-navy transition-colors cursor-pointer"
                >
                  <Edit2 size={14} />
                  Edit Berita
                </button>
                <button
                  onClick={() => setConfirmDelete(activeArticle)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                  title="Hapus Berita"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Article Header */}
        <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-8 md:p-12 pb-8 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-4">
              <span className="text-brand-blue font-semibold">{activeArticle.category}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formatEditorialDate(activeArticle.date)}</span>
              <span aria-hidden="true">·</span>
              <span>{estimateReadingMinutes(activeArticle.content)} menit baca</span>
              {activeArticle.author && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Oleh {activeArticle.author}</span>
                </>
              )}
              {isAdmin && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className={activeArticle.status === 'draft' ? 'text-amber-600 font-semibold' : 'text-emerald-700 font-semibold'}>
                    {activeArticle.status === 'draft' ? 'Draf (Hanya Admin)' : 'Terbit'}
                  </span>
                </>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-serif font-semibold text-slate-900 leading-tight mb-5 text-balance">
              {activeArticle.title}
            </h1>

            {activeArticle.summary && (
              <p className="text-lg text-slate-600 font-serif italic leading-relaxed max-w-3xl">
                {activeArticle.summary}
              </p>
            )}
          </div>

          {/* Hero Figure */}
          <figure className="bg-slate-100">
            <div className="aspect-[16/9] max-h-[480px] w-full overflow-hidden">
              <NewsImage
                imageUrl={activeArticle.imageUrl}
                category={activeArticle.category}
                title={activeArticle.title}
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="px-8 md:px-12 py-3 text-xs font-serif italic text-slate-500 border-b border-slate-100 bg-slate-50/60">
              Dokumentasi {activeArticle.category} · Acharya Swimming Club Pandeglang
            </figcaption>
          </figure>

          {/* Reading Column */}
          <div className="p-8 md:p-12">
            <div className="max-w-2xl mx-auto space-y-6 text-base text-slate-700 leading-[1.8]">
              {paragraphs.map((para, idx) => (
                <p
                  key={idx}
                  className={
                    idx === 0
                      ? 'first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-brand-blue first-letter:leading-none'
                      : ''
                  }
                >
                  {para}
                </p>
              ))}
            </div>
          </div>
        </article>

        {/* Related / Other Articles */}
        {relatedArticles.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-serif font-semibold text-slate-900 mb-6">
              Berita Lainnya dari Klub
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((rel) => (
                <button
                  key={rel.id}
                  onClick={() => {
                    setActiveArticle(rel);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-brand-blue/40 hover:shadow-sm transition-all flex flex-col cursor-pointer group"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                    <NewsImage
                      imageUrl={rel.imageUrl}
                      category={rel.category}
                      title={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      <span className="font-semibold text-brand-blue">{rel.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatEditorialDate(rel.date)}</span>
                    </div>
                    <h3 className="text-base font-serif font-semibold text-slate-900 group-hover:text-brand-blue transition-colors line-clamp-2">
                      {rel.title}
                    </h3>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Render Modals if opened from reader view */}
        {renderModals()}
      </motion.div>
    );
  }

  function renderModals() {
    return (
      <AnimatePresence>
        {isComposerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div>
                  <h3 className="text-lg font-serif font-semibold text-slate-900">
                    {editingId ? 'Edit Berita Klub' : 'Tulis Berita Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Publikasikan informasi kejuaraan, pengumuman latihan, atau prestasi atlet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                  aria-label="Tutup"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveArticle} className="overflow-y-auto p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Judul Berita
                    </label>
                    <input
                      required
                      maxLength={200}
                      value={formState.title}
                      onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                      placeholder="Contoh: Kontingen Acharya Raih 6 Medali di Kejuaraan Provinsi"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-brand-blue focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Kategori
                    </label>
                    <select
                      value={formState.category}
                      onChange={(e) =>
                        setFormState({ ...formState, category: e.target.value as NewsCategory })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-brand-blue focus:bg-white transition-colors"
                    >
                      {NEWS_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Status Publikasi
                    </label>
                    <select
                      value={formState.status}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          status: e.target.value as 'published' | 'draft',
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-brand-blue focus:bg-white transition-colors"
                    >
                      <option value="published">Terbitkan Langsung (Published)</option>
                      <option value="draft">Simpan sebagai Draf (Draft)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Tanggal Berita
                    </label>
                    <input
                      type="date"
                      required
                      value={formState.date}
                      onChange={(e) => setFormState({ ...formState, date: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-brand-blue focus:bg-white transition-colors tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Penulis / Sumber
                    </label>
                    <input
                      maxLength={120}
                      value={formState.author}
                      onChange={(e) => setFormState({ ...formState, author: e.target.value })}
                      placeholder="Tim Media Acharya"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-brand-blue focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Cover Image Picker */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700">
                    Gambar Sampul (Pilih Preset atau Masukkan URL Gambar)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {EDITORIAL_COVER_PRESETS.map((preset) => {
                      const presetKey = serializeCoverChoice(preset.src);
                      const isSelected =
                        formState.imageUrl === presetKey || formState.imageUrl === preset.src;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setFormState({ ...formState, imageUrl: presetKey })}
                          className={`group text-left rounded-xl overflow-hidden border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-brand-blue ring-2 ring-brand-blue/20'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                            <img
                              src={preset.src}
                              alt={preset.label}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-700 truncate bg-white">
                            {preset.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="md:col-span-2">
                      <input
                        maxLength={2000}
                        value={formState.imageUrl}
                        onChange={(e) => setFormState({ ...formState, imageUrl: e.target.value })}
                        placeholder="https://... atau tautan Google Drive publik"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-brand-blue focus:bg-white transition-colors"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Mendukung preset di atas, URL gambar langsung, atau tautan berbagi Google Drive.
                      </p>
                    </div>
                    <div className="aspect-[16/10] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                      <NewsImage
                        imageUrl={formState.imageUrl}
                        category={formState.category}
                        title={formState.title || 'Pratinjau Gambar'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ringkasan Singkat (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={formState.summary}
                    onChange={(e) => setFormState({ ...formState, summary: e.target.value })}
                    placeholder="Ringkasan 1-2 kalimat untuk tampilan kartu berita (otomatis diambil dari isi berita jika dikosongkan)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-brand-blue focus:bg-white transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Isi Berita Lengkap
                  </label>
                  <textarea
                    required
                    rows={7}
                    maxLength={20000}
                    value={formState.content}
                    onChange={(e) => setFormState({ ...formState, content: e.target.value })}
                    placeholder="Tulis berita lengkap di sini. Gunakan baris kosong (Enter 2x) untuk memisahkan paragraf."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 leading-relaxed outline-none focus:border-brand-blue focus:bg-white transition-colors"
                  />
                </div>

                <label className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.isFeatured}
                    onChange={(e) => setFormState({ ...formState, isFeatured: e.target.checked })}
                    className="w-4 h-4 accent-brand-blue rounded"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">
                      Jadikan Berita Utama (Lead Story)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Berita utama tampil paling besar di posisi teratas halaman News.
                    </div>
                  </div>
                </label>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen(false)}
                    className="px-5 py-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold text-white bg-brand-blue hover:bg-brand-navy transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    {editingId
                      ? 'Simpan Perubahan'
                      : formState.status === 'published'
                        ? 'Terbitkan Berita'
                        : 'Simpan Draf'}
                  </button>
                </div>
              </form>
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={22} />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Hapus Berita?</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Artikel <strong className="text-slate-800">"{confirmDelete.title}"</strong> akan
                  dihapus permanen dan tidak dapat dipulihkan.
                </p>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteArticle}
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  function renderAdminCardControls(article: NewsItem) {
    if (!isAdmin) return null;
    return (
      <div
        className="flex flex-wrap items-center gap-1.5 pt-3 mt-3 border-t border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => openEditModal(article)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-brand-blue hover:text-white transition-colors cursor-pointer"
        >
          <Edit2 size={12} /> Edit
        </button>
        <button
          type="button"
          onClick={() => handleQuickToggleFeatured(article)}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
            article.isFeatured
              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Star size={12} /> {article.isFeatured ? 'Utama' : 'Jadikan Utama'}
        </button>
        <button
          type="button"
          onClick={() => handleQuickToggleStatus(article)}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
            article.status === 'published'
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          {article.status === 'published' ? <Eye size={12} /> : <EyeOff size={12} />}
          {article.status === 'published' ? 'Tayang' : 'Terbitkan'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(article)}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors ml-auto cursor-pointer"
          title="Hapus"
        >
          <Trash2 size={12} />
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto w-full flex flex-col gap-8 pb-16"
    >
      {/* Feedback Toast */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-6 right-6 z-[120] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2"
          >
            <Check size={14} className="text-emerald-400" />
            {feedbackToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Quick Access Banner / Toolbar */}
      {isAdmin ? (
        <div className="bg-brand-blue text-white rounded-2xl p-5 md:px-7 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div className="flex items-start md:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold">Mode Redaksi Admin Aktif</div>
              <div className="text-xs text-white/80 mt-0.5 tabular-nums">
                {publishedCount} berita tayang · {draftCount} draf tersimpan
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-white/10 rounded-lg">
              {(
                [
                  { id: 'all', label: `Semua (${articles.length})` },
                  { id: 'published', label: `Tayang (${publishedCount})` },
                  { id: 'draft', label: `Draf (${draftCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAdminStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    adminStatusFilter === tab.id
                      ? 'bg-white text-brand-blue shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 bg-white text-brand-blue px-4 py-2 rounded-lg text-xs font-bold hover:bg-brand-light transition-colors whitespace-nowrap cursor-pointer shadow-sm"
            >
              <Plus size={15} />
              Tulis Berita Baru
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            {user ? (
              <span>
                Masuk sebagai <strong className="text-slate-900">{user.email}</strong> (mode pembaca).
              </span>
            ) : (
              <span>Menampilkan kabar resmi & informasi kegiatan Acharya Swimming Club.</span>
            )}
          </div>
          <button
            onClick={onLogin}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-brand-blue bg-brand-light hover:bg-blue-100 transition-colors whitespace-nowrap cursor-pointer"
          >
            <LogIn size={14} />
            {user ? 'Ganti Akun Admin' : 'Masuk Admin untuk Kelola Berita'}
          </button>
        </div>
      )}

      {/* Editorial Masthead */}
      <header className="border-b border-slate-200 pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue mb-2">
            Warta & Jurnal · Acharya Swimming Club
          </p>
          <h1 className="text-3xl md:text-5xl font-serif font-semibold text-slate-900 leading-tight text-balance">
            Kabar Prestasi & Pengumuman Klub
          </h1>
          <p className="text-sm md:text-base text-slate-600 mt-3 leading-relaxed">
            Liputan kejuaraan, catatan perkembangan atlet, pembaruan jadwal latihan, serta informasi
            penting untuk seluruh keluarga besar Acharya Swimming Club.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
          <div className="relative w-full sm:w-64 lg:w-72">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berita atau pengumuman..."
              className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-brand-blue transition-colors"
            />
          </div>
        </div>
      </header>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(['Semua', ...NEWS_CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-brand-blue text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="animate-spin text-brand-blue" size={24} />
          <span className="text-xs font-medium">Memuat kabar terbaru...</span>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 md:p-16 text-center max-w-2xl mx-auto w-full">
          <div className="w-14 h-14 rounded-2xl bg-brand-light text-brand-blue flex items-center justify-center mx-auto mb-5">
            <Newspaper size={26} />
          </div>
          <h2 className="text-xl font-serif font-semibold text-slate-900 mb-2">
            {articles.length === 0 ? 'Belum Ada Berita Diterbitkan' : 'Berita Tidak Ditemukan'}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-7">
            {articles.length === 0
              ? isAdmin
                ? 'Mulai publikasikan berita pertama klub atau muat 3 contoh berita siap edit untuk mengisi halaman ini.'
                : 'Pengurus klub belum menerbitkan berita baru. Silakan login sebagai admin untuk mulai menulis berita.'
              : 'Coba ubah kata kunci pencarian atau pilih kategori lain.'}
          </p>

          {articles.length === 0 && isAdmin && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 bg-brand-blue text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-brand-navy transition-colors cursor-pointer"
              >
                <Plus size={15} />
                Tulis Berita Pertama
              </button>
              <button
                onClick={handleSeedSamples}
                disabled={seedingSamples}
                className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {seedingSamples ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
                Muat 3 Contoh Berita Klub
              </button>
            </div>
          )}

          {articles.length === 0 && !isAdmin && (
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 bg-brand-blue text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-brand-navy transition-colors cursor-pointer"
            >
              <LogIn size={14} />
              Login Admin untuk Menulis Berita
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Tier 1: Lead Story */}
          {leadArticle && (
            <section>
              <article
                onClick={() => setActiveArticle(leadArticle)}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch hover:border-brand-blue/40 transition-colors cursor-pointer group"
              >
                <div className="lg:col-span-7 relative bg-slate-100 min-h-[260px] lg:min-h-[380px] overflow-hidden">
                  <NewsImage
                    imageUrl={leadArticle.imageUrl}
                    category={leadArticle.category}
                    title={leadArticle.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  />
                </div>

                <div className="lg:col-span-5 p-7 md:p-10 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-4">
                      <span className="font-semibold text-brand-blue">{leadArticle.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatEditorialDate(leadArticle.date)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{estimateReadingMinutes(leadArticle.content)} menit baca</span>
                      {isAdmin && leadArticle.status === 'draft' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-600 font-semibold">Draf</span>
                        </>
                      )}
                    </div>

                    <h2 className="text-2xl md:text-3xl font-serif font-semibold text-slate-900 leading-snug mb-4 group-hover:text-brand-blue transition-colors text-balance">
                      {leadArticle.title}
                    </h2>

                    <p className="text-sm md:text-base text-slate-600 leading-relaxed line-clamp-4">
                      {leadArticle.summary || leadArticle.content}
                    </p>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Oleh {leadArticle.author || 'Tim Media Acharya'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-brand-blue group-hover:translate-x-0.5 transition-transform">
                        Baca Selengkapnya <ArrowRight size={14} />
                      </span>
                    </div>
                    {renderAdminCardControls(leadArticle)}
                  </div>
                </div>
              </article>
            </section>
          )}

          {/* Tier 2: Secondary Features */}
          {secondaryArticles.length > 0 && (
            <section>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
                <h2 className="text-lg font-serif font-semibold text-slate-900">Pilihan Redaksi</h2>
                <span className="text-xs text-slate-500 tabular-nums">
                  {secondaryArticles.length} artikel pilihan
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {secondaryArticles.map((article) => (
                  <article
                    key={article.id}
                    onClick={() => setActiveArticle(article)}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:border-brand-blue/40 transition-colors cursor-pointer group"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      <NewsImage
                        imageUrl={article.imageUrl}
                        category={article.category}
                        title={article.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2.5">
                          <span className="font-semibold text-brand-blue">{article.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{formatEditorialDate(article.date)}</span>
                          {isAdmin && article.status === 'draft' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-600 font-semibold">Draf</span>
                            </>
                          )}
                        </div>

                        <h3 className="text-xl font-serif font-semibold text-slate-900 leading-snug mb-2.5 group-hover:text-brand-blue transition-colors line-clamp-2 text-balance">
                          {article.title}
                        </h3>

                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                          {article.summary || article.content}
                        </p>
                      </div>

                      <div className="mt-5">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{estimateReadingMinutes(article.content)} menit baca</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-brand-blue">
                            Baca <ArrowRight size={13} />
                          </span>
                        </div>
                        {renderAdminCardControls(article)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Tier 3: Archive List */}
          {archiveArticles.length > 0 && (
            <section>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <h2 className="text-lg font-serif font-semibold text-slate-900">Arsip Kabar Klub</h2>
                <span className="text-xs text-slate-500 tabular-nums">
                  {archiveArticles.length} artikel lainnya
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                {archiveArticles.map((article, idx) => (
                  <div
                    key={article.id}
                    onClick={() => setActiveArticle(article)}
                    className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <span className="text-sm font-serif font-semibold text-slate-400 tabular-nums pt-0.5 shrink-0">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                          <span className="font-semibold text-brand-blue">{article.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{formatEditorialDate(article.date)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{estimateReadingMinutes(article.content)} menit baca</span>
                          {isAdmin && article.status === 'draft' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-600 font-semibold">Draf</span>
                            </>
                          )}
                        </div>
                        <h3 className="text-base font-serif font-semibold text-slate-900 group-hover:text-brand-blue transition-colors truncate">
                          {article.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                          {article.summary || article.content}
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(article)}
                            className="p-2 rounded-lg text-slate-500 hover:text-brand-blue hover:bg-brand-light transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickToggleStatus(article)}
                            className="p-2 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title={article.status === 'published' ? 'Ubah ke Draf' : 'Terbitkan'}
                          >
                            {article.status === 'published' ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(article)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveArticle(article)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-blue hover:bg-brand-light transition-colors cursor-pointer"
                      >
                        Baca <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {renderModals()}
    </motion.div>
  );
}

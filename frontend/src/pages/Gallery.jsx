import { useState, useCallback } from 'react';
import { usePhotos } from '../hooks/usePhotos';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { photosAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import PhotoCard from '../components/PhotoCard';
import PhotoModal from '../components/PhotoModal';
import SkeletonGrid from '../components/SkeletonGrid';
import toast from 'react-hot-toast';

const Gallery = () => {
  const { photos, loading, initialLoading, hasMore, error, loadMore, refresh, removePhoto } = usePhotos();
  const { isAuth } = useAuth();
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  // Infinite scroll sentinel
  const sentinelRef = useIntersectionObserver(useCallback(() => {
    if (!searchResults) loadMore();
  }, [loadMore, searchResults]));

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const { data } = await photosAPI.search(q);
      setSearchResults(data.data);
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const handleDelete = async (id) => {
    try {
      await photosAPI.delete(id);
      removePhoto(id);
      if (searchResults) setSearchResults(prev => prev.filter(p => p._id !== id));
      toast.success('Photo deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const displayPhotos = searchResults || photos;
  const openModal = (photo) => {
    const idx = displayPhotos.findIndex(p => p._id === photo._id);
    setSelectedIdx(idx);
  };

  return (
    <div className="min-h-screen">
      {/* Keyframe animation injections */}
      <style>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.12; }
          50% { transform: translateY(-28px) scale(1.08); opacity: 0.22; }
        }
        @keyframes floatX {
          0%, 100% { transform: translateX(0px) scale(1); opacity: 0.08; }
          50% { transform: translateX(20px) scale(1.05); opacity: 0.16; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(20deg); }
        }
        @keyframes shimmerText {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(244, 185, 66, 0.25); }
          70% { box-shadow: 0 0 0 12px rgba(244, 185, 66, 0); }
          100% { box-shadow: 0 0 0 0 rgba(244, 185, 66, 0); }
        }
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(244, 185, 66, 0.35); }
          50% { border-color: rgba(244, 185, 66, 0.8); }
        }
        @keyframes cardEntrance {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes scanLine {
          0%   { top: 0%; opacity: 0.18; }
          50%  { opacity: 0.08; }
          100% { top: 100%; opacity: 0.18; }
        }
        @keyframes orbitSpin {
          from { transform: rotate(0deg) translateX(38px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(38px) rotate(-360deg); }
        }
        .shimmer-gold {
          background: linear-gradient(90deg, #F4B942 0%, #ffe68a 40%, #F4B942 60%, #c88b10 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerText 3.5s linear infinite;
        }
        .search-focus-glow:focus-within {
          animation: borderGlow 1.8s ease-in-out infinite;
        }
        .photo-card-animate {
          animation: cardEntrance 0.45s ease both;
        }
        .search-btn-pulse {
          animation: pulseRing 2.2s ease-in-out infinite;
        }
      `}</style>

      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Dot grid background */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #F4B942 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {/* Animated floating orbs */}
        <div className="absolute top-8 left-1/4 w-72 h-72 bg-gold-500/10 rounded-full pointer-events-none"
          style={{ animation: 'floatY 7s ease-in-out infinite' }} />
        <div className="absolute top-12 right-1/4 w-48 h-48 bg-gold-400/8 rounded-full pointer-events-none"
          style={{ animation: 'floatY 9s ease-in-out infinite 1.5s' }} />
        <div className="absolute bottom-4 left-1/3 w-36 h-36 bg-gold-300/6 rounded-full pointer-events-none"
          style={{ animation: 'floatX 11s ease-in-out infinite 0.8s' }} />

        {/* Scan line effect */}
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-gold-400/30 to-transparent pointer-events-none"
          style={{ animation: 'scanLine 6s linear infinite' }} />

        {/* Twinkle stars */}
        {[
          { top: '18%', left: '12%', delay: '0s', size: 5 },
          { top: '30%', right: '10%', delay: '0.8s', size: 4 },
          { top: '60%', left: '7%', delay: '1.6s', size: 6 },
          { top: '15%', right: '18%', delay: '2.2s', size: 3 },
          { top: '72%', right: '14%', delay: '0.4s', size: 5 },
        ].map((s, i) => (
          <div key={i} className="absolute pointer-events-none"
            style={{ top: s.top, left: s.left, right: s.right,
              animation: `twinkle ${2.5 + i * 0.4}s ease-in-out infinite ${s.delay}` }}>
            <svg width={s.size * 2} height={s.size * 2} viewBox="0 0 10 10">
              <polygon points="5,0 6,4 10,5 6,6 5,10 4,6 0,5 4,4"
                fill="#F4B942" opacity="0.7" />
            </svg>
          </div>
        ))}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">

          {/* Animated badge */}
          <div className="inline-flex items-center gap-2 mb-4 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500" />
            </span>
            <p className="text-gold-500 text-xs font-mono tracking-[0.3em] uppercase">
              SASI INSTITUTE OF TECHNOLOGY AND ENGINEERING
            </p>
          </div>

          {/* Headline with shimmer */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-3 animate-slide-up">
            ECE Farewell
            <span className="block shimmer-gold">Photo Booth</span>
          </h1>

          <p className="text-dark-400 text-base sm:text-lg max-w-md mx-auto mb-8 animate-slide-up animate-delay-100">
            Find your memories. Download &amp; share with friends forever.
          </p>

          {/* Search bar with glow border */}
          <form onSubmit={handleSearch}
            className="flex gap-2 max-w-md mx-auto animate-slide-up animate-delay-200 search-focus-glow"
            style={{ borderRadius: '0.75rem' }}>
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by photo number (e.g. ECE001)"
                className="w-full bg-dark-700 border border-dark-500 focus:border-gold-500 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-dark-400 outline-none transition-colors font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-3 rounded-xl bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-dark-900 font-semibold text-sm transition-all whitespace-nowrap search-btn-pulse"
            >
              {searching ? '...' : 'Search'}
            </button>
            {searchResults && (
              <button type="button" onClick={clearSearch} className="px-4 py-3 rounded-xl bg-dark-600 hover:bg-dark-500 text-white text-sm transition-all">
                Clear
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Gallery content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Stats / search results header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            {searchResults ? (
              <p className="text-dark-400 text-sm">
                Found <span className="text-gold-400 font-semibold">{searchResults.length}</span> result{searchResults.length !== 1 ? 's' : ''} for <span className="font-mono text-white">"{searchQuery}"</span>
              </p>
            ) : (
              <p className="text-dark-400 text-sm">
                <span className="text-gold-400 font-semibold">{photos.length}</span> photos loaded
              </p>
            )}
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-dark-400 hover:text-white hover:bg-dark-600 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="text-center py-16">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={refresh} className="px-6 py-2 rounded-lg bg-gold-500 text-dark-900 font-semibold text-sm">Try Again</button>
          </div>
        )}

        {/* Initial loading */}
        {initialLoading && <SkeletonGrid count={12} />}

        {/* Empty state */}
        {!initialLoading && displayPhotos.length === 0 && !error && (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-dark-700 border border-dark-500 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-dark-400 text-lg font-display">No photos yet</p>
            <p className="text-dark-500 text-sm mt-1">Photos will appear here once uploaded by admin</p>
          </div>
        )}

        {/* Photo grid — staggered entrance animation */}
        {!initialLoading && displayPhotos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {displayPhotos.map((photo, index) => (
              <div
                key={photo._id}
                className="photo-card-animate"
                style={{ animationDelay: `${Math.min(index * 40, 600)}ms` }}
              >
                <PhotoCard
                  photo={photo}
                  onDelete={handleDelete}
                  isAdmin={isAuth}
                  onClick={openModal}
                />
              </div>
            ))}
          </div>
        )}

        {/* Load more sentinel */}
        {!searchResults && (
          <div ref={sentinelRef} className="py-8 flex justify-center">
            {loading && !initialLoading && (
              <div className="flex items-center gap-2 text-dark-400 text-sm">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading more...
              </div>
            )}
            {!hasMore && photos.length > 0 && !loading && (
              <p className="text-dark-500 text-xs font-mono">— All {photos.length} photos loaded —</p>
            )}
          </div>
        )}
      </div>

      {/* Lightbox modal */}
      {selectedIdx !== null && displayPhotos[selectedIdx] && (
        <PhotoModal
          photo={displayPhotos[selectedIdx]}
          onClose={() => setSelectedIdx(null)}
          onPrev={() => setSelectedIdx(i => i - 1)}
          onNext={() => setSelectedIdx(i => i + 1)}
          hasPrev={selectedIdx > 0}
          hasNext={selectedIdx < displayPhotos.length - 1}
        />
      )}
    </div>
  );
};

export default Gallery;

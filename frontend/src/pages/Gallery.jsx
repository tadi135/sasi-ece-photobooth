import { useState, useCallback, useEffect } from 'react';
import { usePhotos } from '../hooks/usePhotos';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { photosAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import PhotoCard from '../components/PhotoCard';
import PhotoModal from '../components/PhotoModal';
import SkeletonGrid from '../components/SkeletonGrid';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENT CONFIG — edit these three lines to update the popup
//   ANNOUNCEMENT_ENABLED : true  = show popup | false = hide popup
//   ANNOUNCEMENT_TYPE    : 'image' | 'video'
//   ANNOUNCEMENT_URL     : path to file in /public  e.g. '/notice.jpg' or '/farewell.mp4'
// ─────────────────────────────────────────────────────────────────────────────
const ANNOUNCEMENT_ENABLED = true;
const ANNOUNCEMENT_TYPE    = 'image';       // change to 'video' for a video popup
const ANNOUNCEMENT_URL     = '/announcement.jpg'; // place file in your /public folder
// ─────────────────────────────────────────────────────────────────────────────

// Place the college banner image at /public/banner.png
const BANNER_SRC = '/banner.png';

/* ── Announcement Modal ─────────────────────────────────────────────────── */
const AnnouncementModal = ({ onClose }) => (
  <>
    <style>{`
      @keyframes modalIn {
        from { opacity:0; transform:scale(0.90) translateY(20px); }
        to   { opacity:1; transform:scale(1)    translateY(0);    }
      }
      @keyframes bdIn { from{opacity:0} to{opacity:1} }
      .ann-bd   { animation:bdIn    0.25s ease both; }
      .ann-card { animation:modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
    `}</style>

    <div
      className="ann-bd fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor:'rgba(0,0,0,0.78)', backdropFilter:'blur(5px)' }}
      onClick={onClose}
    >
      <div
        className="ann-card relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background:'#fff', border:'3px solid #CC0000' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ background:'linear-gradient(135deg,#CC0000 0%,#8B0000 100%)' }}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400" />
            </span>
            <p className="text-white font-semibold text-sm tracking-widest uppercase">
              📢 Announcement
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close announcement"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{ background:'rgba(255,255,255,0.18)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.35)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.18)'}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Media */}
        <div className="relative bg-black flex items-center justify-center"
          style={{ maxHeight:'68vh' }}>
          {ANNOUNCEMENT_TYPE === 'video' ? (
            <video
              src={ANNOUNCEMENT_URL}
              controls autoPlay
              className="w-full"
              style={{ maxHeight:'65vh', display:'block' }}
            />
          ) : (
            <img
              src={ANNOUNCEMENT_URL}
              alt="Announcement"
              className="w-full object-contain"
              style={{ maxHeight:'65vh', display:'block', margin:'0 auto' }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ background:'#f7f7f7', borderTop:'1px solid #eee' }}>
          <p className="text-xs font-medium" style={{ color:'#1B3A8C' }}>
            SASI Institute of Technology &amp; Engineering · ECE Farewell 2026
          </p>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg text-white text-xs font-semibold transition-all"
            style={{ background:'#CC0000' }}
            onMouseEnter={e => e.currentTarget.style.background='#a30000'}
            onMouseLeave={e => e.currentTarget.style.background='#CC0000'}
          >
            ✕ Close
          </button>
        </div>
      </div>
    </div>
  </>
);

/* ── Gallery Page ───────────────────────────────────────────────────────── */
const Gallery = () => {
  const { photos, loading, initialLoading, hasMore, error, loadMore, refresh, removePhoto } = usePhotos();
  const { isAuth } = useAuth();
  const [selectedIdx, setSelectedIdx]           = useState(null);
  const [searchQuery, setSearchQuery]           = useState('');
  const [searchResults, setSearchResults]       = useState(null);
  const [searching, setSearching]               = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  useEffect(() => {
    if (ANNOUNCEMENT_ENABLED) {
      const t = setTimeout(() => setShowAnnouncement(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

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

  const clearSearch = () => { setSearchQuery(''); setSearchResults(null); };

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
  const openModal     = (photo) => {
    const idx = displayPhotos.findIndex(p => p._id === photo._id);
    setSelectedIdx(idx);
  };

  return (
    <div className="min-h-screen">

      {/* Keyframes */}
      <style>{`
        @keyframes floatY {
          0%,100%{transform:translateY(0) scale(1);opacity:.08;}
          50%{transform:translateY(-22px) scale(1.06);opacity:.16;}
        }
        @keyframes twinkle {
          0%,100%{opacity:0;transform:scale(.5) rotate(0deg);}
          50%{opacity:1;transform:scale(1.2) rotate(20deg);}
        }
        @keyframes shimmerRed {
          0%{background-position:-200% center;}
          100%{background-position:200% center;}
        }
        @keyframes scanLine {
          0%{top:0%;opacity:.18;} 100%{top:100%;opacity:.1;}
        }
        @keyframes pulseRed {
          0%{box-shadow:0 0 0 0 rgba(204,0,0,.35);}
          70%{box-shadow:0 0 0 10px rgba(204,0,0,0);}
          100%{box-shadow:0 0 0 0 rgba(204,0,0,0);}
        }
        @keyframes cardIn {
          from{opacity:0;transform:translateY(18px) scale(.96);}
          to{opacity:1;transform:translateY(0) scale(1);}
        }
        @keyframes bannerSlide {
          from{opacity:0;transform:translateY(-10px);}
          to{opacity:1;transform:translateY(0);}
        }
        .shimmer-red{
          background:linear-gradient(90deg,#CC0000 0%,#ff7b7b 40%,#CC0000 60%,#8B0000 100%);
          background-size:200% auto;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          animation:shimmerRed 3.5s linear infinite;
        }
        .banner-anim{animation:bannerSlide .6s cubic-bezier(.22,1,.36,1) both;}
        .card-anim{animation:cardIn .45s ease both;}
        .btn-pulse{animation:pulseRed 2.2s ease-in-out infinite;}
      `}</style>

      {/* ── College Banner ─────────────────────────────────────────────── */}
      <header className="banner-anim w-full"
        style={{ background:'#fff', borderBottom:'3px solid #CC0000',
          boxShadow:'0 2px 14px rgba(204,0,0,0.18)' }}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <img
            src={BANNER_SRC}
            alt="SASI Institute of Technology and Engineering – Dept. of ECE"
            className="w-full object-contain"
            style={{ maxHeight:'110px', display:'block' }}
            onError={e => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage:'radial-gradient(circle at 2px 2px,#CC0000 1px,transparent 0)',
            backgroundSize:'32px 32px' }} />

        {/* Orbs */}
        <div className="absolute top-8 left-1/4 w-72 h-72 rounded-full pointer-events-none"
          style={{ background:'rgba(204,0,0,0.07)', animation:'floatY 7s ease-in-out infinite' }} />
        <div className="absolute top-12 right-1/4 w-48 h-48 rounded-full pointer-events-none"
          style={{ background:'rgba(27,58,140,0.06)', animation:'floatY 9s ease-in-out infinite 1.5s' }} />

        {/* Scan line */}
        <div className="absolute inset-x-0 h-px pointer-events-none"
          style={{ background:'linear-gradient(90deg,transparent,rgba(204,0,0,0.3),transparent)',
            animation:'scanLine 6s linear infinite' }} />

        {/* Twinkle stars */}
        {[
          {top:'20%',left:'10%',delay:'0s',size:5},
          {top:'35%',right:'9%',delay:'0.9s',size:4},
          {top:'65%',left:'6%',delay:'1.7s',size:6},
          {top:'18%',right:'17%',delay:'2.3s',size:3},
        ].map((s, i) => (
          <div key={i} className="absolute pointer-events-none"
            style={{top:s.top,left:s.left,right:s.right,
              animation:`twinkle ${2.5+i*0.4}s ease-in-out infinite ${s.delay}`}}>
            <svg width={s.size*2} height={s.size*2} viewBox="0 0 10 10">
              <polygon points="5,0 6,4 10,5 6,6 5,10 4,6 0,5 4,4" fill="#CC0000" opacity="0.6" />
            </svg>
          </div>
        ))}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          {/* Live dot + dept label */}
          <div className="inline-flex items-center gap-2 mb-4 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{background:'#CC0000'}} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{background:'#CC0000'}} />
            </span>
            <p className="text-xs font-mono tracking-[0.25em] uppercase" style={{color:'#CC0000'}}>
              Department of Electronics &amp; Communication Engineering
            </p>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-3 animate-slide-up">
            ECE Farewell
            <span className="block shimmer-red">Photo Booth</span>
          </h1>

          <p className="text-dark-400 text-base sm:text-lg max-w-md mx-auto mb-8 animate-slide-up">
            Find your memories. Download &amp; share with friends forever.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto animate-slide-up">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by photo number (e.g. ECE001)"
                className="w-full bg-dark-700 border border-dark-500 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-dark-400 outline-none transition-colors font-mono"
                onFocus={e => e.target.style.borderColor='#CC0000'}
                onBlur={e  => e.target.style.borderColor=''}
              />
            </div>
            <button
              type="submit" disabled={searching}
              className="px-5 py-3 rounded-xl text-white font-semibold text-sm transition-all whitespace-nowrap btn-pulse"
              style={{background: searching ? '#666' : '#CC0000'}}
              onMouseEnter={e => { if(!searching) e.currentTarget.style.background='#a30000'; }}
              onMouseLeave={e => { if(!searching) e.currentTarget.style.background='#CC0000'; }}
            >
              {searching ? '...' : 'Search'}
            </button>
            {searchResults && (
              <button type="button" onClick={clearSearch}
                className="px-4 py-3 rounded-xl bg-dark-600 hover:bg-dark-500 text-white text-sm transition-all">
                Clear
              </button>
            )}
          </form>
        </div>
      </div>

      {/* ── Gallery content ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        <div className="flex items-center justify-between mb-6">
          <div>
            {searchResults ? (
              <p className="text-dark-400 text-sm">
                Found <span className="font-semibold" style={{color:'#CC0000'}}>{searchResults.length}</span>{' '}
                result{searchResults.length !== 1 ? 's' : ''} for{' '}
                <span className="font-mono text-white">"{searchQuery}"</span>
              </p>
            ) : (
              <p className="text-dark-400 text-sm">
                <span className="font-semibold" style={{color:'#CC0000'}}>{photos.length}</span> photos loaded
              </p>
            )}
          </div>
          <button onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-dark-400 hover:text-white hover:bg-dark-600 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {error && (
          <div className="text-center py-16">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={refresh}
              className="px-6 py-2 rounded-lg text-white font-semibold text-sm"
              style={{background:'#CC0000'}}>
              Try Again
            </button>
          </div>
        )}

        {initialLoading && <SkeletonGrid count={12} />}

        {!initialLoading && displayPhotos.length === 0 && !error && (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-dark-700 border border-dark-500 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-dark-400 text-lg font-display">No photos yet</p>
            <p className="text-dark-500 text-sm mt-1">Photos will appear here once uploaded by admin</p>
          </div>
        )}

        {!initialLoading && displayPhotos.length > 0 && (
          <div className="grid grid-cols-2 sm:`-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {displayPhotos.map((photo, index) => (
              <div key={photo._id} className="card-anim"
                style={{animationDelay:`${Math.min(index*40,600)}ms`}}>
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

      {/* Lightbox */}
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

      {/* Announcement popup */}
      {showAnnouncement && (
        <AnnouncementModal onClose={() => setShowAnnouncement(false)} />
      )}
    </div>
  );
};

export default Gallery;

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
const ANNOUNCEMENT_TYPE    = 'image';
const ANNOUNCEMENT_URL     = '/announcement.jpg';
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
      style={{ backgroundColor:'rgba(10,20,60,0.82)', backdropFilter:'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="ann-card relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background:'#fff', border:'3px solid #CC0000' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ background:'linear-gradient(135deg,#1B3A8C 0%,#0d2260 100%)' }}>
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
            style={{ background:'rgba(255,255,255,0.15)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.30)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.15)'}
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
          style={{ background:'#f0f4ff', borderTop:'1px solid #d0d9f0' }}>
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
    <div className="min-h-screen" style={{ background: '#f0f4ff' }}>

      {/* Keyframes */}
      <style>{`
        @keyframes floatY {
          0%,100%{transform:translateY(0) scale(1);opacity:.07;}
          50%{transform:translateY(-22px) scale(1.06);opacity:.14;}
        }
        @keyframes twinkle {
          0%,100%{opacity:0;transform:scale(.5) rotate(0deg);}
          50%{opacity:1;transform:scale(1.2) rotate(20deg);}
        }
        @keyframes shimmerBlue {
          0%{background-position:-200% center;}
          100%{background-position:200% center;}
        }
        @keyframes scanLine {
          0%{top:0%;opacity:.12;} 100%{top:100%;opacity:.07;}
        }
        @keyframes pulseNavy {
          0%{box-shadow:0 0 0 0 rgba(27,58,140,.40);}
          70%{box-shadow:0 0 0 10px rgba(27,58,140,0);}
          100%{box-shadow:0 0 0 0 rgba(27,58,140,0);}
        }
        @keyframes cardIn {
          from{opacity:0;transform:translateY(18px) scale(.96);}
          to{opacity:1;transform:translateY(0) scale(1);}
        }
        @keyframes bannerSlide {
          from{opacity:0;transform:translateY(-10px);}
          to{opacity:1;transform:translateY(0);}
        }
        .shimmer-title{
          background:linear-gradient(90deg,#1B3A8C 0%,#4a6fd4 35%,#CC0000 55%,#1B3A8C 100%);
          background-size:200% auto;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          animation:shimmerBlue 4s linear infinite;
        }
        .banner-anim{animation:bannerSlide .6s cubic-bezier(.22,1,.36,1) both;}
        .card-anim{animation:cardIn .45s ease both;}
        .btn-pulse{animation:pulseNavy 2.2s ease-in-out infinite;}
        .search-input{
          background:#fff !important;
          border: 1.5px solid #c8d4f0 !important;
          color: #1B3A8C !important;
        }
        .search-input::placeholder{ color:#8fa3cc; }
        .search-input:focus{ border-color:#1B3A8C !important; }
      `}</style>

      {/* ── College Banner ─────────────────────────────────────────────── */}
      <header className="banner-anim w-full"
        style={{
          background: '#ffffff',
          borderBottom: '4px solid #CC0000',
          boxShadow: '0 3px 18px rgba(27,58,140,0.18)'
        }}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <img
            src={BANNER_SRC}
            alt="SASI Institute of Technology and Engineering – Dept. of ECE"
            className="w-full object-contain"
            style={{ maxHeight: '120px', display: 'block' }}
            onError={e => {
              // Fallback: render a styled banner if image is missing
              e.currentTarget.style.display = 'none';
              const fb = document.createElement('div');
              fb.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:14px 20px;';
              fb.innerHTML = `
                <div style="display:flex;align-items:center;gap:14px;">
                  <div style="width:64px;height:64px;background:linear-gradient(135deg,#CC0000,#8B0000);border-radius:50%;display:flex;align-items:center;justify-content:center;">
                    <span style="color:#fff;font-size:22px;font-weight:900;">S</span>
                  </div>
                  <div>
                    <div style="font-size:20px;font-weight:800;color:#1B3A8C;letter-spacing:1px;">SASI</div>
                    <div style="font-size:11px;color:#555;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Institute of Technology &amp; Engineering</div>
                    <div style="font-size:10px;color:#CC0000;font-weight:600;">Tadepalligudem, West Godavari District · Autonomous</div>
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:13px;font-weight:700;color:#1B3A8C;">Department of Electronics &amp; Communication Engineering</div>
                  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">
                    <span style="font-size:10px;background:#f0f4ff;border:1px solid #c8d4f0;color:#1B3A8C;padding:2px 8px;border-radius:20px;">AICTE Approved</span>
                    <span style="font-size:10px;background:#fff8f0;border:1px solid #f0d4b0;color:#CC0000;padding:2px 8px;border-radius:20px;">NAAC A+</span>
                    <span style="font-size:10px;background:#f0fff4;border:1px solid #b0d4bc;color:#1a7a3c;padding:2px 8px;border-radius:20px;">ISO 21001:2018</span>
                  </div>
                </div>
              `;
              e.currentTarget.parentNode.insertBefore(fb, e.currentTarget.nextSibling);
            }}
          />
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#0d2260 0%,#1B3A8C 45%,#122b6e 100%)' }}>

        {/* Dot grid pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage:'radial-gradient(circle at 2px 2px,#ffffff 1px,transparent 0)',
            backgroundSize:'28px 28px' }} />

        {/* Orbs */}
        <div className="absolute top-8 left-1/4 w-80 h-80 rounded-full pointer-events-none"
          style={{ background:'rgba(204,0,0,0.12)', animation:'floatY 7s ease-in-out infinite', filter:'blur(40px)' }} />
        <div className="absolute top-12 right-1/4 w-56 h-56 rounded-full pointer-events-none"
          style={{ background:'rgba(255,255,255,0.06)', animation:'floatY 9s ease-in-out infinite 1.5s', filter:'blur(30px)' }} />

        {/* Scan line */}
        <div className="absolute inset-x-0 h-px pointer-events-none"
          style={{ background:'linear-gradient(90deg,transparent,rgba(204,0,0,0.5),transparent)',
            animation:'scanLine 6s linear infinite' }} />

        {/* Red accent bar at bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 h-1"
          style={{ background:'linear-gradient(90deg,transparent,#CC0000,transparent)' }} />

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
              <polygon points="5,0 6,4 10,5 6,6 5,10 4,6 0,5 4,4" fill="#FFD700" opacity="0.7" />
            </svg>
          </div>
        ))}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          {/* Live dot + dept label */}
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{background:'#CC0000'}} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{background:'#CC0000'}} />
            </span>
            <p className="text-xs font-mono tracking-[0.22em] uppercase" style={{color:'#a8c0ff'}}>
              Department of Electronics &amp; Communication Engineering
            </p>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-3">
            ECE Farewell
            <span className="block shimmer-title">Photo Booth</span>
          </h1>

          <p className="text-blue-200 text-base sm:text-lg max-w-md mx-auto mb-2 opacity-80">
            SASI Institute of Technology &amp; Engineering
          </p>
          <p className="text-blue-300 text-sm max-w-md mx-auto mb-8 opacity-70">
            Find your memories. Download &amp; share with friends forever.
          </p>

          {/* Accreditation badges */}
          <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
            {['AICTE Approved','NAAC A+','UGC','ISO 21001:2018'].map(badge => (
              <span key={badge}
                className="text-xs px-3 py-1 rounded-full font-semibold tracking-wide"
                style={{ background:'rgba(255,255,255,0.12)', color:'#e0eaff', border:'1px solid rgba(255,255,255,0.2)' }}>
                {badge}
              </span>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{color:'#8fa3cc'}}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by photo number (e.g. ECE001)"
                className="search-input w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-colors font-mono"
                style={{ boxShadow:'0 2px 8px rgba(27,58,140,0.12)' }}
              />
            </div>
            <button
              type="submit" disabled={searching}
              className="px-5 py-3 rounded-xl text-white font-semibold text-sm transition-all whitespace-nowrap btn-pulse"
              style={{background: searching ? '#6b7faa' : '#1B3A8C', boxShadow:'0 2px 12px rgba(27,58,140,0.4)'}}
              onMouseEnter={e => { if(!searching) e.currentTarget.style.background='#0d2260'; }}
              onMouseLeave={e => { if(!searching) e.currentTarget.style.background='#1B3A8C'; }}
            >
              {searching ? '...' : 'Search'}
            </button>
            {searchResults && (
              <button type="button" onClick={clearSearch}
                className="px-4 py-3 rounded-xl text-sm transition-all font-semibold"
                style={{background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.25)'}}>
                Clear
              </button>
            )}
          </form>
        </div>
      </div>

      {/* ── Gallery content ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            {searchResults ? (
              <p className="text-sm" style={{color:'#4a5c8a'}}>
                Found <span className="font-semibold" style={{color:'#CC0000'}}>{searchResults.length}</span>{' '}
                result{searchResults.length !== 1 ? 's' : ''} for{' '}
                <span className="font-mono font-semibold" style={{color:'#1B3A8C'}}>"{searchQuery}"</span>
              </p>
            ) : (
              <p className="text-sm" style={{color:'#4a5c8a'}}>
                <span className="font-semibold" style={{color:'#1B3A8C'}}>{photos.length}</span> photos loaded
              </p>
            )}
          </div>
          <button onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{color:'#4a5c8a', background:'#e6ecf8', border:'1px solid #c8d4f0'}}
            onMouseEnter={e => { e.currentTarget.style.background='#d0dcf4'; e.currentTarget.style.color='#1B3A8C'; }}
            onMouseLeave={e => { e.currentTarget.style.background='#e6ecf8'; e.currentTarget.style.color='#4a5c8a'; }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {error && (
          <div className="text-center py-16">
            <p className="mb-4" style={{color:'#CC0000'}}>{error}</p>
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
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{background:'#e6ecf8', border:'1.5px solid #c8d4f0'}}>
              <svg className="w-7 h-7" style={{color:'#8fa3cc'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-lg font-semibold" style={{color:'#1B3A8C'}}>No photos yet</p>
            <p className="text-sm mt-1" style={{color:'#8fa3cc'}}>Photos will appear here once uploaded by admin</p>
          </div>
        )}

        {!initialLoading && displayPhotos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
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
              <div className="flex items-center gap-2 text-sm" style={{color:'#4a5c8a'}}>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading more...
              </div>
            )}
            {!hasMore && photos.length > 0 && !loading && (
              <p className="text-xs font-mono" style={{color:'#8fa3cc'}}>— All {photos.length} photos loaded —</p>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-6 text-center" style={{background:'#1B3A8C', borderTop:'3px solid #CC0000'}}>
        <p className="text-sm font-semibold text-white opacity-90">
          SASI Institute of Technology &amp; Engineering
        </p>
        <p className="text-xs mt-1" style={{color:'#a8c0ff'}}>
          Department of ECE · Farewell 2026 · Tadepalligudem, West Godavari
        </p>
      </footer>

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

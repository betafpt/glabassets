import { useState, useEffect } from 'react'
import { Folder, Film, FileType2, DownloadCloud, Upload, Settings, RefreshCw, X, LayoutGrid, Maximize, Check, Info, FileVideo, Edit, Trash2 } from 'lucide-react'
import './styles/globals.css'
import './styles/components.css'
import './styles/utilities.css'
import { SettingsModal } from './components/SettingsModal'
import { AdminUploadModal } from './components/AdminUploadModal'
import { ActivationModal } from './components/ActivationModal'
import { supabase } from './lib/supabase'

function App() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'full'>('grid')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<any>(null)
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<any>(null)
  const [assets, setAssets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [devError, setDevError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  // Download states
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  // Auto Updater State
  const [updateInfo, setUpdateInfo] = useState<{ type: string; progress?: number; info?: any; error?: string } | null>(null)

  // App Version
  const [appVersion, setAppVersion] = useState<string>('v1.0.0')

  useEffect(() => {
    setIsAdmin(localStorage.getItem('resolve_is_admin') === 'true')
    fetchAssets()

    // Fetch App Version
    if (window.api && window.api.getAppVersion) {
      window.api.getAppVersion().then(version => setAppVersion(`v${version} `))
    }

    // Listen to download progress from main process
    const downloadProgressListener = (_event: any, data: any) => {
      setDownloadProgress(Math.round(data.progress))
    }

    window.electron.ipcRenderer.on('download-progress', downloadProgressListener)

    // Listen for Auto Updater Messages
    if (window.api && window.api.onUpdaterMessage) {
      const updaterMessageListener = (data: any) => {
        setUpdateInfo(data)
      }
      const cleanupUpdater = window.api.onUpdaterMessage(updaterMessageListener)
      return () => {
        window.electron.ipcRenderer.removeListener('download-progress', downloadProgressListener)
        cleanupUpdater()
      }
    }

    return () => {
      window.electron.ipcRenderer.removeListener('download-progress', downloadProgressListener)
    }
  }, [])

  useEffect(() => {
    // Setup Supabase Realtime Subscription for the 'assets' table
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assets'
        },
        (payload) => {
          console.log('Realtime change received!', payload)
          // When any insert, update, or delete happens, just fetch the fresh list
          fetchAssets()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    // Listen for Auto Updater Messages
    if (window.api && window.api.onUpdaterMessage) {
      const cleanup = window.api.onUpdaterMessage((data) => {
        setUpdateInfo(data)
      })
      return cleanup
    }
    return undefined // added explicit return as per lint feedback
  }, [])

  async function fetchAssets() {
    setIsLoading(true)
    setDevError(null)
    try {
      // Check if credentials loaded
      const url = import.meta.env.VITE_SUPABASE_URL
      if (!url) {
        setDevError('Missing VITE_SUPABASE_URL. Please check .env.local file.')
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase Query Error:', error)
        setDevError(error.message || JSON.stringify(error))
      }
      if (data) setAssets(data)
    } catch (error: any) {
      console.error('Error fetching assets:', error)
      setDevError(error?.message || 'Unknown network error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInstall = async (asset: any) => {
    if (!isPremium && !isAdmin) {
      alert("Bạn chưa kích hoạt bản quyền! Không thể tải xuống.")
      return
    }

    try {
      setDownloadingId(asset.id)
      setDownloadProgress(0)

      // Get filename from URL or generate from title + type
      const filename = asset.file_url.split('/').pop() || (asset.title.replace(/\s+/g, '_') + asset.type)

      const savedPath = await window.api.downloadAsset(asset.file_url, filename)

      // We can use a custom toast instead in the future, for now alert is enough to debug
      alert(`🎉 Installed successfully at: \n${savedPath} `)
    } catch (err: any) {
      alert(`❌ Failed to install: \n${err.message || err} `)
    } finally {
      setDownloadingId(null)
      setDownloadProgress(0)
    }
  }

  const handleDelete = async (asset: any) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn "${asset.title}" không ? `)) return;
    try {
      // 1. Delete from DB
      const { error: dbError } = await supabase.from('assets').delete().eq('id', asset.id);
      if (dbError) throw dbError;

      // 2. Delete from Storage (Optional fallback if file linked)
      const deleteStorageFile = async (url: string, bucketPath: string) => {
        if (!url) return;
        try {
          // Extract file path from Supabase URL: .../storage/v1/object/public/resolve-assets/assets/foo.drfx -> assets/foo.drfx
          const match = url.match(new RegExp(`/ ${bucketPath}/(.+)`));
          if (match && match[1]) {
            await supabase.storage.from('resolve-assets').remove([`${bucketPath}/${match[1]}`]);
          }
        } catch (e) {
          console.warn('Failed to delete storage file', e);
        }
      }

      await deleteStorageFile(asset.file_url, 'assets');
      if (asset.thumbnail_url) await deleteStorageFile(asset.thumbnail_url, 'thumbnails');
      if (asset.video_preview_url) await deleteStorageFile(asset.video_preview_url, 'previews');

      setSelectedAssetDetail(null);
      fetchAssets();
    } catch (err: any) {
      alert(`Lỗi Xóa Tài Nguyên:\n${err.message || err}`);
    }
  }

  const categories = [
    { id: 'all', name: 'All Assets', icon: <Folder size={18} /> },
    { id: 'transitions', name: 'Transitions', icon: <Film size={18} /> },
    { id: 'titles', name: 'Titles & Text', icon: <FileType2 size={18} /> },
    { id: 'effects', name: 'Effects', icon: <DownloadCloud size={18} /> },
  ]

  // Mock Data for UI Preview removed because we use real data from Supabase now.

  return (
    <>
      {!isPremium && !isAdmin && (
        <ActivationModal
          onActivate={() => setIsPremium(true)}
          onAdminBypass={() => {
            setIsAdmin(true)
            setIsSettingsOpen(true)
          }}
        />
      )}

      {/* Centered Update Overlay Modal */}
      {updateInfo && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px' }}>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary)' }}>
              {updateInfo.type === 'checking-for-update' || updateInfo.type === 'download-progress' ? (
                <RefreshCw size={48} className="animate-spin" />
              ) : updateInfo.type === 'update-not-available' ? (
                <Check size={48} />
              ) : updateInfo.type === 'error' ? (
                <X size={48} color="var(--danger)" />
              ) : (
                <DownloadCloud size={48} />
              )}
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              {updateInfo.type === 'checking-for-update' && 'Đang kiểm tra cập nhật...'}
              {updateInfo.type === 'update-available' && 'Đã tìm thấy phiên bản mới!'}
              {updateInfo.type === 'download-progress' && 'Đang tải bản cập nhật...'}
              {updateInfo.type === 'update-downloaded' && 'Sẵn sàng cập nhật'}
              {updateInfo.type === 'update-not-available' && 'Bạn đang dùng bản mới nhất'}
              {updateInfo.type === 'error' && 'Lỗi Cập nhật'}
            </h2>

            {updateInfo.type === 'update-available' && (
              <p className="text-muted" style={{ fontSize: '13px' }}>Vui lòng đợi trong giây lát, hệ thống đang tự động tải xuống dữ liệu nền...</p>
            )}

            {updateInfo.type === 'download-progress' && (
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginTop: '16px' }}>
                <div style={{ width: `${updateInfo.progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.2s' }} />
              </div>
            )}
            {updateInfo.type === 'download-progress' && (
              <p className="text-muted" style={{ fontSize: '12px', marginTop: '8px' }}>{Math.round(updateInfo.progress || 0)}%</p>
            )}

            {updateInfo.type === 'update-downloaded' && (
              <>
                <p className="text-muted" style={{ fontSize: '13px', marginBottom: '24px' }}>Tải xuống hoàn tất. Ứng dụng cần khởi động lại để áp dụng thay đổi!</p>
                <button
                  className="btn btn-primary w-full"
                  onClick={() => {
                    if (window.api && window.api.quitAndInstall) {
                      window.api.quitAndInstall()
                    }
                  }}
                  style={{ padding: '12px', fontSize: '14px' }}
                >
                  Cài đặt & Khởi động lại ngay
                </button>
              </>
            )}

            {(updateInfo.type === 'update-not-available' || updateInfo.type === 'error') && (
              <button
                className="btn btn-primary mt-6"
                onClick={() => setUpdateInfo(null)}
                style={{ padding: '8px 24px' }}
              >
                Đóng
              </button>
            )}

          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="titlebar" style={{ height: 'auto', justifyContent: 'center', borderBottom: 'none', paddingTop: '32px', paddingBottom: '24px' }}>
          <img src="./logo.png" className="app-main-logo" alt="App Logo" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.removeAttribute('style'); }} />
          <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '0.5px', display: 'none', color: 'var(--primary)', textShadow: '0 0 10px rgba(34, 197, 94, 0.5)' }}>Resolve Assets</h1>
        </div>

        <div className="flex-col gap-2 p-4 mt-2" style={{ overflowY: 'auto' }}>
          <p className="text-muted" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px', paddingLeft: '8px', textTransform: 'uppercase' }}>Categories</p>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`btn w-full ${activeCategory === cat.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ justifyContent: 'flex-start' }}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon}
              {cat.name}
            </button>
          ))}
        </div>

        <div className="mt-auto p-4 flex-col gap-2 border-t" style={{ borderColor: 'var(--br-card)' }}>
          {isAdmin && (
            <button
              className="btn btn-ghost w-full"
              style={{ justifyContent: 'flex-start', color: '#a8b2d1' }}
              onClick={() => setIsUploadModalOpen(true)}
            >
              <Upload size={18} />
              Admin Upload
            </button>
          )}
          <button
            className="btn btn-ghost w-full"
            style={{ justifyContent: 'flex-start', color: '#a8b2d1' }}
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings size={18} />
            Settings
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            <p>G.Lab Assets {appVersion}</p>
            <p style={{ marginTop: '4px' }}>
              Collect by <a href="https://www.facebook.com/giangphoto/" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', transition: 'opacity 0.2s', opacity: 0.8 }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}>Giang Nguyen</a>
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="titlebar" style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <div className="flex items-center gap-4">
            <h2 style={{ fontSize: '18px', fontWeight: 500 }}>
              {categories.find(c => c.id === activeCategory)?.name}
            </h2>
            <span style={{ fontSize: '12px', background: 'var(--primary)', color: 'white', padding: '2px 10px', borderRadius: '12px', fontWeight: 500, boxShadow: '0 0 10px rgba(34, 197, 94, 0.3)' }}>
              {isLoading ? '...' : (activeCategory === 'all' ? assets.length : assets.filter(a => a.category === activeCategory).length)} items
            </span>
          </div>

          <div className="titlebar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginRight: '16px' }}>
            <button
              className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px', borderRadius: '8px' }}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`btn ${viewMode === 'full' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px', borderRadius: '8px' }}
              onClick={() => setViewMode('full')}
              title="Full-screen View"
            >
              <Maximize size={16} />
            </button>
          </div>
        </header>

        <div className={`asset-grid ${viewMode}`} style={{ padding: '24px' }}>
          {devError ? (
            <div className="p-6 w-full text-center" style={{ gridColumn: '1 / -1', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: '8px' }}>
              <h3 style={{ color: 'var(--danger)', marginBottom: '8px' }}>Developer Debug Error:</h3>
              <p className="text-muted" style={{ fontFamily: 'monospace', fontSize: '13px' }}>{devError}</p>
              <button className="btn btn-primary mt-4" onClick={fetchAssets}>Retry Fetch</button>
            </div>
          ) : isLoading ? (
            <div className="p-6 text-muted w-full text-center" style={{ gridColumn: '1 / -1' }}>
              Loading assets from cloud...
            </div>
          ) : assets.length === 0 ? (
            <div className="p-6 text-muted w-full text-center" style={{ gridColumn: '1 / -1' }}>
              No assets found. Upload some to Supabase!
            </div>
          ) : assets
            .filter(asset => activeCategory === 'all' || asset.category === activeCategory)
            .map(asset => (
              <div key={asset.id} className="asset-card glass-panel">
                <div
                  className="asset-thumbnail-container"
                  onClick={() => setSelectedAssetDetail(asset)}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  {asset.thumbnail_url ? (
                    <img
                      src={asset.thumbnail_url}
                      alt={asset.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="absolute-center w-full h-full flex items-center justify-center" style={{ background: '#1e2128' }}>
                      {asset.category === 'transitions' ? <Film size={32} opacity={0.2} /> :
                        asset.category === 'titles' ? <FileType2 size={32} opacity={0.2} /> :
                          <DownloadCloud size={32} opacity={0.2} />}
                    </div>
                  )}
                  {/* Video block if url exists */}
                  {asset.video_preview_url && (
                    <video
                      className="asset-video"
                      src={asset.video_preview_url}
                      muted
                      loop
                      playsInline
                      onMouseOver={(e) => e.currentTarget.play()}
                      onMouseOut={(e) => {
                        e.currentTarget.pause()
                        e.currentTarget.currentTime = 0
                      }}
                    />
                  )}
                  <div className="hover-action" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
                    <Info size={32} color="white" />
                  </div>
                </div>
                <div className="asset-info flex-col gap-2">
                  <h3 className="asset-title" onClick={() => setSelectedAssetDetail(asset)} style={{ cursor: 'pointer' }}>{asset.title}</h3>
                  <div className="asset-meta">
                    <span>{asset.type}</span>
                    <button
                      className="btn btn-primary"
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        opacity: downloadingId === asset.id ? 0.7 : 1,
                        cursor: downloadingId === asset.id ? 'not-allowed' : 'pointer'
                      }}
                      onClick={() => handleInstall(asset)}
                      disabled={downloadingId !== null}
                    >
                      <DownloadCloud size={14} className={downloadingId === asset.id ? 'animate-pulse' : ''} />
                      {downloadingId === asset.id ? `Downloading ${downloadProgress}%` : 'Install'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </main>

      {/* Modals */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onAdminChange={(val) => setIsAdmin(val)} appVersion={appVersion} />
      {
        isUploadModalOpen && <AdminUploadModal
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            setIsUploadModalOpen(false)
            fetchAssets() // Refresh danh sách sau khi up xong
          }}
        />
      }
      {
        editingAsset && <AdminUploadModal
          initialData={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSuccess={() => {
            setEditingAsset(null)
            fetchAssets()
          }}
        />
      }

      {/* Chi Tiết Asset Modal */}
      {
        selectedAssetDetail && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '800px', width: '90%', padding: '0', overflow: 'hidden' }}>
              {selectedAssetDetail.youtube_url ? (
                <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', backgroundColor: '#000' }}>
                  <iframe
                    src={(() => {
                      try {
                        const url = selectedAssetDetail.youtube_url;
                        if (url.includes('embed/')) return url;
                        const urlObj = new URL(url);
                        let videoId = '';
                        if (urlObj.hostname.includes('youtube.com')) {
                          videoId = urlObj.searchParams.get('v') || '';
                        } else if (urlObj.hostname.includes('youtu.be')) {
                          videoId = urlObj.pathname.slice(1);
                        }
                        return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?origin=http://localhost` : url.replace('watch?v=', 'embed/');
                      } catch (e) {
                        return selectedAssetDetail.youtube_url.replace('watch?v=', 'embed/');
                      }
                    })()}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : selectedAssetDetail.video_preview_url ? (
                <div style={{ width: '100%', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <video src={selectedAssetDetail.video_preview_url} controls muted autoPlay style={{ width: '100%', maxHeight: '400px' }} />
                </div>
              ) : (
                <div style={{ width: '100%', height: '200px', backgroundColor: '#1e2128', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileVideo size={64} style={{ opacity: 0.2 }} />
                </div>
              )}

              <div style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>{selectedAssetDetail.title}</h2>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>{selectedAssetDetail.category}</span>
                  <span style={{ fontSize: '12px', padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>{selectedAssetDetail.type}</span>
                </div>

                <div style={{ color: '#ccc', lineHeight: '1.6', marginBottom: '24px', whiteSpace: 'pre-wrap' }}>
                  {selectedAssetDetail.description || 'Chưa có mô tả kỹ thuật.'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" onClick={() => setSelectedAssetDetail(null)}>
                      Close
                    </button>
                    {isAdmin && (
                      <>
                        <button className="btn btn-ghost" onClick={() => { setEditingAsset(selectedAssetDetail); setSelectedAssetDetail(null); }} style={{ padding: '8px', color: '#a8b2d1' }}>
                          <Edit size={16} />
                        </button>
                        <button className="btn btn-ghost" onClick={() => handleDelete(selectedAssetDetail)} style={{ padding: '8px', color: 'var(--danger)' }}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      handleInstall(selectedAssetDetail)
                      setSelectedAssetDetail(null)
                    }}
                    disabled={downloadingId !== null}
                  >
                    <DownloadCloud size={16} style={{ display: 'inline', verticalAlign: 'middle' }} />
                    <span style={{ marginLeft: '6px' }}>{downloadingId === selectedAssetDetail.id ? 'Tải xuống...' : 'Cài Đặt Ngay'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </>
  )
}

export default App

import { useState, useEffect } from 'react'
import { Folder, Film, FileType2, Settings, DownloadCloud, Upload, Info, FileVideo, Trash2, Edit } from 'lucide-react'
import './styles/globals.css'
import './styles/components.css'
import './styles/utilities.css'
import { SettingsModal } from './components/SettingsModal'
import { AdminUploadModal } from './components/AdminUploadModal'
import { supabase } from './lib/supabase'

function App() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<any>(null)
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<any>(null)
  const [assets, setAssets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [devError, setDevError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Download states
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  useEffect(() => {
    setIsAdmin(localStorage.getItem('resolve_is_admin') === 'true')
    fetchAssets()

    // Listen to download progress from main process
    const listener = (_event: any, data: any) => {
      setDownloadProgress(Math.round(data.progress))
    }

    window.electron.ipcRenderer.on('download-progress', listener)

    return () => {
      window.electron.ipcRenderer.removeListener('download-progress', listener)
    }
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
    try {
      setDownloadingId(asset.id)
      setDownloadProgress(0)

      // Get filename from URL or generate from title + type
      const filename = asset.file_url.split('/').pop() || (asset.title.replace(/\s+/g, '_') + asset.type)

      const savedPath = await window.api.downloadAsset(asset.file_url, filename)

      // We can use a custom toast instead in the future, for now alert is enough to debug
      alert(`🎉 Installed successfully at:\n${savedPath}`)
    } catch (err: any) {
      alert(`❌ Failed to install:\n${err.message || err}`)
    } finally {
      setDownloadingId(null)
      setDownloadProgress(0)
    }
  }

  const handleDelete = async (asset: any) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn "${asset.title}" không?`)) return;
    try {
      // 1. Delete from DB
      const { error: dbError } = await supabase.from('assets').delete().eq('id', asset.id);
      if (dbError) throw dbError;

      // 2. Delete from Storage (Optional fallback if file linked)
      const deleteStorageFile = async (url: string, bucketPath: string) => {
        if (!url) return;
        try {
          // Extract file path from Supabase URL: .../storage/v1/object/public/resolve-assets/assets/foo.drfx -> assets/foo.drfx
          const match = url.match(new RegExp(`/${bucketPath}/(.+)`));
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
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="titlebar" style={{ justifyContent: 'center', borderBottom: 'none' }}>
          <h1 style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '0.5px' }}>Resolve Assets</h1>
        </div>

        <div className="flex-col gap-2 p-4 mt-2">
          <p className="text-muted" style={{ fontSize: '12px', marginBottom: '8px', paddingLeft: '8px' }}>CATEGORIES</p>
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
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="titlebar">
          <div className="flex items-center gap-3">
            <h2 style={{ fontSize: '15px', fontWeight: 500 }}>
              {categories.find(c => c.id === activeCategory)?.name}
            </h2>
            <span style={{ fontSize: '12px', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-muted)' }}>
              {isLoading ? '...' : (activeCategory === 'all' ? assets.length : assets.filter(a => a.category === activeCategory).length)} items
            </span>
          </div>

          <div className="titlebar-actions">
            {/* Window controls will be injected here by OS native frame if hidden, otherwise custom */}
          </div>
        </header>

        <div className="asset-grid">
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
                  {/* Fallback pattern for thumbnail */}
                  <div className="absolute-center w-full h-full flex items-center justify-center" style={{ background: '#1e2128' }}>
                    {asset.category === 'transitions' ? <Film size={32} opacity={0.2} /> :
                      asset.category === 'titles' ? <FileType2 size={32} opacity={0.2} /> :
                        <DownloadCloud size={32} opacity={0.2} />}
                  </div>
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
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onAdminChange={(val) => setIsAdmin(val)} />
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
                    src={selectedAssetDetail.youtube_url.replace('watch?v=', 'embed/')}
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
        )}
    </>
  )
}

export default App


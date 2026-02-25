import { useState } from 'react'
import { X, Upload, Loader2, Link as LinkIcon, FileVideo, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AdminUploadModalProps {
    onClose: () => void
    onSuccess: () => void
    initialData?: any
}

export function AdminUploadModal({ onClose, onSuccess, initialData }: AdminUploadModalProps) {
    const [title, setTitle] = useState(initialData?.title || '')
    const [category, setCategory] = useState(initialData?.category || 'transitions')
    const [type, setType] = useState(initialData?.type || '.drfx')
    const [description, setDescription] = useState(initialData?.description || '')
    const [youtubeUrl, setYoutubeUrl] = useState(initialData?.youtube_url || '')

    const [assetFile, setAssetFile] = useState<File | null>(null)
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
    const [videoFile, setVideoFile] = useState<File | null>(null)

    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || (!assetFile && !initialData)) {
            setError('Title and Asset File are required')
            return
        }

        try {
            setIsUploading(true)
            setError(null)

            // Helper function to upload file to Supabase Storage
            const uploadFile = async (file: File, folder: string) => {
                const fileExt = file.name.split('.').pop()
                const fileName = `${folder}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
                const { error: uploadError } = await supabase.storage
                    .from('resolve-assets')
                    .upload(fileName, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('resolve-assets')
                    .getPublicUrl(fileName)

                return publicUrl
            }

            // 1. Upload Asset File
            let assetUrl = initialData?.file_url;
            if (assetFile) {
                assetUrl = await uploadFile(assetFile, 'assets')
            }

            // 2. Upload Thumbnail (Optional)
            let thumbnailUrl: string | null = initialData?.thumbnail_url || null
            if (thumbnailFile) {
                thumbnailUrl = await uploadFile(thumbnailFile, 'thumbnails')
            }

            // 3. Upload Video Preview (Optional)
            let videoUrl: string | null = initialData?.video_preview_url || null
            if (videoFile) {
                videoUrl = await uploadFile(videoFile, 'previews')
            }

            // 4. Insert or Update into Database
            const payload = {
                title,
                category,
                type,
                description: description || null,
                youtube_url: youtubeUrl || null,
                file_url: assetUrl,
                thumbnail_url: thumbnailUrl,
                video_preview_url: videoUrl,
                size_bytes: assetFile ? assetFile.size : initialData?.size_bytes,
                tags: initialData?.tags || ([] as string[])
            } as any;

            let dbError: any = null;
            if (initialData) {
                const { error } = await supabase.from('assets').update(payload).eq('id', initialData.id);
                dbError = error;
            } else {
                const { error } = await supabase.from('assets').insert(payload);
                dbError = error;
            }

            if (dbError) throw dbError

            onSuccess()
        } catch (err: any) {
            console.error('Upload Error:', err)
            setError(err.message || 'Failed to upload asset')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2><Upload size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /> {initialData ? 'Edit Asset' : 'Admin Upload'}</h2>
                    <button className="btn btn-secondary" onClick={onClose} style={{ padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                {error && <div style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', padding: '10px', borderRadius: '4px', marginBottom: '16px' }}>{error}</div>}

                <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <label>Asset Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="e.g. Cinematic Fire Transition"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <label>Category</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value)}>
                                <option value="transitions">Transitions</option>
                                <option value="titles">Titles & Text</option>
                                <option value="effects">Effects</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>File Type</label>
                            <select value={type} onChange={(e) => setType(e.target.value)}>
                                <option value=".drfx">.drfx (Bundle)</option>
                                <option value=".setting">.setting (Macro)</option>
                                <option value=".drp">.drp (Project)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label>Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Features and usage instructions..."
                            rows={3}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        />
                    </div>

                    <div>
                        <label><LinkIcon size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> YouTube Tutorial URL</label>
                        <input
                            type="url"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="https://youtube.com/watch?v=..."
                        />
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 100%' }}>
                            <label>Asset File ({type}) {initialData ? '(Optional)' : '*'}</label>
                            <input
                                type="file"
                                accept={type === '.drfx' ? '.drfx' : type === '.setting' ? '.setting' : '.drp'}
                                onChange={(e) => setAssetFile(e.target.files?.[0] || null)}
                                required={!initialData}
                            />
                        </div>

                        <div style={{ flex: 1 }}>
                            <label><ImageIcon size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Thumbnail Image (Optional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                            />
                        </div>

                        <div style={{ flex: 1 }}>
                            <label><FileVideo size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Preview Video (.mp4) (Optional)</label>
                            <input
                                type="file"
                                accept="video/mp4"
                                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isUploading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isUploading}>
                            {isUploading ? <><Loader2 size={16} className="animate-pulse" /> {initialData ? 'Updating...' : 'Uploading...'}</> : (initialData ? 'Update Asset' : 'Upload Asset')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

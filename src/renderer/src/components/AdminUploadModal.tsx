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
    const [downloadMethod, setDownloadMethod] = useState<'auto' | 'link'>(
        initialData?.file_url?.startsWith('http') && !initialData?.file_url?.includes('supabase.co') ? 'link' : 'auto'
    )
    const [type, setType] = useState(initialData?.type || '.drfx')
    const [description, setDescription] = useState(initialData?.description || '')
    const [youtubeUrl, setYoutubeUrl] = useState(initialData?.youtube_url || '')

    const [assetFile, setAssetFile] = useState<File | null>(null)
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
    const [thumbnailLink, setThumbnailLink] = useState(initialData?.thumbnail_url?.startsWith('http') && !initialData?.thumbnail_url?.includes('supabase.co') ? initialData.thumbnail_url : '')
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [previewVideoLink, setPreviewVideoLink] = useState(initialData?.video_preview_url?.startsWith('http') && !initialData?.video_preview_url?.includes('supabase.co') ? initialData.video_preview_url : '')

    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [externalLink, setExternalLink] = useState(initialData?.file_url?.startsWith('http') && !initialData?.file_url?.includes('supabase.co') ? initialData.file_url : '')

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!title || (downloadMethod === 'auto' && !assetFile && !initialData)) {
            setError('Title and Asset File are required')
            return
        }

        if (downloadMethod === 'link' && !externalLink && !initialData) {
            setError('External Download Link is required')
            return
        }

        try {
            setIsUploading(true)
            setError(null)

            // Helper function to upload file to Supabase Storage
            const uploadFile = async (file: File, folder: string) => {
                const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
                const fileName = `${folder}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}/${sanitizedName}`
                const { error: uploadError } = await supabase.storage
                    .from('resolve-assets')
                    .upload(fileName, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('resolve-assets')
                    .getPublicUrl(fileName)

                return publicUrl
            }

            // Utility: Compress Image under max size (default 500KB)
            const compressImage = async (file: File, maxSizeKB: number = 500): Promise<File> => {
                if (!file.type.startsWith('image/')) return file;

                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.src = URL.createObjectURL(file);
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;

                        // Max dimensions to prevent huge memory spikes
                        const MAX_WIDTH = 1920;
                        const MAX_HEIGHT = 1080;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height = Math.round((height * MAX_WIDTH) / width);
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width = Math.round((width * MAX_HEIGHT) / height);
                                height = MAX_HEIGHT;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            resolve(file); // Fallback
                            return;
                        }

                        ctx.drawImage(img, 0, 0, width, height);

                        // Binary search for optimal quality
                        let low = 0.0;
                        let high = 1.0;
                        let quality = 0.8;
                        let bestBlob: Blob | null = null;

                        const tryCompress = (q: number): Promise<Blob | null> => {
                            return new Promise(res => canvas.toBlob(b => res(b as any), 'image/jpeg', q));
                        };

                        const processCompression = async () => {
                            let attempts = 0;
                            while (attempts < 5) { // Max 5 iterations
                                const blob = await tryCompress(quality);
                                if (!blob) break;

                                const kb = blob.size / 1024;
                                if (kb <= maxSizeKB) {
                                    bestBlob = blob;
                                    low = quality; // Try higher quality
                                    quality = (low + high) / 2;
                                } else {
                                    high = quality; // Try lower quality
                                    quality = (low + high) / 2;
                                }
                                attempts++;
                            }

                            if (bestBlob) {
                                resolve(new File([bestBlob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                }));
                            } else {
                                resolve(file); // Fallback
                            }
                        };
                        processCompression();
                    };
                    img.onerror = () => reject(new Error('Failed to load image for compression'));
                });
            };

            // Helper function to delete old file from storage
            const deleteStorageFile = async (url: string, bucketPath: string) => {
                if (!url) return;
                try {
                    const match = url.match(new RegExp(`/${bucketPath}/(.+)`));
                    if (match && match[1]) {
                        await supabase.storage.from('resolve-assets').remove([`${bucketPath}/${match[1]}`]);
                    }
                } catch (e) {
                    console.warn('Failed to delete old storage file', e);
                }
            }

            // 1. Upload Asset File or Use External Link
            let assetUrl = initialData?.file_url;

            if (downloadMethod === 'link' && externalLink) {
                assetUrl = externalLink;
            } else if (downloadMethod === 'auto' && assetFile) {
                if (initialData?.file_url && initialData.file_url.includes('supabase.co')) await deleteStorageFile(initialData.file_url, 'assets');
                assetUrl = await uploadFile(assetFile, 'assets')
            }

            // 2. Upload Thumbnail (Optional) with compression
            let thumbnailUrl: string | null = initialData?.thumbnail_url || null
            if (thumbnailLink) {
                thumbnailUrl = thumbnailLink
            } else if (thumbnailFile) {
                if (initialData?.thumbnail_url && initialData.thumbnail_url.includes('supabase.co')) await deleteStorageFile(initialData.thumbnail_url, 'thumbnails');
                const compressedFile = await compressImage(thumbnailFile, 500);
                thumbnailUrl = await uploadFile(compressedFile, 'thumbnails')
            }

            // 3. Upload Video Preview (Optional)
            let videoUrl: string | null = initialData?.video_preview_url || null
            if (previewVideoLink) {
                videoUrl = previewVideoLink
            } else if (videoFile) {
                if (initialData?.video_preview_url && initialData.video_preview_url.includes('supabase.co')) await deleteStorageFile(initialData.video_preview_url, 'previews');
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
                const { error } = await supabase.from('assets').insert([payload]);
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
                                <option value="luts">LUTs</option>
                                <option value="powergrades">PowerGrades</option>
                                <option value="lr_presets">Lightroom Presets</option>
                                <option value="plugins">Plugins</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>File Type</label>
                            <select value={type} onChange={(e) => setType(e.target.value)}>
                                <option value=".drfx">.drfx (Bundle)</option>
                                <option value=".setting">.setting (Macro)</option>
                                <option value=".drp">.drp (Project)</option>
                                <option value=".cube">.cube (LUT)</option>
                                <option value=".zip">.zip (Archive)</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>Download Method</label>
                            <select value={downloadMethod} onChange={(e: any) => setDownloadMethod(e.target.value)}>
                                <option value="auto">Auto Install (Upload File)</option>
                                <option value="link">External Link</option>
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
                        {downloadMethod === 'link' ? (
                            <div style={{ flex: '1 1 100%' }}>
                                <label><LinkIcon size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> External Download Link (Google Drive, Dropbox, etc.) *</label>
                                <input
                                    type="url"
                                    value={externalLink}
                                    onChange={(e) => setExternalLink(e.target.value)}
                                    placeholder="https://drive.google.com/..."
                                    required={!initialData}
                                />
                            </div>
                        ) : (
                            <div style={{ flex: '1 1 100%' }}>
                                <label>Asset File ({type}) {initialData ? '(Optional)' : '*'}</label>
                                <input
                                    type="file"
                                    accept={type === '.drfx' ? '.drfx' : type === '.setting' ? '.setting' : '.drp'}
                                    onChange={(e) => setAssetFile(e.target.files?.[0] || null)}
                                    required={!initialData}
                                />
                            </div>
                        )}

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label><ImageIcon size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Thumbnail Image (Optional)</label>
                            <input
                                type="url"
                                value={thumbnailLink}
                                onChange={(e) => setThumbnailLink(e.target.value)}
                                placeholder="External Link"
                                style={{ marginBottom: '8px' }}
                            />
                            <div style={{ textAlign: 'center', fontSize: '12px', color: '#666' }}>— OR —</div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                                disabled={!!thumbnailLink}
                            />
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label><FileVideo size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Preview Video/GIF (Optional)</label>
                            <input
                                type="url"
                                value={previewVideoLink}
                                onChange={(e) => setPreviewVideoLink(e.target.value)}
                                placeholder="External Link (e.g. from Imgur or Giphy)"
                                style={{ marginBottom: '8px' }}
                            />
                            <div style={{ textAlign: 'center', fontSize: '12px', color: '#666' }}>— OR —</div>
                            <input
                                type="file"
                                accept="video/mp4, image/gif"
                                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                                disabled={!!previewVideoLink}
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

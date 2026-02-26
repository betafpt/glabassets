import { useState, useEffect } from 'react'
import { X, FolderOpen, Lock, Unlock, Key, Loader2, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import '../styles/globals.css'
import '../styles/components.css'

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
    onAdminChange?: (isAdmin: boolean) => void
}

export function SettingsModal({ isOpen, onClose, onAdminChange }: SettingsModalProps) {
    const [passcode, setPasscode] = useState('')
    const [isAdmin, setIsAdmin] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedKey, setGeneratedKey] = useState<string | null>(null)

    useEffect(() => {
        const adminState = localStorage.getItem('resolve_is_admin') === 'true'
        setIsAdmin(adminState)
    }, [isOpen])

    const handlePasscodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setPasscode(val)
        if (val === 'resolveadmin') {
            localStorage.setItem('resolve_is_admin', 'true')
            setIsAdmin(true)
            if (onAdminChange) onAdminChange(true)
        } else if (isAdmin && val === '') {
            // Optional: clear admin if they clear the box? no, let's keep it simple.
        }
    }

    const lockAdmin = () => {
        localStorage.removeItem('resolve_is_admin')
        setIsAdmin(false)
        setPasscode('')
        if (onAdminChange) onAdminChange(false)
    }

    const generateLicenseKey = async () => {
        setIsGenerating(true)
        setGeneratedKey(null)

        try {
            // Chuỗi ngẫu nhiên 4 đoạn
            const randSegment = () => Math.random().toString(36).substring(2, 6).toUpperCase()
            const newKey = `GLAB-${randSegment()}-${randSegment()}-${randSegment()}`

            const { error } = await supabase.from('licenses').insert({
                key: newKey,
                status: 'active'
            })

            if (error) throw error
            setGeneratedKey(newKey)
        } catch (e: any) {
            console.error('Error generating key', e)
            alert('Lỗi tạo mã: ' + e.message)
        } finally {
            setIsGenerating(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="absolute-center w-full h-full flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 50, backdropFilter: 'blur(4px)' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                <div className="titlebar" style={{ position: 'relative' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Settings</h2>
                    <button className="btn btn-ghost p-0 w-8 h-8 rounded-full" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 flex-col gap-4">
                    <div className="flex-col gap-2">
                        <label className="text-muted" style={{ fontSize: '13px', fontWeight: 500 }}>DaVinci Resolve Templates Path</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value="~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Support/Fusion/Templates"
                                readOnly
                                className="w-full"
                                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--br-card)', color: 'var(--text-main)', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                            />
                            <button className="btn btn-ghost" style={{ border: '1px solid var(--br-card)' }}>
                                <FolderOpen size={16} />
                            </button>
                        </div>
                        <p className="text-muted" style={{ fontSize: '12px' }}>This is where effects will be stored when downloaded or copied.</p>
                    </div>

                    <div className="flex-col gap-2 mt-2">
                        <label className="text-muted" style={{ fontSize: '13px', fontWeight: 500 }}>Local Scan Path (Optional)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Select a folder to scan for local .drfx/.setting files"
                                readOnly
                                className="w-full"
                                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--br-card)', color: 'var(--text-main)', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                            />
                            <button className="btn btn-ghost" style={{ border: '1px solid var(--br-card)' }}>
                                <FolderOpen size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t flex-col gap-4" style={{ borderColor: 'var(--br-card)', background: 'rgba(0,0,0,0.1)' }}>
                    <div className="flex justify-between items-center w-full">
                        <span className="text-muted" style={{ fontSize: '12px' }}>v1.0.0</span>
                        <div className="flex gap-2">
                            <button className="btn btn-primary" onClick={() => window.api?.checkForUpdates?.()} style={{ fontSize: '12px', padding: '6px 12px' }}>Check for Updates</button>
                            <button className="btn btn-ghost" onClick={onClose}>Close</button>
                        </div>
                    </div>

                    <div className="flex-col gap-2 mt-2 pt-2" style={{ borderTop: '1px dashed rgba(255,255,255,0.05)' }}>
                        {isAdmin ? (
                            <>
                                <button className="btn btn-ghost w-full justify-between" onClick={lockAdmin} style={{ color: 'var(--success)', marginBottom: '12px' }}>
                                    <span className="flex items-center gap-2"><Unlock size={14} /> Admin Mode Enabled</span>
                                    <span style={{ fontSize: '11px', opacity: 0.7 }}>Click to Lock</span>
                                </button>

                                <div className="p-4" style={{ background: 'rgba(34,197,94,0.05)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)' }}>
                                    <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Key size={14} /> Trình tạo License Key
                                    </h3>
                                    <p className="text-muted" style={{ fontSize: '12px', marginBottom: '12px' }}>Tạo mã bản quyền ngẫu nhiên để cung cấp cho người mua.</p>

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={generatedKey || ''}
                                            readOnly
                                            placeholder="GLAB-XXXX-XXXX-XXXX"
                                            className="w-full"
                                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace' }}
                                        />
                                        <button
                                            className="btn btn-primary"
                                            onClick={generateLicenseKey}
                                            disabled={isGenerating}
                                            style={{ padding: '8px 16px', fontSize: '12px', whiteSpace: 'nowrap' }}
                                        >
                                            {isGenerating ? <Loader2 size={14} className="animate-pulse" /> : 'Tạo mới'}
                                        </button>
                                    </div>

                                    {generatedKey && (
                                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '12px' }}>
                                            <Check size={14} /> <span>Đã tạo & lưu vào hệ thống! Gửi mã trên cho khách hàng.</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2 w-full">
                                <Lock size={14} className="text-muted" />
                                <input
                                    type="password"
                                    value={passcode}
                                    onChange={handlePasscodeChange}
                                    placeholder="Developer Passcode..."
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '12px', outline: 'none', width: '100%' }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

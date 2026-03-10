import { useState, useEffect } from 'react'
import { X, Save, Globe, Zap, Crown, Link, Type, Loader2, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AdminSettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

export function AdminSettingsModal({ isOpen, onClose }: AdminSettingsModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)

    const [settings, setSettings] = useState({
        daily_price: '50.000đ',
        daily_url: 'https://zalo.me/',
        monthly_price: '200.000đ',
        monthly_url: 'https://zalo.me/',
        yearly_price: '1.500.000đ',
        yearly_url: 'https://zalo.me/',
        copyright_text: 'Collect by Giang Nguyen',
        copyright_url: 'https://www.facebook.com/giangphoto/'
    })

    useEffect(() => {
        if (isOpen) {
            fetchSettings()
        }
    }, [isOpen])

    const fetchSettings = async () => {
        setIsLoading(true)
        setSaveSuccess(false)
        try {
            const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single()
            if (error) {
                // If it doesn't exist yet, it's fine to rely on defaults
                console.warn('Could not fetch settings (might not exist yet):', error)
            } else if (data) {
                setSettings({
                    daily_price: data.daily_price,
                    daily_url: data.daily_url,
                    monthly_price: data.monthly_price,
                    monthly_url: data.monthly_url,
                    yearly_price: data.yearly_price,
                    yearly_url: data.yearly_url,
                    copyright_text: data.copyright_text,
                    copyright_url: data.copyright_url
                })
            }
        } catch (e) {
            console.error('Error fetching settings:', e)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        setSaveSuccess(false)
        try {
            const { error } = await supabase.from('app_settings').upsert({
                id: 1,
                ...settings,
                updated_at: new Date().toISOString()
            })
            if (error) throw error
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)

            // Trigger a broadcast so App.tsx can re-fetch
            window.dispatchEvent(new Event('app-settings-updated'))
        } catch (e: any) {
            console.error('Error saving settings:', e)
            alert('Lỗi khi lưu cấu hình: ' + e.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleChange = (key: keyof typeof settings, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }

    if (!isOpen) return null

    return (
        <div className="absolute-center w-full h-full flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 60, backdropFilter: 'blur(4px)' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="titlebar" style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Globe size={18} /> Cấu Hình Ứng Dụng
                    </h2>
                    <button className="btn btn-ghost p-0 w-8 h-8 rounded-full" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ padding: '20px', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="animate-pulse" /></div>
                    ) : (
                        <>
                            {/* Bảng Giá */}
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Cấu Hình Bảng Giá Bán</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                                    {/* Daily */}
                                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#a8b2d1' }}>
                                            <Globe size={16} /> <span style={{ fontSize: '13px', fontWeight: 500 }}>Gói 1 Ngày</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div>
                                                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Giá Hển Thị</label>
                                                <input type="text" value={settings.daily_price} onChange={e => handleChange('daily_price', e.target.value)} className="w-full mt-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '4px', color: 'white', fontSize: '12px' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Link Đăng Ký (Thanh toán)</label>
                                                <input type="text" value={settings.daily_url} onChange={e => handleChange('daily_url', e.target.value)} className="w-full mt-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '4px', color: 'white', fontSize: '12px' }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Monthly */}
                                    <div style={{ background: 'rgba(34,197,94,0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--primary)' }}>
                                            <Zap size={16} /> <span style={{ fontSize: '13px', fontWeight: 500 }}>Gói 1 Tháng (Phổ biến)</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div>
                                                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Giá Hển Thị</label>
                                                <input type="text" value={settings.monthly_price} onChange={e => handleChange('monthly_price', e.target.value)} className="w-full mt-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(34,197,94,0.2)', padding: '8px', borderRadius: '4px', color: 'white', fontSize: '12px' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Link Đăng Ký (Thanh toán)</label>
                                                <input type="text" value={settings.monthly_url} onChange={e => handleChange('monthly_url', e.target.value)} className="w-full mt-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(34,197,94,0.2)', padding: '8px', borderRadius: '4px', color: 'white', fontSize: '12px' }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Yearly */}
                                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', gridColumn: '1 / -1' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#fbbf24' }}>
                                            <Crown size={16} /> <span style={{ fontSize: '13px', fontWeight: 500 }}>Gói 1 Năm</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Giá Hển Thị</label>
                                                <input type="text" value={settings.yearly_price} onChange={e => handleChange('yearly_price', e.target.value)} className="w-full mt-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '4px', color: 'white', fontSize: '12px' }} />
                                            </div>
                                            <div style={{ flex: 2 }}>
                                                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Link Đăng Ký (Thanh toán)</label>
                                                <input type="text" value={settings.yearly_url} onChange={e => handleChange('yearly_url', e.target.value)} className="w-full mt-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '4px', color: 'white', fontSize: '12px' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bản Quyền */}
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Footer & Bản Quyền</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Type size={12} /> Chữ Hiển Thị</label>
                                        <input type="text" value={settings.copyright_text} onChange={e => handleChange('copyright_text', e.target.value)} className="w-full mt-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '4px', color: 'white', fontSize: '12px' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Link size={12} /> Link đính kèm</label>
                                        <input type="text" value={settings.copyright_url} onChange={e => handleChange('copyright_url', e.target.value)} className="w-full mt-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '4px', color: 'white', fontSize: '12px' }} />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                </div>

                <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.2)' }}>
                    {saveSuccess && <span style={{ color: 'var(--success)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14} /> Đã lưu</span>}
                    <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: '13px' }}>Đóng</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={isSaving || isLoading} style={{ fontSize: '13px', padding: '8px 24px', display: 'flex', gap: '8px' }}>
                        {isSaving ? <Loader2 size={16} className="animate-pulse" /> : <Save size={16} />}
                        Lưu Thiết Lập
                    </button>
                </div>
            </div>
        </div>
    )
}

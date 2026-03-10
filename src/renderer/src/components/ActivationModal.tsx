import { useState, useEffect } from 'react'
import { KeyRound, Loader2, CheckCircle2, ShieldAlert, Lock, Globe, Zap, Crown } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ActivationModalProps {
    onActivate: (isValid: boolean) => void;
    onAdminBypass: () => void;
    appSettings?: any;
}

export function ActivationModal({ onActivate, onAdminBypass, appSettings }: ActivationModalProps) {
    const [licenseKey, setLicenseKey] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [deviceId, setDeviceId] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    useEffect(() => {
        // Lấy device ID từ Electron thông qua IPC bridge
        window.api.getDeviceId().then(id => {
            setDeviceId(id)
            verifyStoredLicense(id)
        }).catch(err => {
            console.error('Failed to get device ID', err)
            setError('System error: Could not identify hardware ID.')
        })
    }, [])

    const verifyStoredLicense = async (currentDeviceId: string) => {
        const storedKey = localStorage.getItem('resolve_license_key')
        if (!storedKey) return // Chưa có key thì bắt nằm ngoài

        setIsLoading(true)
        await performActivationParams(storedKey, currentDeviceId, true)
    }

    const handleActivateSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!deviceId) return
        if (!licenseKey.trim()) {
            setError('Vui lòng nhập mã kích hoạt.')
            return
        }

        setIsLoading(true)
        setError(null)
        setSuccessMessage(null)
        await performActivationParams(licenseKey.trim().toUpperCase(), deviceId, false)
    }

    const performActivationParams = async (key: string, currentDeviceId: string, isSilentCheck: boolean) => {
        try {
            // 1. Tìm license trên DB
            const { data: license, error: dbError } = await supabase
                .from('licenses')
                .select('*')
                .eq('key', key)
                .single()

            if (dbError || !license) {
                throw new Error('Mã kích hoạt không tồn tại hoặc không hợp lệ.')
            }

            // 2. Kiểm tra trạng thái Key
            if (license.status !== 'active') {
                throw new Error('Mã kích hoạt này đã bị vô hiệu hóa hoặc thu hồi.')
            }

            // 2.5 Kiểm tra thời hạn
            if (license.expires_at && new Date(license.expires_at) < new Date()) {
                throw new Error('Mã kích hoạt này đã hết hạn sử dụng.')
            }

            // 3. Kiểm tra Device ID Bonding
            if (license.device_id) {
                // Key đã được dùng. Kiểm tra xem có trúng máy này không
                if (license.device_id !== currentDeviceId) {
                    throw new Error('Mã này đã được kích hoạt trên một thiết bị khác. Không thể chia sẻ mã.')
                } else {
                    // Hợp lệ, cho qua!
                    finalizeActivation(key)
                }
            } else {
                // Key chưa từng được kích hoạt. Tiến hành trói chặt cứng với máy này (Claiming)
                let newExpiresAt: string | null = null;
                const now = new Date();

                // Fallback to lifetime if type is missing (for older keys)
                const licenseType = license.type || 'lifetime';

                if (licenseType === 'daily') {
                    newExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
                } else if (licenseType === 'monthly') {
                    newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
                } else if (licenseType === 'yearly') {
                    newExpiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
                }

                const { error: updateError } = await supabase
                    .from('licenses')
                    .update({
                        device_id: currentDeviceId,
                        activated_at: now.toISOString(),
                        expires_at: newExpiresAt
                    })
                    .eq('key', key)
                    .is('device_id', null) // Double check for race conditions

                if (updateError) {
                    throw new Error('Có lỗi xảy ra khi dán nhãn bản quyền vào thiết bị. Vui lòng thử lại.')
                }

                finalizeActivation(key)
            }
        } catch (err: any) {
            console.error('Activation Error:', err)
            setError(err.message || 'Lỗi hệ thống khi đối chiếu máy chủ.')
            if (isSilentCheck) {
                // Xóa key hỏng lúc silent check
                localStorage.removeItem('resolve_license_key')
            }
            setIsLoading(false) // Dừng loading
        }
    }

    const finalizeActivation = (key: string) => {
        localStorage.setItem('resolve_license_key', key)
        setSuccessMessage('Kích hoạt bản quyền thành công! Chào mừng bạn.')

        setTimeout(() => {
            onActivate(true)
        }, 1500)
    }

    return (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(15px)', background: 'rgba(0,0,0,0.85)' }}>
            <div className="modal-content glass-panel" style={{
                maxWidth: '600px', width: '100%', padding: '24px 30px',
                textAlign: 'center', boxShadow: '0 20px 50px rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                maxHeight: '95vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
                    <KeyRound size={36} color="var(--primary)" />
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>Kích Hoạt Bản Quyền</h2>
                <p className="text-muted" style={{ fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>
                    Để sử dụng độ quyền kho tài nguyên Resolve Assets, vui lòng nhập mã bản quyền đã được cấp.
                </p>

                {error && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', textAlign: 'left', fontSize: '13px' }}>
                        <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{error}</span>
                    </div>
                )}

                {successMessage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', background: 'rgba(34,197,94,0.1)', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', fontWeight: 500, justifyContent: 'center' }}>
                        <CheckCircle2 size={18} />
                        <span>{successMessage}</span>
                    </div>
                )}

                <form onSubmit={handleActivateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ textAlign: 'left' }}>
                        <input
                            type="text"
                            value={licenseKey}
                            onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                            placeholder="Nhập mã GLAB-XXXX..."
                            disabled={isLoading || !!successMessage}
                            style={{
                                width: '100%', padding: '16px',
                                fontSize: '16px', letterSpacing: '2px',
                                textAlign: 'center',
                                fontFamily: 'monospace',
                                color: 'white',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'var(--bg-card)'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isLoading || !deviceId || !!successMessage || !licenseKey.trim()}
                        style={{ padding: '16px', fontSize: '15px', fontWeight: 600, letterSpacing: '0.5px' }}
                    >
                        {isLoading ? (
                            <><Loader2 size={18} className="animate-pulse" /> Đang kiểm tra mã...</>
                        ) : (
                            'Kích Hoạt Ngay'
                        )}
                    </button>

                    {!deviceId && !isLoading && (
                        <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '8px' }}>
                            Đang kết nối hệ thống phần cứng...
                        </p>
                    )}
                </form>

                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                    <Lock size={12} className="text-muted" />
                    <input
                        type="password"
                        placeholder="Developer Passcode..."
                        onChange={(e) => {
                            if (e.target.value === 'Bodobede@#12345') {
                                localStorage.setItem('resolve_is_admin', 'true')
                                onAdminBypass()
                            }
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '12px', outline: 'none', width: '150px', textAlign: 'center' }}
                    />
                </div>

                <div style={{ marginTop: '12px', fontSize: '11px', color: '#666', marginBottom: '20px' }}>
                    Hardware ID: {deviceId ? <span style={{ fontFamily: 'monospace', opacity: 0.5 }}>{deviceId.substring(0, 16)}...</span> : 'Loading...'}
                </div>

                {/* --- Subscription Pricing Section --- */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px', color: '#fff' }}>Chưa có mã bản quyền?</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>Chọn một gói phù hợp để mở khóa toàn bộ tài nguyên đỉnh cao.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        {/* Daily Plan */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ marginBottom: '8px' }}><Globe size={20} color="#a8b2d1" /></div>
                            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>1 Ngày</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '2px' }}>{appSettings?.daily_price || '50.000đ'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', flexGrow: 1 }}>Trải nghiệm nhanh</div>
                            <button className="btn btn-secondary w-full" onClick={() => window.api?.openExternal?.(appSettings?.daily_url || '#')} style={{ justifyContent: 'center', padding: '8px', fontSize: '12px' }}>Đăng Ký</button>
                        </div>

                        {/* Monthly Plan */}
                        <div style={{ background: 'linear-gradient(180deg, rgba(34, 197, 94, 0.1) 0%, rgba(255,255,255,0.03) 100%)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: '#000', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '10px' }}>HIỆU QUẢ</div>
                            <div style={{ marginBottom: '8px' }}><Zap size={20} color="var(--primary)" /></div>
                            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px', color: 'var(--primary)' }}>1 Tháng</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '2px' }}>{appSettings?.monthly_price || '200.000đ'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', flexGrow: 1 }}>Linh hoạt độ nhóm</div>
                            <button className="btn btn-primary w-full" onClick={() => window.api?.openExternal?.(appSettings?.monthly_url || '#')} style={{ justifyContent: 'center', padding: '8px', fontSize: '12px' }}>Đăng Ký</button>
                        </div>

                        {/* Yearly Plan */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ marginBottom: '8px' }}><Crown size={20} color="#fbbf24" /></div>
                            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px', color: '#fbbf24' }}>1 Năm</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '2px' }}>{appSettings?.yearly_price || '1.500.000đ'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', flexGrow: 1 }}>Sử dụng dài hạn</div>
                            <button className="btn btn-secondary w-full" onClick={() => window.api?.openExternal?.(appSettings?.yearly_url || '#')} style={{ justifyContent: 'center', padding: '8px', fontSize: '12px' }}>Đăng Ký</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

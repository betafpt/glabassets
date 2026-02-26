import { useState, useEffect } from 'react'
import { KeyRound, Loader2, CheckCircle2, ShieldAlert, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ActivationModalProps {
    onActivate: (isValid: boolean) => void;
    onAdminBypass: () => void;
}

export function ActivationModal({ onActivate, onAdminBypass }: ActivationModalProps) {
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
                const { error: updateError } = await supabase
                    .from('licenses')
                    .update({ device_id: currentDeviceId })
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
                maxWidth: '430px', width: '100%', padding: '40px 30px',
                textAlign: 'center', boxShadow: '0 20px 50px rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)'
            }}>
                <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', marginBottom: '24px' }}>
                    <KeyRound size={48} color="var(--primary)" />
                </div>

                <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Kích Hoạt Bản Quyền</h2>
                <p className="text-muted" style={{ fontSize: '14px', marginBottom: '32px', lineHeight: '1.6' }}>
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

                <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                    <Lock size={12} className="text-muted" />
                    <input
                        type="password"
                        placeholder="Developer Passcode..."
                        onChange={(e) => {
                            if (e.target.value === 'resolveadmin') {
                                localStorage.setItem('resolve_is_admin', 'true')
                                onAdminBypass()
                            }
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '12px', outline: 'none', width: '150px', textAlign: 'center' }}
                    />
                </div>

                <div style={{ marginTop: '16px', fontSize: '11px', color: '#666' }}>
                    Hardware ID: {deviceId ? <span style={{ fontFamily: 'monospace', opacity: 0.5 }}>{deviceId.substring(0, 16)}...</span> : 'Loading...'}
                </div>
            </div>
        </div>
    )
}

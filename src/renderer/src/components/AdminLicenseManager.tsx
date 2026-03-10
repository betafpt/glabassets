import { useState, useEffect } from 'react'
import { X, Key, Trash2, ShieldAlert, CheckCircle2, Copy } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AdminLicenseManagerProps {
    onClose: () => void
}

export function AdminLicenseManager({ onClose }: AdminLicenseManagerProps) {
    const [licenses, setLicenses] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Generation states
    const [genQuantity, setGenQuantity] = useState(1)
    const [genType, setGenType] = useState('lifetime')
    const [isGenerating, setIsGenerating] = useState(false)

    const fetchLicenses = async () => {
        try {
            setIsLoading(true)
            const { data, error } = await supabase
                .from('licenses')
                .select('*')
                .order('created_at', { ascending: false })
            if (error) throw error
            setLicenses(data || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchLicenses()
    }, [])

    const handleGenerate = async () => {
        if (genQuantity < 1 || genQuantity > 100) {
            alert('Quantity must be between 1 and 100')
            return
        }

        setIsGenerating(true)
        try {
            const newKeys = Array.from({ length: genQuantity }).map(() => ({
                key: `GLAB-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                type: genType
            }))

            const { error: insertError } = await supabase.from('licenses').insert(newKeys)
            if (insertError) throw insertError

            await fetchLicenses()
        } catch (err: any) {
            alert(`Generate Error: ${err.message}`)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleAction = async (id: string, action: 'revoke' | 'activate' | 'reset') => {
        if (!confirm(`Bạn có chắc muốn ${action} license này không?`)) return

        try {
            let updatePayload = {}
            if (action === 'revoke') updatePayload = { status: 'revoked' }
            else if (action === 'activate') updatePayload = { status: 'active' }
            else if (action === 'reset') updatePayload = { device_id: null, activated_at: null, expires_at: null }

            const { error: updateError } = await supabase
                .from('licenses')
                .update(updatePayload)
                .eq('id', id)

            if (updateError) throw updateError
            await fetchLicenses()
        } catch (err: any) {
            alert(`Action Error: ${err.message}`)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm(`Xóa vĩnh viễn license này?`)) return
        try {
            const { error } = await supabase.from('licenses').delete().eq('id', id)
            if (error) throw error
            await fetchLicenses()
        } catch (err: any) {
            alert(`Delete Error: ${err.message}`)
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2><Key size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /> Quản Lý Gói Đăng Ký (Licenses)</h2>
                    <button className="btn btn-secondary" onClick={onClose} style={{ padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Generator Section */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'flex-end', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
                    <div>
                        <label>Số lượng</label>
                        <input type="number" min="1" max="100" value={genQuantity} onChange={e => setGenQuantity(parseInt(e.target.value))} style={{ width: '80px' }} />
                    </div>
                    <div>
                        <label>Loại (Thời hạn)</label>
                        <select value={genType} onChange={e => setGenType(e.target.value)}>
                            <option value="daily">1 Ngày (Daily)</option>
                            <option value="monthly">1 Tháng (Monthly)</option>
                            <option value="yearly">1 Năm (Yearly)</option>
                            <option value="lifetime">Vĩnh Viễn (Lifetime)</option>
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating}>
                        {isGenerating ? 'Đang tạo...' : '+ Tạo Mã Mới'}
                    </button>
                </div>

                {error && <div style={{ color: '#ff6b6b', marginBottom: '16px' }}>{error}</div>}

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: '12px 8px' }}>Key</th>
                                <th style={{ padding: '12px 8px' }}>Gói</th>
                                <th style={{ padding: '12px 8px' }}>Trạng Thái</th>
                                <th style={{ padding: '12px 8px' }}>Máy (Device ID)</th>
                                <th style={{ padding: '12px 8px' }}>Hết Hạn</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Đang tải...</td></tr>
                            ) : licenses.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Chưa có mã bản quyền nào.</td></tr>
                            ) : (
                                licenses.map(lic => (
                                    <tr key={lic.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '12px 8px', fontFamily: 'monospace', position: 'relative' }}>
                                            {lic.key}
                                            <button onClick={() => navigator.clipboard.writeText(lic.key)} style={{ background: 'none', border: 'none', color: '#a8b2d1', cursor: 'pointer', marginLeft: '8px' }} title="Copy">
                                                <Copy size={12} />
                                            </button>
                                        </td>
                                        <td style={{ padding: '12px 8px', textTransform: 'capitalize' }}>
                                            <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '11px' }}>{lic.type || 'lifetime'}</span>
                                        </td>
                                        <td style={{ padding: '12px 8px' }}>
                                            {lic.status === 'active' ?
                                                <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14} /> Active</span> :
                                                <span style={{ color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldAlert size={14} /> Banned</span>
                                            }
                                        </td>
                                        <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: '12px', color: lic.device_id ? '#fff' : '#666' }}>
                                            {lic.device_id ? lic.device_id.substring(0, 16) + '...' : 'Chưa kích hoạt'}
                                        </td>
                                        <td style={{ padding: '12px 8px', fontSize: '12px', color: '#aaa' }}>
                                            {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString('vi-VN') + ' ' + new Date(lic.expires_at).toLocaleTimeString('vi-VN') : (lic.type === 'lifetime' || !lic.type) ? 'Không bao giờ' : 'Chưa có'}
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleAction(lic.id, 'reset')} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} title="Gỡ máy tính hiện tại để nhập sang máy khác">Reset Máy</button>
                                            {lic.status === 'active' ? (
                                                <button onClick={() => handleAction(lic.id, 'revoke')} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', color: '#ff6b6b' }} title="Khóa mã này">Ban</button>
                                            ) : (
                                                <button onClick={() => handleAction(lic.id, 'activate')} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--primary)' }} title="Mở khóa mã này">Unban</button>
                                            )}
                                            <button onClick={() => handleDelete(lic.id)} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '12px', color: '#ff6b6b' }}><Trash2 size={14} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    )
}

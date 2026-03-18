import { useState } from 'react'
import { supabase } from '../config/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { User, Lock, Camera, CheckCircle, XCircle, Loader2, Save, KeyRound } from 'lucide-react'

export default function ProfilePage() {
    const { user, updateUser } = useAuth()
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })

    // Password states
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    })

    const handleAvatarUpload = async (e) => {
        try {
            setUploading(true)
            const file = e.target.files[0]
            if (!file) return

            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Math.random()}.${fileExt}`
            const filePath = `avatars/${fileName}`

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // 3. Update User Table
            const { error: updateError } = await supabase
                .from('users')
                .update({ avatar: publicUrl })
                .eq('id', user.id)

            if (updateError) throw updateError

            // 4. Update Context
            updateUser({ avatar: publicUrl })
            setMessage({ type: 'success', text: 'อัพโหลดรูปโปรไฟล์เรียบร้อยแล้ว' })
        } catch (err) {
            console.error(err)
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการอัพโหลดรูป' })
        } finally {
            setUploading(false)
        }
    }

    const handlePasswordChange = async (e) => {
        e.preventDefault()
        if (passwords.new !== passwords.confirm) {
            return setMessage({ type: 'error', text: 'รหัสผ่านใหม่ไม่ตรงกัน' })
        }

        try {
            setLoading(true)
            
            // 1. Verify current password
            const { data: checkUser, error: checkError } = await supabase
                .from('users')
                .select('password')
                .eq('id', user.id)
                .single()

            if (checkError) throw checkError
            if (checkUser.password !== passwords.current) {
                return setMessage({ type: 'error', text: 'รหัสผ่านเดิมไม่ถูกต้อง' })
            }

            // 2. Update new password
            const { error: updateError } = await supabase
                .from('users')
                .update({ password: passwords.new })
                .eq('id', user.id)

            if (updateError) throw updateError

            setMessage({ type: 'success', text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' })
            setPasswords({ current: '', new: '', confirm: '' })
        } catch (err) {
            console.error(err)
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
                <h1>👤 โปรไฟล์ส่วนตัว</h1>
                <p>จัดการข้อมูลส่วนตัวและตั้งค่าความปลอดภัย</p>
            </div>

            {message.text && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} animate-slide-up`} 
                     style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    {message.text}
                </div>
            )}

            <div className="grid-2">
                {/* Profile Card */}
                <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
                    <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <div style={{ 
                                width: '120px', height: '120px', borderRadius: '35px', 
                                overflow: 'hidden', border: '4px solid white', 
                                boxShadow: 'var(--shadow-lg-premium)', background: 'var(--bg-tertiary)'
                            }}>
                                {uploading ? (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Loader2 className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                                    </div>
                                ) : (
                                    <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                )}
                            </div>
                            <label className="top-nav-icon-btn" style={{ 
                                position: 'absolute', bottom: '-5px', right: '-5px', 
                                width: '36px', height: '36px', background: 'var(--accent-primary)', 
                                color: 'white', cursor: 'pointer', border: '3px solid var(--bg-secondary)'
                            }}>
                                <Camera size={18} />
                                <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                            </label>
                        </div>
                        <h3 style={{ marginTop: 'var(--space-md)', fontSize: '1.25rem' }}>{user.name}</h3>
                        <span className="badge badge-primary">{user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'นักเรียน'}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                            <div style={{ color: 'var(--accent-primary)' }}><User size={20} /></div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>รหัสพนักงาน / อีเมล</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{user.employeeId || user.email}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                            <div style={{ color: 'var(--accent-secondary)' }}><CheckCircle size={20} /></div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>แผนก / สังกัด</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{user.department || 'ไม่ระบุ'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Password Change Card */}
                <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', borderRadius: '12px' }}>
                            <KeyRound size={22} />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>เปลี่ยนรหัสผ่าน</h3>
                    </div>

                    <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group">
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', display: 'block' }}>รหัสผ่านเดิม</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input 
                                    type="password" 
                                    className="form-control" 
                                    style={{ paddingLeft: '40px' }}
                                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                                    value={passwords.current}
                                    onChange={e => setPasswords({...passwords, current: e.target.value})}
                                    required 
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', display: 'block' }}>รหัสผ่านใหม่</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input 
                                    type="password" 
                                    className="form-control" 
                                    style={{ paddingLeft: '40px' }}
                                    placeholder="รหัสผ่านใหม่"
                                    value={passwords.new}
                                    onChange={e => setPasswords({...passwords, new: e.target.value})}
                                    required 
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', display: 'block' }}>ยืนยันรหัสผ่านใหม่</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input 
                                    type="password" 
                                    className="form-control" 
                                    style={{ paddingLeft: '40px' }}
                                    placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                                    value={passwords.confirm}
                                    onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                                    required 
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ height: '48px', marginTop: 'var(--space-sm)' }}>
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> บันทึกการเปลี่ยนแปลง</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

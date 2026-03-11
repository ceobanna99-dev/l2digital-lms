import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react'

export default function LoginPage() {
    const { login } = useAuth()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const result = await login(username, password)
        if (!result.success) {
            setError(result.error)
        }
        setLoading(false)
    }

    const fillDemo = (demoUsername, demoPass) => {
        setUsername(demoUsername)
        setPassword(demoPass)
        setError('')
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">
                    <div className="login-logo-icon">📞</div>
                    <h1>Call Center Academy</h1>
                    <p>ระบบ E-Learning สำหรับพนักงาน</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">รหัสพนักงาน / อีเมล</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: '2.5rem' }}
                                placeholder="กรอกรหัสพนักงาน หรือ อีเมล"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">รหัสผ่าน</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                                placeholder="กรอกรหัสผ่าน"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                        {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                    </button>
                </form>

                <div className="login-demo" style={{ marginTop: 'var(--space-lg)' }}>
                    <p>บัญชีทดสอบ (คลิกเพื่อกรอกอัตโนมัติ)</p>
                    <div className="login-demo-accounts" style={{ marginTop: 'var(--space-sm)' }}>
                        <code
                            onClick={() => fillDemo('admin@callcenter.com', 'admin123')}
                            style={{ cursor: 'pointer' }}
                        >
                            👑 Admin: admin@callcenter.com / admin123
                        </code>
                        <code
                            onClick={() => fillDemo('somying@callcenter.com', 'student123')}
                            style={{ cursor: 'pointer' }}
                        >
                            👩 นักเรียน: somying@callcenter.com / student123
                        </code>
                    </div>
                </div>
            </div>
        </div>
    )
}

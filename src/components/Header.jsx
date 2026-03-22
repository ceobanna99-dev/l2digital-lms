import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { BookOpen, LayoutDashboard, FileText, Users, ClipboardList, LogOut, Menu, X, Bell, ChevronDown, User, Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

export default function Header() {
    const { user, logout } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const [notifOpen, setNotifOpen] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        if (!user) return
        
        const fetchNotifications = async () => {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5)
            
            if (data) {
                setNotifications(data)
                
                // Real count of ALL unread
                const { count } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('is_read', false)
                if (count !== null) setUnreadCount(count)
            }
        }

        fetchNotifications()

        // Realtime subscription
        const channel = supabase
            .channel('notifications_changes')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            }, () => {
                fetchNotifications()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user?.id])

    const markAllAsRead = async () => {
        if (unreadCount === 0) return
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false)
        
        if (!error) {
            setUnreadCount(0)
            setNotifications(p => p.map(n => ({ ...n, is_read: true })))
        }
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const studentLinks = [
        { to: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
        { to: '/courses', label: 'คอร์สเรียน', icon: BookOpen },
    ]

    const adminLinks = [
        { to: '/admin', label: 'แดชบอร์ด', icon: LayoutDashboard },
        { to: '/admin/content', label: 'เนื้อหา', icon: FileText },
        { to: '/admin/quizzes', label: 'ข้อสอบ', icon: ClipboardList },
        { to: '/admin/students', label: 'นักเรียน', icon: Users },
    ]

    const links = user?.role === 'admin' ? adminLinks : studentLinks

    return (
        <>
            <header className="top-nav">
                <div className="top-nav-inner">
                    {/* Logo */}
                    <div className="top-nav-brand" onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                        <img src="/logo.jpg" alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                        <span className="top-nav-logo-text" style={{ fontSize: '1.3rem' }}>L2 Mobile Network Academy</span>
                    </div>

                    {/* Desktop Menu */}
                    <nav className="top-nav-menu">
                        {links.map(link => (
                            <NavLink key={link.to} to={link.to} end={link.to === '/admin'}
                                className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>
                                <link.icon size={16} />
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Right Side */}
                    <div className="top-nav-right">
                        <button className="top-nav-icon-btn" onClick={toggleTheme} title={theme === 'light' ? 'เปิดโหมดมืด' : 'เปิดโหมดสว่าง'}>
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                        
                        <div className="top-nav-notifications" style={{ position: 'relative' }}>
                            <button className="top-nav-icon-btn" onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}>
                                <Bell size={18} />
                                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                            </button>
                            
                            {notifOpen && (
                                <div className="notif-dropdown">
                                    <div className="notif-dropdown-header">
                                        <span>การแจ้งเตือน</span>
                                        {unreadCount > 0 && <button onClick={markAllAsRead}>อ่านทั้งหมด</button>}
                                    </div>
                                    <div className="notif-list">
                                        {notifications.length > 0 ? (
                                            notifications.map(n => (
                                                <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`} onClick={() => { navigate(n.link); setNotifOpen(false); }}>
                                                    <div className="notif-title">{n.title}</div>
                                                    <div className="notif-content">{n.content}</div>
                                                    <div className="notif-time">{new Date(n.created_at).toLocaleDateString('th-TH')}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="notif-empty">ไม่มีการแจ้งเตือน</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile Dropdown */}
                        <div className="top-nav-profile" onClick={() => setProfileOpen(!profileOpen)}>
                            <img src={user?.avatar} alt={user?.name} className="top-nav-avatar" />
                            <span className="top-nav-username">{user?.name}</span>
                            <ChevronDown size={14} />

                            {profileOpen && (
                                <div className="profile-dropdown">
                                    <div className="profile-dropdown-header">
                                        <img src={user?.avatar} alt={user?.name} />
                                        <div>
                                            <div className="profile-dropdown-name">{user?.name}</div>
                                            <div className="profile-dropdown-role">{user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'นักเรียน'}</div>
                                        </div>
                                    </div>
                                    <div className="profile-dropdown-divider" />
                                    <button className="profile-dropdown-item" onClick={() => { navigate('/profile'); setProfileOpen(false); }}>
                                        <User size={16} /> แก้ไขข้อมูลส่วนตัว
                                    </button>
                                    <button className="profile-dropdown-item" onClick={handleLogout}>
                                        <LogOut size={16} /> ออกจากระบบ
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button className="top-nav-mobile-btn" onClick={() => setMobileOpen(!mobileOpen)}>
                            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileOpen && (
                    <div className="top-nav-mobile-menu">
                        {links.map(link => (
                            <NavLink key={link.to} to={link.to} end={link.to === '/admin'}
                                className={({ isActive }) => `top-nav-mobile-link ${isActive ? 'active' : ''}`}
                                onClick={() => setMobileOpen(false)}>
                                <link.icon size={18} />
                                {link.label}
                            </NavLink>
                        ))}
                        <NavLink to="/profile" className={({ isActive }) => `top-nav-mobile-link ${isActive ? 'active' : ''}`}
                            onClick={() => setMobileOpen(false)}>
                            <User size={18} /> แก้ไขข้อมูลส่วนตัว
                        </NavLink>
                        <button className="top-nav-mobile-link" onClick={handleLogout} style={{ color: 'var(--accent-danger)' }}>
                            <LogOut size={18} /> ออกจากระบบ
                        </button>
                    </div>
                )}
            </header>

            {/* Click outside to close profile/notif dropdown */}
            {(profileOpen || notifOpen) && <div className="profile-overlay" onClick={() => { setProfileOpen(false); setNotifOpen(false); }} />}
        </>
    )
}

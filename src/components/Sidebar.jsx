import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LayoutDashboard, BookOpen, GraduationCap, BarChart3, FileText, Users, Settings, LogOut } from 'lucide-react'

export default function Sidebar({ isOpen, onClose }) {
    const { user, logout, isAdmin } = useAuth()
    const location = useLocation()

    const studentLinks = [
        { path: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
        { path: '/courses', label: 'คอร์สเรียน', icon: BookOpen },
    ]

    const adminLinks = [
        { path: '/admin', label: 'ภาพรวม', icon: BarChart3 },
        { path: '/admin/content', label: 'จัดการเนื้อหา', icon: FileText },
        { path: '/admin/quizzes', label: 'จัดการข้อสอบ', icon: GraduationCap },
        { path: '/admin/students', label: 'ผลนักเรียน', icon: Users },
    ]

    const links = isAdmin ? adminLinks : studentLinks

    const handleLogout = () => {
        logout()
        onClose()
    }

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-brand">
                <div className="sidebar-brand-icon">📞</div>
                <div className="sidebar-brand-text">
                    <h2>Call Center</h2>
                    <span>Academy</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section-title">
                    {isAdmin ? 'จัดการระบบ' : 'เมนูหลัก'}
                </div>
                {links.map((link) => {
                    const Icon = link.icon
                    const isActive = location.pathname === link.path || (link.path !== '/dashboard' && link.path !== '/admin' && location.pathname.startsWith(link.path))
                    return (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={`sidebar-link ${isActive ? 'active' : ''}`}
                            onClick={onClose}
                        >
                            <Icon className="link-icon" size={20} />
                            <span>{link.label}</span>
                        </NavLink>
                    )
                })}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <img src={user?.avatar} alt={user?.name} className="sidebar-user-avatar" />
                    <div className="sidebar-user-info">
                        <div className="name">{user?.name}</div>
                        <div className="role">{isAdmin ? 'ผู้ดูแลระบบ' : user?.department}</div>
                    </div>
                </div>
                <button className="sidebar-link" onClick={handleLogout} style={{ marginTop: '0.5rem', width: '100%' }}>
                    <LogOut className="link-icon" size={20} />
                    <span>ออกจากระบบ</span>
                </button>
            </div>
        </aside>
    )
}

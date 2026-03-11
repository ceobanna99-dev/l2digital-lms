import { Outlet } from 'react-router-dom'
import Header from './Header'

export default function Layout() {
    return (
        <div className="app-container">
            <Header />
            <main className="page-content">
                <Outlet />
            </main>
            <footer className="site-footer">
                <p>© 2026 - Learning Management System by <strong>L2 Mobile Network Academy</strong></p>
            </footer>
        </div>
    )
}

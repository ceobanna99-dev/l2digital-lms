import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CoursesPage from './pages/CoursesPage'
import CourseDetailPage from './pages/CourseDetailPage'
import LessonPage from './pages/LessonPage'
import QuizPage from './pages/QuizPage'
import QuizResultPage from './pages/QuizResultPage'
import ProfilePage from './pages/ProfilePage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import ContentManagerPage from './pages/admin/ContentManagerPage'
import QuizManagerPage from './pages/admin/QuizManagerPage'
import StudentProgressPage from './pages/admin/StudentProgressPage'
import Layout from './components/Layout'

function ProtectedRoute({ children, adminOnly = false }) {
    const { user, loading } = useAuth()

    if (loading) return <div className="loading-spinner" />

    if (!user) return <Navigate to="/login" replace />

    if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />

    return children
}

function AppRoutes() {
    const { user } = useAuth()

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace /> : <LoginPage />} />

            {/* Student Routes */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route path="courses/:id" element={<CourseDetailPage />} />
                <Route path="lessons/:id" element={<LessonPage />} />
                <Route path="quiz/:id" element={<QuizPage />} />
                <Route path="quiz-result/:id" element={<QuizResultPage />} />
                <Route path="profile" element={<ProfilePage />} />

                {/* Admin Routes */}
                <Route path="admin" element={<ProtectedRoute adminOnly><AdminDashboardPage /></ProtectedRoute>} />
                <Route path="admin/content" element={<ProtectedRoute adminOnly><ContentManagerPage /></ProtectedRoute>} />
                <Route path="admin/quizzes" element={<ProtectedRoute adminOnly><QuizManagerPage /></ProtectedRoute>} />
                <Route path="admin/students" element={<ProtectedRoute adminOnly><StudentProgressPage /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    )
}

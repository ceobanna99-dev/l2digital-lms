import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Users, BookOpen, FileQuestion, TrendingUp, Trophy, Star, MessageSquare, GraduationCap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

export default function AdminDashboardPage() {
    const [users, setUsers] = useState([])
    const [courses, setCourses] = useState([])
    const [quizResults, setQuizResults] = useState([])
    const [lessonProgress, setLessonProgress] = useState([])
    const [lessonRatings, setLessonRatings] = useState([])
    const [loading, setLoading] = useState(true)
    const [lessons, setLessons] = useState([])

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const [
                    { data: u },
                    { data: c },
                    { data: qr },
                    { data: lp },
                    { data: lr },
                    { data: l }
                ] = await Promise.all([
                    supabase.from('users').select('*').eq('role', 'student'),
                    supabase.from('courses').select('*'),
                    supabase.from('quizResults').select('*'),
                    supabase.from('lessonProgress').select('*'),
                    // Using Supabase joins for ratings: we'll get user and lesson info
                    supabase.from('lessonRatings')
                        .select(`
                            *,
                            user:users(*),
                            lesson:lessons(*)
                        `)
                        .order('createdAt', { ascending: false }),
                    supabase.from('lessons').select('*')
                ])

                setUsers(u || [])
                setCourses(c || [])
                setQuizResults(qr || [])
                setLessonProgress(lp || [])
                setLessonRatings(lr || [])
                setLessons(l || [])
            } catch (err) {
                console.error("Error loading admin dashboard:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchAdminData()
    }, [])

    if (loading) return <div className="loading-spinner" />

    const totalStudents = users.length
    const avgScore = quizResults.length > 0
        ? Math.round(quizResults.reduce((a, b) => a + b.score, 0) / quizResults.length)
        : 0
    const completedLessons = lessonProgress.filter(l => l.completed).length
    const passRate = quizResults.length > 0
        ? Math.round((quizResults.filter(r => r.score >= 60).length / quizResults.length) * 100)
        : 0
    const avgRating = lessonRatings.length > 0
        ? (lessonRatings.reduce((a, b) => a + b.rating, 0) / lessonRatings.length).toFixed(1)
        : 0

    const completedStudentsCount = lessons.length > 0 
        ? users.filter(u => lessonProgress.filter(p => p.userId === u.id && p.completed).length === lessons.length).length
        : 0;

    const stats = [
        { icon: Users, label: 'นักเรียนทั้งหมด', value: totalStudents, color: '#7c3aed' },
        { icon: BookOpen, label: 'คอร์สทั้งหมด', value: courses.length, color: '#06b6d4' },
        { icon: GraduationCap, label: 'เรียนจบแล้ว', value: completedStudentsCount, color: '#3b82f6' },
        { icon: TrendingUp, label: 'คะแนนเฉลี่ย', value: `${avgScore}%`, color: '#f59e0b' },
        { icon: Trophy, label: 'อัตราผ่าน', value: `${passRate}%`, color: '#10b981' },
        { icon: Star, label: 'ความพึงพอใจ', value: `${avgRating}/5`, color: '#ec4899' },
    ]

    // Score distribution for pie chart
    const scoreRanges = [
        { name: '90-100%', value: quizResults.filter(r => r.score >= 90).length },
        { name: '70-89%', value: quizResults.filter(r => r.score >= 70 && r.score < 90).length },
        { name: '50-69%', value: quizResults.filter(r => r.score >= 50 && r.score < 70).length },
        { name: '<50%', value: quizResults.filter(r => r.score < 50).length },
    ].filter(r => r.value > 0)

    const PIE_COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444']

    // Per-student performance
    const studentPerformance = users.map(u => {
        const results = quizResults.filter(r => r.userId === u.id)
        const avg = results.length > 0 ? Math.round(results.reduce((a, b) => a + b.score, 0) / results.length) : 0
        const progress = lessonProgress.filter(p => p.userId === u.id && p.completed).length
        return { name: u.name, คะแนนเฉลี่ย: avg, บทเรียน: progress }
    })

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>📊 ภาพรวมระบบ</h1>
                <p>สรุปข้อมูลการเรียนการสอนทั้งหมด</p>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                {stats.map((stat, i) => {
                    const Icon = stat.icon
                    return (
                        <div key={i} className={`glass-card stat-card animate-slide-up stagger-${i + 1}`}>
                            <div className="stat-icon" style={{ background: `${stat.color}20` }}>
                                <Icon size={24} style={{ color: stat.color }} />
                            </div>
                            <div className="stat-value">{stat.value}</div>
                            <div className="stat-label">{stat.label}</div>
                        </div>
                    )
                })}
            </div>

            {/* Charts */}
            <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="glass-card glass-card--static">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                        คะแนนรายบุคคล
                    </h3>
                    <div style={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={studentPerformance} margin={{ bottom: 60, top: 20, right: 20, left: 0 }}>
                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.85rem'
                                    }}
                                />
                                <Bar dataKey="คะแนนเฉลี่ย" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card glass-card--static">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                        การกระจายคะแนน
                    </h3>
                    <div style={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={scoreRanges}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                >
                                    {scoreRanges.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.85rem'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Comments */}
            <div className="glass-card glass-card--static" style={{ marginBottom: 'var(--space-xl)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={18} style={{ color: 'var(--accent-primary)' }}/>
                    ความคิดเห็นล่าสุดจากนักเรียน
                </h3>
                {lessonRatings.filter(r => r.comment).length > 0 ? (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                        gap: 'var(--space-md)',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        paddingRight: '8px'
                    }}>
                        {lessonRatings.filter(r => r.comment).slice(0, 20).map(r => (
                            <div key={r.id} style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <img src={r.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.userId}`} alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{r.user?.name || `Student ${r.userId}`}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star key={star} size={12} fill={r.rating >= star ? '#f59e0b' : 'transparent'} color={r.rating >= star ? '#f59e0b' : '#cbd5e1'} />
                                        ))}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>
                                    บทเรียน: {r.lesson?.title || `Lesson ${r.lessonId}`}
                                </div>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                    "{r.comment}"
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <MessageSquare size={32} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-sm)', opacity: 0.5 }} />
                        <p>ยังไม่มีความคิดเห็นในขณะนี้</p>
                    </div>
                )}
            </div>

            {/* Student Table */}
            <div className="glass-card glass-card--static">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                    รายชื่อนักเรียน
                </h3>
                <div className="admin-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ชื่อ</th>
                                <th>แผนก</th>
                                <th>บทเรียนที่เรียน</th>
                                <th>คะแนนเฉลี่ย</th>
                                <th>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => {
                                const results = quizResults.filter(r => r.userId === u.id)
                                const avg = results.length > 0 ? Math.round(results.reduce((a, b) => a + b.score, 0) / results.length) : 0
                                const progress = lessonProgress.filter(p => p.userId === u.id && p.completed).length
                                return (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="flex items-center gap-sm">
                                                <img src={u.avatar} alt={u.name} style={{ width: 32, height: 32, borderRadius: '50%' }} />
                                                {u.name}
                                            </div>
                                        </td>
                                        <td>{u.department}</td>
                                        <td>{progress}/{lessons.length} บท ({lessons.length > 0 ? Math.round((progress/lessons.length)*100) : 0}%)</td>
                                        <td>
                                            <span style={{ fontWeight: 600, color: avg >= 60 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                                {avg}%
                                            </span>
                                        </td>
                                        <td>
                                            {avg >= 80 ? (
                                                <span className="badge badge-success">ดีเยี่ยม</span>
                                            ) : avg >= 60 ? (
                                                <span className="badge badge-warning">ผ่าน</span>
                                            ) : results.length > 0 ? (
                                                <span className="badge badge-danger">ต้องปรับปรุง</span>
                                            ) : (
                                                <span className="badge badge-info">ยังไม่สอบ</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Users, BookOpen, FileQuestion, TrendingUp, Trophy, Star, MessageSquare, GraduationCap, XCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

export default function AdminDashboardPage() {
    const [users, setUsers] = useState([])
    const [courses, setCourses] = useState([])
    const [quizResults, setQuizResults] = useState([])
    const [lessonProgress, setLessonProgress] = useState([])
    const [lessonRatings, setLessonRatings] = useState([])
    const [loading, setLoading] = useState(true)
    const [lessons, setLessons] = useState([])
    const [filterRange, setFilterRange] = useState(null)

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
                    supabase.from('quizResults').select('*, quiz:quizzes(*)'),
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
        { icon: Star, label: 'ความพึงพอใจโดยรวม', value: `${avgRating}/5`, color: '#ec4899' },
    ]

    // Per-course performance metrics
    const courseMetrics = courses.map(c => {
        const results = quizResults.filter(r => r.quiz?.courseId === c.id)
        const avgScore = results.length > 0
            ? Math.round(results.reduce((a, b) => a + b.score, 0) / results.length)
            : 0
        const passRate = results.length > 0
            ? Math.round((results.filter(r => r.score >= 60).length / results.length) * 100)
            : 0
        return {
            ...c,
            avgScore,
            passRate,
            totalAttempts: results.length
        }
    })

    const PIE_COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444']

    // Per-student performance
    const studentPerformance = users.map(u => {
        const results = quizResults.filter(r => r.userId === u.id)
        const avg = results.length > 0 ? Math.round(results.reduce((a, b) => a + b.score, 0) / results.length) : 0
        const progress = lessonProgress.filter(p => p.userId === u.id && p.completed).length
        return { name: u.name, คะแนนเฉลี่ย: avg, บทเรียน: progress, id: u.id }
    })

    // Score distribution for donut chart (Student-based)
    const scoreRanges = [
        { name: 'ดีเยี่ยม (90-100%)', range: [90, 100], color: '#10b981' },
        { name: 'ดี (70-89%)', range: [70, 89], color: '#06b6d4' },
        { name: 'พอใช้ (50-69%)', range: [50, 69], color: '#f59e0b' },
        { name: 'ต้องปรับปรุง (<50%)', range: [0, 49], color: '#ef4444' },
    ].map(r => {
        const count = studentPerformance.filter(s => s.คะแนนเฉลี่ย >= r.range[0] && s.คะแนนเฉลี่ย <= r.range[1]).length
        return {
            ...r,
            value: count,
            percentage: users.length > 0 ? Math.round((count / users.length) * 100) : 0
        }
    }).filter(r => r.value > 0)

    const totalQuizzes = quizResults.length

    // Filtered users for table
    const filteredUsers = filterRange 
        ? users.filter(u => {
            const perf = studentPerformance.find(p => p.id === u.id)
            return perf && perf.คะแนนเฉลี่ย >= filterRange.range[0] && perf.คะแนนเฉลี่ย <= filterRange.range[1]
        })
        : users

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>📊 ภาพรวมระบบ</h1>
                <p>สรุปข้อมูลการเรียนการสอนทั้งหมด</p>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)' }}>
                {stats.map((stat, i) => {
                    const Icon = stat.icon
                    return (
                        <div key={i} className={`glass-card stat-card animate-slide-up stagger-${i + 1}`}>
                            <div className="stat-icon" style={{ background: `${stat.color}20` }}>
                                <Icon size={24} style={{ color: stat.color }} />
                            </div>
                            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{stat.value}</div>
                            <div className="stat-label">{stat.label}</div>
                        </div>
                    )
                })}
            </div>

            {/* Course Metrics Section */}
            <div className="animate-slide-up stagger-4" style={{ marginBottom: 'var(--space-xl)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={20} style={{ color: 'var(--accent-warning)' }} /> ประสิทธิภาพตามคอร์สเรียน
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
                    {courseMetrics.map(course => (
                        <div key={course.id} className="glass-card" style={{ padding: 'var(--space-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--space-md)' }}>
                                <span style={{ fontSize: '1.5rem' }}>{course.thumbnail}</span>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{course.category}</div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>คะแนนเฉลี่ย</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{course.avgScore}%</div>
                                </div>
                                <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>อัตราผ่าน (60%)</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-success)' }}>{course.passRate}%</div>
                                </div>
                            </div>
                            <div style={{ marginTop: 'var(--space-sm)', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {course.totalAttempts} ครั้งทดสอบ
                            </div>
                        </div>
                    ))}
                </div>
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
                    <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-lg)' }}>
                        <div style={{ width: '50%', height: '100%', position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={scoreRanges}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={false}
                                    >
                                        {scoreRanges.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            fontSize: '0.85rem'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>นักเรียนทั้งหมด</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{users.length}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>คน</div>
                            </div>
                        </div>
                        <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {scoreRanges.map((range, i) => {
                                const isActive = filterRange?.name === range.name
                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => setFilterRange(isActive ? null : range)}
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '10px', 
                                            cursor: 'pointer',
                                            padding: '8px',
                                            borderRadius: '8px',
                                            background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                                            transition: 'all 0.2s',
                                            border: isActive ? '1px solid var(--border-color)' : '1px solid transparent'
                                        }}
                                    >
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: range.color }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isActive ? 'var(--accent-primary)' : 'inherit' }}>{range.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{range.value} คน ({range.percentage}%)</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>


            {/* Student Table */}
            <div className="glass-card glass-card--static" id="student-list">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                        รายชื่อนักเรียน {filterRange && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> - กลุ่ม{filterRange.name}</span>}
                    </h3>
                    {filterRange && (
                        <button 
                            className="btn btn-ghost btn-sm" 
                            onClick={() => setFilterRange(null)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-danger)' }}
                        >
                            <XCircle size={14} /> ล้างการกรอง
                        </button>
                    )}
                </div>
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
                            {filteredUsers.map(u => {
                                const perf = studentPerformance.find(p => p.id === u.id)
                                const avg = perf?.คะแนนเฉลี่ย || 0
                                const progress = perf?.บทเรียน || 0
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
                                            ) : quizResults.filter(r => r.userId === u.id).length > 0 ? (
                                                <span className="badge badge-danger">ต้องปรับปรุง</span>
                                            ) : (
                                                <span className="badge badge-info">ยังไม่สอบ</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                                        ไม่พบรายชื่อในกลุ่มนี้
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Comments - Moved to bottom & Compacted */}
            <div className="glass-card glass-card--static" style={{ marginTop: 'var(--space-xl)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={16} style={{ color: 'var(--accent-primary)' }}/>
                    ความคิดเห็นล่าสุด
                </h3>
                {lessonRatings.filter(r => r.comment).length > 0 ? (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
                        gap: 'var(--space-sm)',
                        maxHeight: '320px',
                        overflowY: 'auto',
                        paddingRight: '6px'
                    }}>
                        {lessonRatings.filter(r => r.comment).map(r => (
                            <div key={r.id} style={{ 
                                padding: 'var(--space-sm)', 
                                background: 'var(--bg-secondary)', 
                                borderRadius: 'var(--radius-md)', 
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <img src={r.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.userId}`} alt="avatar" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{r.user?.name || `Student ${r.userId}`}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star key={star} size={10} fill={r.rating >= star ? '#f59e0b' : 'transparent'} color={r.rating >= star ? '#f59e0b' : '#cbd5e1'} />
                                        ))}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {r.lesson?.title || `Lesson ${r.lessonId}`}
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4, margin: 0, fontStyle: 'italic' }}>
                                    "{r.comment}"
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state" style={{ padding: 'var(--space-md)' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ยังไม่มีความคิดเห็นในขณะนี้</p>
                    </div>
                )}
            </div>
        </div>
    )
}

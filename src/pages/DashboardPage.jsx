import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BookOpen, Trophy, CheckCircle, Clock, ArrowRight, HelpCircle, Award, XCircle, ChevronRight, BarChart3 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

export default function DashboardPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [courses, setCourses] = useState([])
    const [allLessons, setAllLessons] = useState([])
    const [allQuizzes, setAllQuizzes] = useState([])
    const [quizResults, setQuizResults] = useState([])
    const [lessonProgress, setLessonProgress] = useState([])

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const [
                    { data: c },
                    { data: qr },
                    { data: lp },
                    { data: les },
                    { data: qz }
                ] = await Promise.all([
                    supabase.from('courses').select('*'),
                    supabase.from('quizResults').select('*').eq('userId', user.id),
                    supabase.from('lessonProgress').select('*').eq('userId', user.id),
                    supabase.from('lessons').select('*'),
                    supabase.from('quizzes').select('*')
                ])

                setCourses(c || [])
                setQuizResults(qr || [])
                setLessonProgress(lp || [])
                setAllLessons(les || [])
                setAllQuizzes(qz || [])
            } catch (err) {
                console.error('Dashboard load error:', err)
            }
        }
        
        loadDashboardData()
    }, [user.id])

    const totalLessons = allLessons.length
    const completedLessons = lessonProgress.filter(l => l.completed).length
    const avgScore = quizResults.length > 0
        ? Math.round(quizResults.reduce((a, b) => a + b.score, 0) / quizResults.length)
        : 0
    const passedQuizzes = quizResults.filter(r => r.score >= 60).length

    const pieData = [
        { name: 'เรียนแล้ว', value: completedLessons },
        { name: 'ยังไม่เรียน', value: Math.max(0, totalLessons - completedLessons) },
    ]
    const PIE_COLORS = ['#7c3aed', '#1e1e3a']

    const barData = quizResults.map((r) => ({
        name: `ข้อสอบ ${r.quizId}`,
        คะแนน: r.score,
    }))

    const stats = [
        { icon: BookOpen, label: 'คอร์สทั้งหมด', value: courses.length, color: '#7c3aed' },
        { icon: CheckCircle, label: 'บทเรียนที่เรียนแล้ว', value: `${completedLessons}/${totalLessons}`, color: '#10b981' },
        { icon: Trophy, label: 'คะแนนเฉลี่ย', value: `${avgScore}%`, color: '#f59e0b' },
        { icon: Clock, label: 'สอบผ่าน', value: `${passedQuizzes}/${quizResults.length}`, color: '#06b6d4' },
    ]

    // Per-course data builder
    const getCourseData = (courseId) => {
        const courseLessons = allLessons.filter(l => l.courseId === courseId)
        const completedIds = lessonProgress.filter(p => p.completed).map(p => p.lessonId)
        const doneLessons = courseLessons.filter(l => completedIds.includes(l.id))
        const courseQuizzes = allQuizzes.filter(q => q.courseId === courseId)
        
        // Get best result per quiz
        const quizStatuses = courseQuizzes.map(quiz => {
            const results = quizResults.filter(r => r.quizId === quiz.id)
            const best = results.length > 0
                ? results.reduce((b, r) => r.score > b.score ? r : b, results[0])
                : null
            return {
                quiz,
                bestResult: best,
                passed: best ? best.score >= quiz.passingScore : false,
                attempted: results.length > 0
            }
        })

        const lessonPercent = courseLessons.length > 0
            ? Math.round((doneLessons.length / courseLessons.length) * 100)
            : 0

        return {
            totalLessons: courseLessons.length,
            completedLessons: doneLessons.length,
            lessonPercent,
            quizStatuses,
            totalQuizzes: courseQuizzes.length,
            passedQuizzes: quizStatuses.filter(s => s.passed).length
        }
    }

    return (
        <div className="animate-fade-in">
            {/* Welcome Banner */}
            <div className="welcome-banner">
                <h2>สวัสดี, {user.name}! 👋</h2>
                <p>ยินดีต้อนรับกลับมา เรียนรู้ทักษะใหม่ๆ เพื่อพัฒนาความเป็นมืออาชีพ</p>
            </div>

            {/* Stats Grid */}
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
                    <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem', fontWeight: 600 }}>
                        ความคืบหน้าบทเรียน
                    </h3>
                    <div className="chart-container" style={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
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
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {completedLessons} จาก {totalLessons} บทเรียน
                    </div>
                </div>

                <div className="glass-card glass-card--static">
                    <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem', fontWeight: 600 }}>
                        คะแนนสอบ
                    </h3>
                    {barData.length > 0 ? (
                        <div className="chart-container" style={{ height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData}>
                                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.85rem'
                                        }}
                                    />
                                    <Bar dataKey="คะแนน" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>ยังไม่มีผลสอบ</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Per-Course Summary */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart3 size={20} style={{ color: 'var(--accent-primary)' }} />
                        สรุปผลรายคอร์ส
                    </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {courses.map(course => {
                        const data = getCourseData(course.id)
                        const allQuizzesPassed = data.totalQuizzes > 0 && data.passedQuizzes === data.totalQuizzes
                        const allLessonsDone = data.totalLessons > 0 && data.completedLessons === data.totalLessons
                        const courseComplete = allQuizzesPassed && allLessonsDone

                        return (
                            <div
                                key={course.id}
                                className="glass-card glass-card--static"
                                style={{
                                    cursor: 'pointer',
                                    borderLeft: courseComplete ? '4px solid var(--accent-success)' : data.lessonPercent > 0 ? '4px solid var(--accent-primary)' : '4px solid #e2e8f0',
                                    transition: 'all 0.2s ease'
                                }}
                                onClick={() => navigate(`/courses/${course.id}`)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1 }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 'var(--radius-lg)',
                                            background: 'linear-gradient(135deg, #7c3aed20, #06b6d420)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.5rem', flexShrink: 0
                                        }}>
                                            {course.thumbnail}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                    {course.title}
                                                </h4>
                                                {courseComplete && (
                                                    <span style={{
                                                        background: 'rgba(16, 185, 129, 0.1)',
                                                        color: 'var(--accent-success)',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        padding: '2px 8px',
                                                        borderRadius: 'var(--radius-full)',
                                                        display: 'flex', alignItems: 'center', gap: '3px'
                                                    }}>
                                                        <CheckCircle size={10} /> เสร็จสิ้น
                                                    </span>
                                                )}
                                            </div>
                                            <span className="badge badge-primary" style={{ fontSize: '0.7rem', marginBottom: '0.5rem', display: 'inline-block' }}>{course.category}</span>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
                                                <span>👨‍🏫 {course.instructor || 'ทีมวิชาการ'}</span>
                                                <span>•</span>
                                                <span>📅 {course.updatedAt || course.createdAt || 'ไม่ระบุ'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                </div>

                                {/* Lesson Progress Bar */}
                                <div style={{ marginBottom: 'var(--space-md)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                            <BookOpen size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                            บทเรียน
                                        </span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: data.lessonPercent === 100 ? 'var(--accent-success)' : 'var(--text-primary)' }}>
                                            {data.completedLessons}/{data.totalLessons} ({data.lessonPercent}%)
                                        </span>
                                    </div>
                                    <div className="progress-bar" style={{ height: '6px' }}>
                                        <div className="progress-bar-fill" style={{
                                            width: `${data.lessonPercent}%`,
                                            background: data.lessonPercent === 100
                                                ? 'var(--accent-success)'
                                                : 'var(--gradient-primary)'
                                        }} />
                                    </div>
                                </div>

                                {/* Quiz Results */}
                                {data.quizStatuses.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.5rem' }}>
                                            <HelpCircle size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                            แบบทดสอบ ({data.passedQuizzes}/{data.totalQuizzes} ผ่าน)
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {data.quizStatuses.map(({ quiz, bestResult, passed, attempted }) => (
                                                <div
                                                    key={quiz.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        padding: '0.35rem 0.75rem',
                                                        borderRadius: 'var(--radius-full)',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 500,
                                                        background: !attempted
                                                            ? '#f1f5f9'
                                                            : passed
                                                                ? 'rgba(16, 185, 129, 0.1)'
                                                                : 'rgba(239, 68, 68, 0.08)',
                                                        color: !attempted
                                                            ? 'var(--text-muted)'
                                                            : passed
                                                                ? 'var(--accent-success)'
                                                                : 'var(--accent-danger)',
                                                        border: `1px solid ${!attempted ? '#e2e8f0' : passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)'}`
                                                    }}
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/quiz/${quiz.id}`) }}
                                                >
                                                    {!attempted ? (
                                                        <Clock size={11} />
                                                    ) : passed ? (
                                                        <Award size={11} />
                                                    ) : (
                                                        <XCircle size={11} />
                                                    )}
                                                    <span>{quiz.title}</span>
                                                    {bestResult && (
                                                        <span style={{ fontWeight: 700 }}>{bestResult.score}%</span>
                                                    )}
                                                    {!attempted && <span>ยังไม่ทำ</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {data.totalQuizzes === 0 && data.totalLessons > 0 && (
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                        ยังไม่มีแบบทดสอบในคอร์สนี้
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}


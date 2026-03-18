import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Users, BookOpen, FileQuestion, TrendingUp, Trophy, Star, MessageSquare, GraduationCap, XCircle, ArrowUpRight, ArrowDownRight, Activity, Target, Zap } from 'lucide-react'
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, AreaChart, Area, 
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    CartesianGrid
} from 'recharts'

export default function AdminDashboardPage() {
    const [users, setUsers] = useState([])
    const [courses, setCourses] = useState([])
    const [quizResults, setQuizResults] = useState([])
    const [lessonProgress, setLessonProgress] = useState([])
    const [lessonRatings, setLessonRatings] = useState([])
    const [loading, setLoading] = useState(true)
    const [lessons, setLessons] = useState([])
    const [quizzes, setQuizzes] = useState([])
    const [activityData, setActivityData] = useState([])
    const [filterRange, setFilterRange] = useState(null)

    useEffect(() => {
        const loadData = async () => {
            try {
                const [
                    { data: u }, 
                    { data: c }, 
                    { data: l }, 
                    { data: qz }, 
                    { data: qr },
                    { data: lp },
                    { data: ratings }
                ] = await Promise.all([
                    supabase.from('users').select('*').eq('role', 'student'),
                    supabase.from('courses').select('*'),
                    supabase.from('lessons').select('*'),
                    supabase.from('quizzes').select('*'),
                    supabase.from('quizResults').select('*'),
                    supabase.from('lessonProgress').select('*'),
                    supabase.from('lessonRatings').select('*, user:users(*), lesson:lessons(*)').order('createdAt', { ascending: false })
                ])

                setUsers(u || [])
                setCourses(c || [])
                setLessons(l || [])
                setQuizzes(qz || [])
                setQuizResults(qr || [])
                setLessonProgress(lp || [])
                setLessonRatings(ratings || [])

                // Process activity chart data (Last 7 days)
                processTrendData(lp || [], qr || [])

            } catch (err) {
                console.error("Dashboard error:", err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    const processTrendData = (lp, qr) => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const last7Days = []
        for (let i = 6; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            last7Days.push({
                fullDate: date.toISOString().split('T')[0],
                name: days[date.getDay()],
                usage: 0,
                tests: 0
            })
        }

        // Count "Usage" (Started or Completed Lessons)
        lp.forEach(p => {
            const dateStr = (p.completedAt || p.createdAt || p.startedAt)?.split('T')[0]
            if (dateStr) {
                const day = last7Days.find(d => d.fullDate === dateStr)
                if (day) day.usage++
            }
        })

        // Count "Tests" (Quiz Completions)
        qr.forEach(r => {
            const dateStr = r.completedAt?.split('T')[0]
            if (dateStr) {
                const day = last7Days.find(d => d.fullDate === dateStr)
                if (day) day.tests++
            }
        })

        setActivityData(last7Days)
    }

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
        { icon: Users, label: 'นักเรียนทั้งหมด', value: totalStudents, trend: '+12%', isUp: true, color: 'var(--accent-primary)', gradient: 'var(--gradient-premium)' },
        { icon: BookOpen, label: 'คอร์สทั้งหมด', value: courses.length, trend: '+2', isUp: true, color: 'var(--accent-secondary)', gradient: 'var(--gradient-sky)' },
        { icon: GraduationCap, label: 'เรียนครบแล้ว', value: completedStudentsCount, trend: `/${totalStudents} คน`, isUp: true, color: 'var(--accent-violet)', gradient: 'var(--gradient-premium)' },
        { icon: Zap, label: 'อัตราผ่านประเมิน', value: `${passRate}%`, trend: '+5%', isUp: true, color: 'var(--accent-emerald)', gradient: 'var(--gradient-sky)' },
        { icon: Star, label: 'ความพึงพอใจ', value: `${avgRating}/5`, trend: '-0.1', isUp: false, color: 'var(--accent-rose)', gradient: 'var(--gradient-sunset)' },
    ]

    // Mock radar data for "Skill Distribution"
    const radarData = [
        { subject: 'คะแนนเฉลี่ย', A: avgScore, fullMark: 100 },
        { subject: 'อัตราการผ่าน', A: passRate, fullMark: 100 },
        { subject: 'ความพึงพอใจ', A: parseFloat(avgRating) * 20, fullMark: 100 },
        { subject: 'การมีส่วนร่วม', A: Math.min(100, (completedLessons / (users.length * lessons.length || 1)) * 500), fullMark: 100 },
        { subject: 'บทเรียนที่จบ', A: Math.min(100, (completedStudentsCount / (users.length || 1)) * 100), fullMark: 100 },
    ]


    // Per-course performance metrics
    const courseMetrics = courses.map(c => {
        // Filter results that belong to this course by looking up the quiz
        const results = quizResults.filter(r => {
            const quiz = quizzes.find(q => q.id === r.quizId)
            return quiz?.courseId === c.id
        })
        
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

    const filteredPerformance = filteredUsers.map(u => {
        const perf = studentPerformance.find(p => p.id === u.id)
        return perf || { name: u.name, คะแนนเฉลี่ย: 0, บทเรียน: 0, id: u.id }
    }).sort((a, b) => b.คะแนนเฉลี่ย - a.คะแนนเฉลี่ย)

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>📊 ภาพรวมระบบ</h1>
                <p>สรุปข้อมูลการเรียนการสอนทั้งหมด</p>
            </div>

            {/* Stats Overview */}
            <div className="grid-5" style={{ marginBottom: 'var(--space-xl)' }}>
                {stats.map((stat, i) => {
                    const Icon = stat.icon
                    const TrendIcon = stat.isUp ? ArrowUpRight : ArrowDownRight
                    return (
                        <div key={i} className={`glass-card animate-slide-up stagger-${i + 1}`} style={{ padding: 'var(--space-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                                <div style={{ 
                                    width: 42, height: 42, borderRadius: 'var(--radius-md)', 
                                    background: `${stat.color}15`, display: 'flex', 
                                    alignItems: 'center', justifyContent: 'center' 
                                }}>
                                    <Icon size={20} style={{ color: stat.color }} />
                                </div>
                                <div className={stat.isUp ? 'trend-up' : 'trend-down'}>
                                    <TrendIcon size={12} /> {stat.trend}
                                </div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{stat.value}</div>
                        </div>
                    )
                })}
            </div>

            {/* Main Insights Grid */}
            <div className="dashboard-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                {/* Individual Performance - Large Area */}
                <div className="glass-card col-span-8">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>ผลรวมคะแนนรายบุคคล</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                                แสดงลำดับคะแนนจากสูงไปต่ำ {filterRange && `เฉพาะกลุ่ม${filterRange.name}`}
                            </p>
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
                        <div style={{ height: 320, minWidth: Math.max(600, filteredPerformance.length * 60) }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={filteredPerformance} margin={{ bottom: 80, top: 10, right: 20, left: 0 }}>
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={1}/>
                                            <stop offset="100%" stopColor="var(--accent-violet)" stopOpacity={0.8}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }} 
                                        angle={-45} 
                                        textAnchor="end" 
                                        interval={0}
                                        height={80} 
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis 
                                        domain={[0, 100]} 
                                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }} 
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'rgba(255, 255, 255, 0.95)',
                                            backdropFilter: 'blur(10px)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '12px',
                                            boxShadow: 'var(--shadow-lg-premium)'
                                        }}
                                        cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                    />
                                    <Bar dataKey="คะแนนเฉลี่ย" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Score Distribution Donut */}
                <div className="glass-card col-span-4">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>การกระจายคะแนน</h3>
                    <div style={{ height: 260, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={scoreRanges}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={95}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {scoreRanges.map((entry, i) => (
                                        <Cell 
                                            key={i} 
                                            fill={entry.color} 
                                            style={{ filter: `drop-shadow(0 4px 8px ${entry.color}40)` }}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(255, 255, 255, 0.95)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        boxShadow: 'var(--shadow-md)'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{users.length}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '4px' }}>นักเรียน</div>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: 'var(--space-md)' }}>
                        {scoreRanges.map((range, i) => {
                            const isActive = filterRange?.name === range.name
                            return (
                                <div 
                                    key={i} 
                                    onClick={() => setFilterRange(isActive ? null : range)}
                                    style={{ 
                                        padding: '8px', borderRadius: '12px', cursor: 'pointer',
                                        background: isActive ? `${range.color}15` : 'var(--bg-tertiary)',
                                        border: `1px solid ${isActive ? range.color : 'transparent'}`,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: range.color }} />
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>{range.percentage}% ({range.value} คน)</span>
                                    </div>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{range.name.split(' (')[0]}</div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Learning Activity Activity Area Chart */}
                <div className="glass-card col-span-8">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>แนวโน้มการเรียนรู้ (7 วัน)</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>สถิติการใช้งานและทดสอบรายวัน</p>
                        </div>
                        <div className="trend-up"><TrendingUp size={14} /> +23%</div>
                    </div>
                    <div style={{ height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activityData}>
                                <defs>
                                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent-secondary)" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="var(--accent-secondary)" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg-premium)' }} />
                                <Area type="monotone" dataKey="usage" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorUsage)" />
                                <Area type="monotone" dataKey="tests" stroke="var(--accent-secondary)" strokeWidth={3} fillOpacity={1} fill="url(#colorTests)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Spider Radar Chart for Skills */}
                <div className="glass-card col-span-4">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>ภาพรวมเชิงลึก</h3>
                    <div style={{ height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="var(--border-color)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 600 }} />
                                <Radar 
                                    name="Performance" 
                                    dataKey="A" 
                                    stroke="var(--accent-primary)" 
                                    fill="var(--accent-primary)" 
                                    fillOpacity={0.3} 
                                />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-10px' }}>
                        สมรรถนะองค์รวมของระบบ LMS ในขณะนี้
                    </div>
                </div>
            </div>

            {/* Course Metrics & Students Section */}
            <div className="dashboard-grid">
                {/* Course List */}
                <div className="col-span-12">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Trophy size={20} style={{ color: 'var(--accent-amber)' }} /> ประสิทธิภาพตามคอร์สเรียน
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                        {courseMetrics.map(course => (
                            <div key={course.id} className="glass-card" style={{ padding: 'var(--space-sm)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-md)' }}>
                                    <div style={{ fontSize: '1.5rem', width: 40, height: 40, background: 'var(--bg-tertiary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {course.thumbnail}
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.title}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{course.category}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ flex: 1, background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>คะแนน</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{course.avgScore}%</div>
                                    </div>
                                    <div style={{ flex: 1, background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>ผ่าน</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{course.passRate}%</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>


            {/* Recent Table & Comments Segment */}
            <div className="dashboard-grid">
                {/* Student List */}
                <div className="glass-card col-span-8">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                            นักเรียน {filterRange && <span style={{ color: 'var(--accent-primary)' }}> - กลุ่ม{filterRange.name}</span>}
                        </h3>
                        {filterRange && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setFilterRange(null)} style={{ color: 'var(--accent-rose)' }}>
                                <XCircle size={14} /> Clear
                            </button>
                        )}
                    </div>
                    <div className="admin-table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ชื่อนักเรียน</th>
                                    <th>แผนก</th>
                                    <th>ความคืบหน้า</th>
                                    <th>เฉลี่ย</th>
                                    <th>สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => {
                                    const perf = studentPerformance.find(p => p.id === u.id)
                                    const avg = perf?.คะแนนเฉลี่ย || 0
                                    const progress = perf?.บทเรียน || 0
                                    const perc = lessons.length > 0 ? Math.round((progress/lessons.length)*100) : 0
                                    return (
                                        <tr key={u.id}>
                                            <td>
                                                <div className="flex items-center gap-sm">
                                                    <img src={u.avatar} alt={u.name} style={{ width: 32, height: 32, borderRadius: '12px', border: '1px solid var(--border-color)' }} />
                                                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.department}</td>
                                            <td>
                                                <div style={{ minWidth: '120px' }}>
                                                    <div className="progress-bar" style={{ height: 6, marginBottom: '6px' }}>
                                                        <div className="progress-bar-fill" style={{ width: `${perc}%`, background: perc === 100 ? 'var(--accent-emerald)' : 'var(--accent-primary)' }} />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>{perc}% สำเร็จ</span>
                                                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                                            เรียนแล้ว {progress} | ยังไม่เรียน {lessons.length - progress}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 800, color: avg >= 80 ? 'var(--accent-emerald)' : avg >= 60 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>
                                                    {avg}%
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${avg >= 80 ? 'badge-success' : avg >= 60 ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                                                    {avg >= 80 ? 'ดีมาก' : avg >= 60 ? 'ผ่าน' : 'ปรับปรุง'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Activity / Comments Segment */}
                <div className="glass-card col-span-4">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MessageSquare size={18} style={{ color: 'var(--accent-primary)' }}/> ความคิดเห็นล่าสุด
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '8px' }}>
                        {lessonRatings.filter(r => r.comment).slice(0, 10).map(r => (
                            <div key={r.id} style={{ 
                                padding: '12px', 
                                background: 'var(--bg-tertiary)', 
                                borderRadius: '16px', 
                                border: '1px solid rgba(0,0,0,0.03)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <img src={r.user?.avatar} style={{ width: 24, height: 24, borderRadius: '8px' }} />
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{r.user?.name}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '2px' }}>
                                        <Star size={10} fill="#f59e0b" color="#f59e0b" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{r.rating}</span>
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 4px 0', lineHeight: 1.4 }}>
                                    "{r.comment}"
                                </p>
                                <div style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{r.lesson?.title}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabaseClient'
import { BookOpen, Clock, HelpCircle, ChevronDown, ChevronRight, Lock, CheckCircle, Play, FileText, ArrowLeft, Award, XCircle } from 'lucide-react'

export default function CourseDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [course, setCourse] = useState(null)
    const [lessons, setLessons] = useState([])
    const [quizzes, setQuizzes] = useState([])
    const [progress, setProgress] = useState([])
    const [quizResults, setQuizResults] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedLesson, setExpandedLesson] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [
                    { data: c },
                    { data: l },
                    { data: q },
                    { data: p },
                    { data: qr }
                ] = await Promise.all([
                    supabase.from('courses').select('*').eq('id', id).single(),
                    supabase.from('lessons').select('*').eq('courseId', id).order('order'),
                    supabase.from('quizzes').select('*').eq('courseId', id),
                    supabase.from('lessonProgress').select('*').eq('userId', user.id),
                    supabase.from('quizResults').select('*').eq('userId', user.id)
                ])

                setCourse(c)
                setLessons(Array.isArray(l) ? l : [])
                setQuizzes(Array.isArray(q) ? q : [])
                setProgress(Array.isArray(p) ? p : [])
                setQuizResults(Array.isArray(qr) ? qr : [])
            } catch (err) {
                console.error('Error loading course data:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id, user.id])

    if (loading) return <div className="loading-spinner" />
    if (!course) return <div className="empty-state"><h3>ไม่พบคอร์สนี้</h3></div>

    const completedLessons = lessons.filter(l => progress.find(p => p.lessonId === l.id && p.completed))
    const progressPercent = lessons.length > 0 ? Math.round((completedLessons.length / lessons.length) * 100) : 0

    // Helper: get best quiz result for a quiz
    const getBestResult = (quizId) => {
        const results = quizResults.filter(r => r.quizId === quizId)
        if (results.length === 0) return null
        return results.reduce((best, r) => r.score > best.score ? r : best, results[0])
    }

    const toggleLesson = (lessonId) => {
        setExpandedLesson(expandedLesson === lessonId ? null : lessonId)
    }

    // Separate quizzes: per-lesson vs course-level
    const getLessonQuizzes = (lessonId) => quizzes.filter(q => q.lessonId === lessonId)
    const courseLevelQuizzes = quizzes.filter(q => !q.lessonId)

    return (
        <div className="animate-fade-in">
            {/* Hero Banner */}
            <div className="course-hero">
                <div className="course-hero-overlay" />
                <div className="course-hero-content">
                    <button className="btn btn-ghost" onClick={() => navigate('/courses')} style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 'var(--space-md)' }}>
                        <ArrowLeft size={16} /> กลับหน้าคอร์ส
                    </button>
                    <span className="course-hero-category">{course.category}</span>
                    <h1 className="course-hero-title">{course.title}</h1>
                    <p className="course-hero-desc">{course.description}</p>
                </div>
            </div>

            {/* Content Area - 2 Column */}
            <div className="course-detail-layout">
                {/* Left Column - Main Content */}
                <div className="course-detail-main">
                    {/* Tabs */}
                    <div className="course-tabs">
                        <button className="course-tab active"><FileText size={16} /> เนื้อหาคอร์ส</button>
                    </div>

                    {/* Objectives */}
                    <div className="course-objectives">
                        <h3>🎯 วัตถุประสงค์หลักสูตร (Objective)</h3>
                        <ul>
                            <li><CheckCircle size={16} className="obj-check" /> เรียนรู้พื้นฐานการให้บริการ Call Center อย่างมืออาชีพ</li>
                            <li><CheckCircle size={16} className="obj-check" /> สามารถรับมือกับสถานการณ์ต่างๆ รวมถึงข้อร้องเรียนได้</li>
                            <li><CheckCircle size={16} className="obj-check" /> พัฒนาทักษะการสื่อสารเชิงบวกกับลูกค้า</li>
                        </ul>
                    </div>

                    {/* Info Cards */}
                    <div className="course-info-cards">
                        <div className="course-info-card">
                            <div className="course-info-label">Instructor</div>
                            <div className="course-info-value">{course.instructor || 'ทีมวิชาการ'}</div>
                        </div>
                        <div className="course-info-card">
                            <div className="course-info-label">Last Updated</div>
                            <div className="course-info-value">{course.updatedAt || course.createdAt || 'ไม่ระบุ'}</div>
                        </div>
                        <div className="course-info-card">
                            <div className="course-info-label">Difficulty Level</div>
                            <div className="course-info-value">{course.category}</div>
                        </div>
                    </div>

                    {/* Course Content - Accordion */}
                    <div className="course-content-section">
                        <div className="course-content-header">
                            <h2>Course Content</h2>
                            <button className="btn btn-secondary btn-sm" onClick={() => setExpandedLesson(expandedLesson ? null : 'all')}>
                                {expandedLesson === 'all' ? 'ย่อทั้งหมด' : 'ขยายทั้งหมด'} <ChevronDown size={14} />
                            </button>
                        </div>

                        <div className="accordion-list">
                            {lessons.map(lesson => {
                                const isCompleted = progress.find(p => p.lessonId === lesson.id && p.completed)
                                const isExpanded = expandedLesson === lesson.id || expandedLesson === 'all'
                                const lessonQuizzes = getLessonQuizzes(lesson.id)

                                return (
                                    <div key={lesson.id} className={`accordion-item ${isExpanded ? 'expanded' : ''}`}>
                                        <div className="accordion-trigger" onClick={() => toggleLesson(lesson.id)}>
                                            <div className="accordion-left">
                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                <span className="accordion-title">
                                                    Lesson {lesson.order}: {lesson.title}
                                                </span>
                                                {isCompleted && <CheckCircle size={14} style={{ color: 'var(--accent-success)' }} />}
                                            </div>
                                            <div className="accordion-right">
                                                <span className="accordion-meta">1 Topic</span>
                                                {lessonQuizzes.length > 0 && (
                                                    <span className="accordion-meta">| {lessonQuizzes.length} Quiz</span>
                                                )}
                                                <div className={`accordion-progress-circle ${isCompleted ? 'completed' : ''}`}>
                                                    {isCompleted && <CheckCircle size={12} />}
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="accordion-content">
                                                <div className="accordion-topic" onClick={() => navigate(`/lessons/${lesson.id}`)}>
                                                    <Play size={14} />
                                                    <span>{lesson.title}</span>
                                                    {isCompleted && <CheckCircle size={14} style={{ color: 'var(--accent-success)', marginLeft: 'auto' }} />}
                                                </div>
                                                {/* Lesson Quizzes */}
                                                {lessonQuizzes.map(quiz => {
                                                    const bestResult = getBestResult(quiz.id)
                                                    const passed = bestResult && bestResult.score >= quiz.passingScore
                                                    return (
                                                        <div key={`lq-${quiz.id}`} className="accordion-topic accordion-quiz-item" onClick={() => navigate(`/quiz/${quiz.id}`)}>
                                                            <HelpCircle size={14} style={{ color: 'var(--accent-warning)' }} />
                                                            <span>{quiz.title}</span>
                                                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{quiz.questions.length} ข้อ | {quiz.timeLimit / 60} นาที</span>
                                                                {bestResult && (
                                                                    passed
                                                                        ? <Award size={14} style={{ color: 'var(--accent-success)' }} />
                                                                        : <XCircle size={14} style={{ color: 'var(--accent-danger)' }} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {/* Course-level Quizzes (without lessonId) */}
                            {courseLevelQuizzes.map(quiz => {
                                const bestResult = getBestResult(quiz.id)
                                const passed = bestResult && bestResult.score >= quiz.passingScore
                                return (
                                    <div key={`quiz-${quiz.id}`} className="accordion-item">
                                        <div className="accordion-trigger" onClick={() => navigate(`/quiz/${quiz.id}`)}>
                                            <div className="accordion-left">
                                                <HelpCircle size={16} style={{ color: 'var(--accent-warning)' }} />
                                                <span className="accordion-title">{quiz.title}</span>
                                            </div>
                                            <div className="accordion-right">
                                                <span className="accordion-meta">{quiz.questions.length} ข้อ</span>
                                                <span className="accordion-meta">| {quiz.timeLimit / 60} นาที</span>
                                                {bestResult && (
                                                    passed
                                                        ? <Award size={16} style={{ color: 'var(--accent-success)' }} />
                                                        : <XCircle size={16} style={{ color: 'var(--accent-danger)' }} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* About Instructor */}
                    <div className="instructor-section">
                        <h2>About Instructor</h2>
                        <div className="instructor-card">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${course.instructor || 'instructor'}`} alt="Instructor" className="instructor-avatar" />
                            <div>
                                <h4>{course.instructor || 'ทีมวิชาการ'}</h4>
                                <p>{lessons.length > 0 ? `${lessons.length} บทเรียนในคอร์สนี้` : ''}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Sidebar Card */}
                <div className="course-detail-sidebar">
                    <div className="course-sidebar-card">
                        {/* Course Thumbnail */}
                        <div className="sidebar-card-thumbnail">
                            <span className="sidebar-card-emoji">{course.thumbnail}</span>
                            <div className="sidebar-card-title">{course.title}</div>
                        </div>

                        {/* Progress */}
                        <div className="sidebar-card-progress">
                            <div className="progress-bar">
                                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{progressPercent}% เสร็จสิ้น</span>
                        </div>

                        {/* Enroll Status */}
                        <button className="btn btn-primary w-full btn-lg" onClick={() => lessons[0] && navigate(`/lessons/${lessons[0].id}`)}>
                            {progressPercent > 0 ? 'เรียนต่อ' : 'เริ่มเรียน'}
                        </button>

                        {/* Course Includes */}
                        <div className="sidebar-card-includes">
                            <h4>Course Includes</h4>
                            <div className="includes-item">
                                <BookOpen size={16} /> <span>{lessons.length} Lessons</span>
                            </div>
                            <div className="includes-item">
                                <FileText size={16} /> <span>{lessons.length} Topics</span>
                            </div>
                            <div className="includes-item">
                                <HelpCircle size={16} /> <span>{quizzes.length} Quizzes</span>
                            </div>
                            <div className="includes-item">
                                <Clock size={16} /> <span>{quizzes.reduce((t, q) => t + q.timeLimit, 0) / 60} นาที ข้อสอบ</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

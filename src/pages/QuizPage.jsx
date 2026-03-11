import { useState, useEffect, useRef } from 'react'
import { supabase } from '../config/supabaseClient'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Clock, ArrowLeft, ArrowRight, CheckCircle, Send, Award } from 'lucide-react'

export default function QuizPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [quiz, setQuiz] = useState(null)
    const [alreadyPassed, setAlreadyPassed] = useState(false)
    const [currentQ, setCurrentQ] = useState(0)
    const [answers, setAnswers] = useState({})
    const [timeLeft, setTimeLeft] = useState(0)
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(true)
    const timerRef = useRef(null)

    useEffect(() => {
        const loadQuizData = async () => {
            try {
                const [
                    { data: q },
                    { data: results }
                ] = await Promise.all([
                    supabase.from('quizzes').select('*').eq('id', id).single(),
                    supabase.from('quizResults').select('*').eq('userId', user.id).eq('quizId', id)
                ])

                if (q) {
                    setQuiz(q)
                    setTimeLeft(q.timeLimit)
                    
                    // Check if already passed
                    const bestResult = Array.isArray(results) && results.length > 0
                        ? results.reduce((b, r) => r.score > b.score ? r : b, results[0])
                        : null
                        
                    if (bestResult && bestResult.score >= q.passingScore) {
                        setAlreadyPassed(true)
                    }
                }
            } catch (err) {
                console.error('Error loading quiz:', err)
            } finally {
                setLoading(false)
            }
        }

        if (id && user) {
            loadQuizData()
        }
    }, [id, user?.id])

    useEffect(() => {
        if (!quiz || alreadyPassed || submitted || timeLeft <= 0) return

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current)
                    handleSubmit()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timerRef.current)
    }, [quiz, submitted, alreadyPassed])

    const handleAnswer = (questionId, answerIndex) => {
        setAnswers(prev => ({ ...prev, [questionId]: answerIndex }))
    }

    const handleSubmit = async () => {
        if (submitted) return
        clearInterval(timerRef.current)
        setSubmitted(true)

        const correctCount = quiz.questions.reduce((count, q) => {
            return count + (answers[q.id] === q.correctAnswer ? 1 : 0)
        }, 0)

        const score = Math.round((correctCount / quiz.questions.length) * 100)

        const { data: result, error } = await supabase
            .from('quizResults')
            .insert([{
                quizId: parseInt(id),
                userId: user.id,
                score,
                totalQuestions: quiz.questions.length,
                correctAnswers: correctCount,
                completedAt: new Date().toISOString()
            }])
            .select()
            .single()

        if (!error && result) {
            navigate(`/quiz-result/${result.id}`)
        } else {
            console.error("Error submitting quiz result:", error)
            // Still navigate but maybe with existing state or error handling
            navigate('/dashboard')
        }
    }

    if (loading) return <div className="loading-spinner" />
    if (!quiz) return <div className="empty-state"><h3>ไม่พบแบบทดสอบนี้</h3></div>

    if (alreadyPassed) {
        return (
            <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div className="glass-card glass-card--static text-center" style={{ maxWidth: 400, width: '100%', padding: 'var(--space-2xl) var(--space-xl)' }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: 'var(--radius-full)',
                        background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto var(--space-lg)'
                    }}>
                        <Award size={40} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-sm)' }}>สอบผ่านแล้ว! 🎉</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', lineHeight: 1.6 }}>
                        คุณได้ทำแบบทดสอบ <strong>{quiz.title}</strong> ผ่านเกณฑ์แล้ว ไม่จำเป็นต้องทำซ้ำ
                    </p>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate(`/courses/${quiz.courseId}`)}>
                        กลับไปหน้าคอร์สเรียน
                    </button>
                </div>
            </div>
        )
    }

    const question = quiz.questions[currentQ]
    const totalQ = quiz.questions.length
    const answeredCount = Object.keys(answers).length
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60

    return (
        <div className="animate-fade-in">
            <div className="quiz-container">
                {/* Quiz Header */}
                <div className="quiz-header">
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
                        {quiz.title}
                    </h1>
                    <div className={`quiz-timer ${timeLeft <= 60 ? 'danger' : ''}`}>
                        <Clock size={16} />
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </div>
                </div>

                {/* Progress */}
                <div className="quiz-progress-info">
                    <span>ข้อที่ {currentQ + 1} จาก {totalQ}</span>
                    <span>ตอบแล้ว {answeredCount}/{totalQ}</span>
                </div>
                <div className="progress-bar" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div className="progress-bar-fill" style={{ width: `${((currentQ + 1) / totalQ) * 100}%` }} />
                </div>

                {/* Question */}
                <div className="glass-card glass-card--static question-card" key={question.id}>
                    <div className="question-number">คำถามที่ {currentQ + 1}</div>
                    <div className="question-text">{question.text}</div>

                    <div className="quiz-options">
                        {question.options.map((option, i) => {
                            const letters = ['ก', 'ข', 'ค', 'ง']
                            const isSelected = answers[question.id] === i
                            return (
                                <button
                                    key={i}
                                    className={`quiz-option ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleAnswer(question.id, i)}
                                >
                                    <span className="option-letter">{letters[i]}</span>
                                    <span>{option}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between" style={{ marginTop: 'var(--space-lg)' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setCurrentQ(prev => prev - 1)}
                        disabled={currentQ === 0}
                    >
                        <ArrowLeft size={16} /> ก่อนหน้า
                    </button>

                    {currentQ < totalQ - 1 ? (
                        <button
                            className="btn btn-primary"
                            onClick={() => setCurrentQ(prev => prev + 1)}
                        >
                            ถัดไป <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            className="btn btn-success btn-lg"
                            onClick={handleSubmit}
                            disabled={answeredCount < totalQ}
                        >
                            <Send size={16} /> ส่งคำตอบ
                        </button>
                    )}
                </div>

                {/* Question Dots */}
                <div className="flex items-center justify-center gap-sm" style={{ marginTop: 'var(--space-xl)' }}>
                    {quiz.questions.map((q, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentQ(i)}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 'var(--radius-full)',
                                border: `2px solid ${i === currentQ ? 'var(--accent-primary)' : answers[q.id] !== undefined ? 'var(--accent-success)' : 'var(--border-color)'}`,
                                background: i === currentQ ? 'rgba(124, 58, 237, 0.2)' : answers[q.id] !== undefined ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {answers[q.id] !== undefined ? <CheckCircle size={14} style={{ color: 'var(--accent-success)' }} /> : i + 1}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

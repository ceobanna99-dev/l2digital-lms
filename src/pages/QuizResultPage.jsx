import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabaseClient'
import { Trophy, XCircle, RotateCcw, ArrowLeft, CheckCircle } from 'lucide-react'

export default function QuizResultPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [result, setResult] = useState(null)
    const [quiz, setQuiz] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchResultDetails = async () => {
            try {
                const { data: resultData } = await supabase
                    .from('quizResults')
                    .select('*')
                    .eq('id', id)
                    .single()
                
                if (resultData) {
                    setResult(resultData)
                    const { data: quizData } = await supabase
                        .from('quizzes')
                        .select('*')
                        .eq('id', resultData.quizId)
                        .single()
                    setQuiz(quizData)
                }
            } catch (err) {
                console.error("Error fetching quiz results:", err)
            } finally {
                setLoading(false)
            }
        }
        
        fetchResultDetails()
    }, [id])

    if (loading) return <div className="loading-spinner" />
    if (!result) return <div className="empty-state"><h3>ไม่พบผลสอบ</h3></div>

    const passed = result.score >= (quiz?.passingScore || 60)

    return (
        <div className="animate-fade-in">
            <div className="quiz-container">
                <div className="glass-card result-card">
                    {/* Score Circle */}
                    <div className={`result-score-circle ${passed ? 'pass' : 'fail'}`}>
                        <div className="result-score-value" style={{ color: passed ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                            {result.score}%
                        </div>
                        <div className="result-score-label">คะแนน</div>
                    </div>

                    {/* Status */}
                    <div className={`result-status ${passed ? 'pass' : 'fail'}`}>
                        {passed ? (
                            <><Trophy size={24} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> ยินดีด้วย! คุณผ่านแบบทดสอบ</>
                        ) : (
                            <><XCircle size={24} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> ไม่ผ่านเกณฑ์ ลองอีกครั้ง</>
                        )}
                    </div>

                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
                        {quiz?.title}
                    </p>

                    {/* Details */}
                    <div className="grid-3" style={{ marginBottom: 'var(--space-xl)', textAlign: 'center' }}>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-success)' }}>
                                {result.correctAnswers}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ตอบถูก</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-danger)' }}>
                                {result.totalQuestions - result.correctAnswers}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ตอบผิด</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-info)' }}>
                                {result.totalQuestions}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ข้อทั้งหมด</div>
                        </div>
                    </div>

                    {/* Passing Criteria */}
                    <div style={{
                        padding: 'var(--space-md)',
                        background: passed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-xl)',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)'
                    }}>
                        <CheckCircle size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle', color: passed ? 'var(--accent-success)' : 'var(--accent-danger)' }} />
                        เกณฑ์ผ่าน: {quiz?.passingScore}% · คะแนนของคุณ: {result.score}%
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center gap-md">
                        {quiz && (
                            <button className="btn btn-secondary" onClick={() => navigate(`/quiz/${quiz.id}`)}>
                                <RotateCcw size={16} /> ทำอีกครั้ง
                            </button>
                        )}
                        {quiz && (
                            <button className="btn btn-primary" onClick={() => navigate(`/courses/${quiz.courseId}`)}>
                                <ArrowLeft size={16} /> กลับหน้าคอร์ส
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

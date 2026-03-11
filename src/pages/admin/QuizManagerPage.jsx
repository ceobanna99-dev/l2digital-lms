import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Plus, Edit2, Trash2, X, FileQuestion } from 'lucide-react'

export default function QuizManagerPage() {
    const [quizzes, setQuizzes] = useState([])
    const [courses, setCourses] = useState([])
    const [allLessons, setAllLessons] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [loading, setLoading] = useState(true)

    const emptyQuestion = { text: '', options: ['', '', '', ''], correctAnswer: 0 }
    const [form, setForm] = useState({
        title: '', courseId: '', lessonId: '', passingScore: 60, timeLimit: 300,
        questions: [{ ...emptyQuestion }]
    })


    const loadData = async () => {
        try {
            const [
                { data: q },
                { data: c },
                { data: l },
            ] = await Promise.all([
                supabase.from('quizzes').select('*'),
                supabase.from('courses').select('*'),
                supabase.from('lessons').select('*'),
            ])
            setQuizzes(q || [])
            setCourses(c || [])
            setAllLessons(l || [])
        } catch (err) {
            console.error("Error loading quiz data:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadData() }, [])

    // Lessons filtered by selected course
    const filteredLessons = allLessons.filter(l => l.courseId === parseInt(form.courseId))

    const openModal = (quiz = null) => {
        if (quiz) {
            setForm({
                title: quiz.title,
                courseId: quiz.courseId,
                lessonId: quiz.lessonId || '',
                passingScore: quiz.passingScore,
                timeLimit: quiz.timeLimit,
                questions: quiz.questions.map(q => ({ ...q }))
            })
            setEditItem(quiz)
        } else {
            setForm({
                title: '', courseId: courses[0]?.id || '', lessonId: '', passingScore: 60, timeLimit: 300,
                questions: [{ id: 1, ...emptyQuestion }]
            })
            setEditItem(null)
        }
        setShowModal(true)
    }

    const addQuestion = () => {
        setForm(prev => ({
            ...prev,
            questions: [...prev.questions, { id: prev.questions.length + 1, ...emptyQuestion }]
        }))
    }

    const removeQuestion = (index) => {
        setForm(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index)
        }))
    }

    const updateQuestion = (index, field, value) => {
        setForm(prev => {
            const questions = [...prev.questions]
            questions[index] = { ...questions[index], [field]: value }
            return { ...prev, questions }
        })
    }

    const updateOption = (qIndex, oIndex, value) => {
        setForm(prev => {
            const questions = [...prev.questions]
            const options = [...questions[qIndex].options]
            options[oIndex] = value
            questions[qIndex] = { ...questions[qIndex], options }
            return { ...prev, questions }
        })
    }

    const saveQuiz = async () => {
        if (!form.title.trim() || form.questions.length === 0) return

        const quizData = {
            ...form,
            courseId: parseInt(form.courseId),
            lessonId: form.lessonId ? parseInt(form.lessonId) : null,
            passingScore: parseInt(form.passingScore),
            timeLimit: parseInt(form.timeLimit),
            questions: form.questions.map((q, i) => ({
                ...q,
                id: i + 1,
                correctAnswer: parseInt(q.correctAnswer)
            }))
        }

        try {
            if (editItem) {
                await supabase
                    .from('quizzes')
                    .update(quizData)
                    .eq('id', editItem.id)
            } else {
                await supabase
                    .from('quizzes')
                    .insert([quizData])
            }
            setShowModal(false)
            loadData()
        } catch (err) {
            console.error("Error saving quiz:", err)
        }
    }

    const deleteQuiz = async (id) => {
        if (!confirm('ยืนยันการลบแบบทดสอบนี้?')) return
        try {
            await supabase.from('quizzes').delete().eq('id', id)
            loadData()
        } catch (err) {
            console.error("Error deleting quiz:", err)
        }
    }

    if (loading) return <div className="loading-spinner" />

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>📝 จัดการข้อสอบ</h1>
                <p>สร้างและจัดการแบบทดสอบสำหรับแต่ละคอร์สและบทเรียน</p>
            </div>

            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>ทั้งหมด {quizzes.length} แบบทดสอบ</span>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={16} /> สร้างแบบทดสอบ
                </button>
            </div>

            {/* Quiz List */}
            <div className="glass-card glass-card--static">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ชื่อแบบทดสอบ</th>
                            <th>คอร์ส</th>
                            <th>บทเรียน</th>
                            <th>จำนวนข้อ</th>
                            <th>เกณฑ์ผ่าน</th>
                            <th>เวลา</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quizzes.map(q => {
                            const course = courses.find(c => c.id === q.courseId)
                            const lesson = q.lessonId ? allLessons.find(l => l.id === q.lessonId) : null
                            return (
                                <tr key={q.id}>
                                    <td>
                                        <div className="flex items-center gap-sm">
                                            <FileQuestion size={16} style={{ color: 'var(--accent-primary)' }} />
                                            <strong>{q.title}</strong>
                                        </div>
                                    </td>
                                    <td>{course?.title || '-'}</td>
                                    <td>
                                        {lesson ? (
                                            <span style={{ fontSize: '0.85rem' }}>{lesson.title}</span>
                                        ) : (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>แบบทดสอบรวม</span>
                                        )}
                                    </td>
                                    <td>{q.questions.length} ข้อ</td>
                                    <td>{q.passingScore}%</td>
                                    <td>{Math.floor(q.timeLimit / 60)} นาที</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn btn-ghost btn-sm" onClick={() => openModal(q)}><Edit2 size={14} /></button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => deleteQuiz(q.id)} style={{ color: 'var(--accent-danger)' }}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', maxHeight: '90vh' }}>
                        <div className="modal-header">
                            <h2>{editItem ? 'แก้ไข' : 'สร้าง'}แบบทดสอบ</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>

                        <div className="flex flex-col gap-md" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div className="form-group">
                                <label className="form-label">ชื่อแบบทดสอบ</label>
                                <input className="form-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                            </div>

                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">คอร์ส</label>
                                    <select className="form-select" value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value, lessonId: '' }))}>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">บทเรียน (Lesson)</label>
                                    <select className="form-select" value={form.lessonId} onChange={e => setForm(p => ({ ...p, lessonId: e.target.value }))}>
                                        <option value="">— ไม่ผูก Lesson (แบบทดสอบรวม) —</option>
                                        {filteredLessons.map(l => <option key={l.id} value={l.id}>Lesson {l.order}: {l.title}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">เกณฑ์ผ่าน (%)</label>
                                    <input type="number" className="form-input" value={form.passingScore} onChange={e => setForm(p => ({ ...p, passingScore: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">เวลา (วินาที)</label>
                                    <input type="number" className="form-input" value={form.timeLimit} onChange={e => setForm(p => ({ ...p, timeLimit: e.target.value }))} />
                                </div>
                            </div>

                            {/* Questions */}
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-md)' }}>
                                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-md)' }}>
                                    <label className="form-label" style={{ fontWeight: 600, fontSize: '1rem' }}>คำถาม ({form.questions.length} ข้อ)</label>
                                    <button className="btn btn-sm btn-secondary" onClick={addQuestion}>
                                        <Plus size={14} /> เพิ่มคำถาม
                                    </button>
                                </div>

                                {form.questions.map((q, qi) => (
                                    <div key={qi} style={{
                                        padding: 'var(--space-md)',
                                        background: 'var(--bg-glass)',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: 'var(--space-md)',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-sm)' }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-primary)' }}>ข้อที่ {qi + 1}</span>
                                            {form.questions.length > 1 && (
                                                <button className="btn btn-ghost btn-sm" onClick={() => removeQuestion(qi)} style={{ color: 'var(--accent-danger)' }}>
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                        <input className="form-input" placeholder="พิมพ์คำถาม" value={q.text} onChange={e => updateQuestion(qi, 'text', e.target.value)} style={{ marginBottom: 'var(--space-sm)' }} />
                                        {q.options.map((opt, oi) => (
                                            <div key={oi} className="flex items-center gap-sm" style={{ marginBottom: 'var(--space-xs)' }}>
                                                <input
                                                    type="radio"
                                                    name={`correct-${qi}`}
                                                    checked={parseInt(q.correctAnswer) === oi}
                                                    onChange={() => updateQuestion(qi, 'correctAnswer', oi)}
                                                    style={{ accentColor: 'var(--accent-success)' }}
                                                />
                                                <input className="form-input" style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} placeholder={`ตัวเลือกที่ ${oi + 1}`} value={opt} onChange={e => updateOption(qi, oi, e.target.value)} />
                                            </div>
                                        ))}
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            ✅ เลือก radio เพื่อกำหนดคำตอบที่ถูกต้อง
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>ยกเลิก</button>
                                <button className="btn btn-primary" onClick={saveQuiz}>บันทึก</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

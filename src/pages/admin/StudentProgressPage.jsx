import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Search, ChevronDown, ChevronUp, Trophy, BookOpen, FileQuestion, Plus, X, Upload, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function StudentProgressPage() {
    const [students, setStudents] = useState([])
    const [quizResults, setQuizResults] = useState([])
    const [lessonProgress, setLessonProgress] = useState([])
    const [quizzes, setQuizzes] = useState([])
    const [lessons, setLessons] = useState([])
    const [courses, setCourses] = useState([])
    const [search, setSearch] = useState('')
    const [expandedStudent, setExpandedStudent] = useState(null)
    const [loading, setLoading] = useState(true)

    // Add Student state
    const [showAddModal, setShowAddModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [newStudent, setNewStudent] = useState({
        employeeId: '',
        name: '',
        email: '',
        password: '',
        department: 'General'
    })
    const [addError, setAddError] = useState('')
    const [editStudent, setEditStudent] = useState(null)
    const [editError, setEditError] = useState('')
    const [importing, setImporting] = useState(false)

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [
                    { data: usersData },
                    { data: coursesData },
                    { data: lessonsData },
                    { data: quizzesData },
                    { data: progressData },
                    { data: resultsData }
                ] = await Promise.all([
                    supabase.from('users').select('*').eq('role', 'student'),
                    supabase.from('courses').select('*'),
                    supabase.from('lessons').select('*'),
                    supabase.from('quizzes').select('*'),
                    supabase.from('lessonProgress').select('*'),
                    supabase.from('quizResults').select('*')
                ])

                setStudents(usersData || [])
                setCourses(coursesData || [])
                setLessons(lessonsData || [])
                setQuizzes(quizzesData || [])
                setLessonProgress(progressData || [])
                setQuizResults(resultsData || [])
            } catch (err) {
                console.error("Error fetching data:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleAddStudent = async (e) => {
        e.preventDefault()
        setAddError('')
        setSaving(true)

        try {
            const { data, error } = await supabase
                .from('users')
                .insert([{
                    ...newStudent,
                    password: newStudent.password || 'student123',
                    role: 'student',
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newStudent.name)}`
                }])
                .select()
                .single()

            if (!error && data) {
                setStudents([...students, data])
                setShowAddModal(false)
                setNewStudent({ employeeId: '', name: '', email: '', password: '', department: 'General' })
            } else {
                setAddError(error?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
            }
        } catch (err) {
            setAddError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
        } finally {
            setSaving(false)
        }
    }

    const handleEditStudentSubmit = async (e) => {
        e.preventDefault()
        setEditError('')
        setSaving(true)

        try {
            // Remove id from object to avoid updating primary key
            const { id, ...updateData } = editStudent
            const { data, error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (!error && data) {
                setStudents(students.map(s => s.id === id ? data : s))
                setEditStudent(null)
            } else {
                setEditError(error?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
            }
        } catch (err) {
            setEditError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
        } finally {
            setSaving(false)
        }
    }

    const handleExportCSV = () => {
        if (students.length === 0) return
        
        const headers = ['รหัสพนักงาน', 'ชื่อ-นามสกุล', 'อีเมล', 'แผนก', 'รหัสผ่าน']
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
            + headers.join(",") + "\n"
            + students.map(s => `"${s.employeeId || ''}","${s.name}","${s.email || ''}","${s.department}",""`).join("\n")
            
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", "students.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleImportCSV = (e) => {
        const file = e.target.files[0]
        if (!file) return
        
        setImporting(true)
        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const text = event.target.result
                const lines = text.split('\n').filter(line => line.trim() !== '')
                // Skip header (i === 0)
                const newStudentsList = []
                for (let i = 1; i < lines.length; i++) {
                    // Simple CSV parser ignoring commas inside quotes
                    const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
                    const cleanRow = row.map(col => col ? col.replace(/^"|"$/g, '').trim() : '')
                    
                    if (cleanRow.length >= 2 && cleanRow[1]) {
                        newStudentsList.push({
                            employeeId: cleanRow[0] || '',
                            name: cleanRow[1],
                            email: cleanRow[2] || '',
                            department: cleanRow[3] || 'General',
                            password: cleanRow[4] || 'student123',
                            role: 'student',
                            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanRow[1])}`
                        })
                    }
                }
                
                if (newStudentsList.length > 0) {
                    const { data, error } = await supabase
                        .from('users')
                        .insert(newStudentsList)
                    
                    if (error) throw error
                    
                    // Refresh data after all done
                    const { data: usersData } = await supabase.from('users').select('*').eq('role', 'student')
                    setStudents(usersData || [])
                    alert('นำเข้าข้อมูลสำเร็จ!')
                }
                
            } catch (err) {
                console.error(err)
                alert('เกิดข้อผิดพลาดในการนำเข้าไฟล์: ' + (err.message || ''))
            } finally {
                setImporting(false)
                e.target.value = null // reset input
            }
        }
        reader.readAsText(file)
    }

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.department.toLowerCase().includes(search.toLowerCase()) ||
        (s.employeeId && s.employeeId.includes(search))
    )

    if (loading) {
        return <div className="loading-spinner" />
    }

    return (
        <div className="animate-fade-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>👥 ผลนักเรียนรายบุคคล</h1>
                    <p>ดูรายละเอียดผลการเรียนของนักเรียนแต่ละคน และจัดการข้อมูลนักเรียน</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-md" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="search-wrapper" style={{ flex: 1, margin: 0 }}>
                    <Search className="search-icon" size={18} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="ค้นหาชื่อ, รหัสพนักงาน, อีเมล, แผนก..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-sm">
                    <input 
                        type="file" 
                        accept=".csv" 
                        id="csv-upload" 
                        style={{ display: 'none' }} 
                        onChange={handleImportCSV} 
                    />
                    <label htmlFor="csv-upload" className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                        <Upload size={18} /> {importing ? 'กำลังนำเข้า...' : 'นำเข้า (CSV)'}
                    </label>
                    <button className="btn btn-secondary" onClick={handleExportCSV} disabled={students.length === 0}>
                        <Download size={18} /> ส่งออก (CSV)
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={18} /> เพิ่มนักเรียน
                    </button>
                </div>
            </div>

            {/* Student Cards */}
            <div className="flex flex-col gap-md">
                {filteredStudents.map(student => {
                    const results = quizResults.filter(r => r.userId === student.id)
                    const progress = lessonProgress.filter(p => p.userId === student.id)
                    const completedLessons = progress.filter(p => p.completed).length
                    const avgScore = results.length > 0
                        ? Math.round(results.reduce((a, b) => a + b.score, 0) / results.length)
                        : 0
                    const isExpanded = expandedStudent === student.id

                    const chartData = results.map(r => {
                        const quiz = quizzes.find(q => q.id === r.quizId)
                        return { name: quiz?.title?.slice(0, 15) || `Quiz ${r.quizId}`, คะแนน: r.score }
                    })

                    return (
                        <div key={student.id} className="glass-card glass-card--static">
                            {/* Summary Row */}
                            <div
                                className="flex items-center justify-between"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                            >
                                <div className="flex items-center gap-md">
                                    <img src={student.avatar} alt={student.name} style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--border-color)' }} />
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{student.name} {student.employeeId && <span style={{fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal'}}>({student.employeeId})</span>}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{student.email} · {student.department}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-lg">
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{completedLessons}/{lessons.length}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>บทเรียน</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: avgScore >= 60 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{avgScore}%</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>คะแนนเฉลี่ย</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{results.length}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>สอบแล้ว</div>
                                    </div>
                                    <button
                                        className="btn btn-icon"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setEditStudent(student)
                                        }}
                                        title="แก้ไขข้อมูลนักเรียน"
                                        style={{ background: 'var(--bg-secondary)' }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                                    </button>
                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </div>

                            {/* Expanded Detail */}
                            {isExpanded && (
                                <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-color)' }}>
                                    <div className="grid-2">
                                        {/* Quiz Results */}
                                        <div>
                                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                                                <FileQuestion size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> ผลสอบ
                                            </h4>
                                            {results.length > 0 ? (
                                                <>
                                                    <div style={{ height: 180, marginBottom: 'var(--space-md)' }}>
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={chartData}>
                                                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                                                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                                                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                                                                <Bar dataKey="คะแนน" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                    {results.map(r => {
                                                        const quiz = quizzes.find(q => q.id === r.quizId)
                                                        const passed = r.score >= (quiz?.passingScore || 60)
                                                        return (
                                                            <div key={r.id} className="flex items-center justify-between" style={{ padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--border-color)' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{quiz?.title || `Quiz ${r.quizId}`}</div>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(r.completedAt).toLocaleDateString('th-TH')}</div>
                                                                </div>
                                                                <div className="flex items-center gap-sm">
                                                                    <span style={{ fontWeight: 600, color: passed ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{r.score}%</span>
                                                                    <span className={`badge ${passed ? 'badge-success' : 'badge-danger'}`}>{passed ? 'ผ่าน' : 'ไม่ผ่าน'}</span>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </>
                                            ) : (
                                                <div className="empty-state" style={{ padding: 'var(--space-md)' }}>
                                                    <p>ยังไม่มีผลสอบ</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Lesson Progress */}
                                        <div>
                                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                                                <BookOpen size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> ความคืบหน้าบทเรียน
                                            </h4>
                                            {progress.length > 0 ? (
                                                progress.map(p => {
                                                    const lesson = lessons.find(l => l.id === p.lessonId)
                                                    const course = lesson ? courses.find(c => c.id === lesson.courseId) : null
                                                    return (
                                                        <div key={p.id} className="flex items-center justify-between" style={{ padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--border-color)' }}>
                                                            <div>
                                                                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{lesson?.title || `Lesson ${p.lessonId}`}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{course?.title}</div>
                                                            </div>
                                                            <span className={`badge ${p.completed ? 'badge-success' : 'badge-warning'}`}>
                                                                {p.completed ? '✅ เรียนแล้ว' : '⏳ กำลังเรียน'}
                                                            </span>
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <div className="empty-state" style={{ padding: 'var(--space-md)' }}>
                                                    <p>ยังไม่มีข้อมูลการเรียน</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}

                {filteredStudents.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <h3>ไม่พบนักเรียน</h3>
                        <p>ลองเปลี่ยนคำค้นหา</p>
                    </div>
                )}
            </div>

            {/* Add Student Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card animate-fade-in" style={{ maxWidth: 500, width: '100%', padding: 'var(--space-xl)' }}>
                        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-xl)' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>เพิ่มนักเรียนใหม่</h2>
                            <button className="btn-icon" onClick={() => setShowAddModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>รหัสพนักงาน <span style={{color: 'var(--accent-danger)'}}>*</span></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        required
                                        value={newStudent.employeeId}
                                        onChange={e => setNewStudent({...newStudent, employeeId: e.target.value})}
                                        placeholder="เช่น EMP001"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>ชื่อ-นามสกุล <span style={{color: 'var(--accent-danger)'}}>*</span></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        required
                                        value={newStudent.name}
                                        onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                                        placeholder="เช่น สมชาย ใจดี"
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>อีเมล</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={newStudent.email}
                                    onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                                    placeholder="เช่น somchai@company.com (ระบุหรือไม่ก็ได้)"
                                />
                            </div>

                            <div className="grid-2">
                                <div className="form-group">
                                    <label>รหัสผ่าน</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={newStudent.password}
                                        onChange={e => setNewStudent({...newStudent, password: e.target.value})}
                                        placeholder="ค่าเริ่มต้น: student123"
                                    />
                                    <small style={{color: 'var(--text-muted)', display: 'block', marginTop: 4}}>
                                        เว้นว่างไว้เพื่อใช้รหัส <strong>student123</strong>
                                    </small>
                                </div>
                                <div className="form-group">
                                    <label>แผนก <span style={{color: 'var(--accent-danger)'}}>*</span></label>
                                    <input 
                                        className="form-control"
                                        list="department-options"
                                        required
                                        placeholder="เลือกหรือพิมพ์แผนกใหม่..."
                                        value={newStudent.department}
                                        onChange={e => setNewStudent({...newStudent, department: e.target.value})}
                                    />
                                    <datalist id="department-options">
                                        <option value="General" />
                                        <option value="Inbound" />
                                        <option value="Outbound" />
                                        <option value="Technical Support" />
                                        <option value="Customer Service" />
                                        <option value="Sales" />
                                    </datalist>
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-sm" style={{ marginTop: 'var(--space-lg)' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={saving}>
                                    ยกเลิก
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {editStudent && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card animate-fade-in" style={{ maxWidth: 500, width: '100%', padding: 'var(--space-xl)' }}>
                        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-xl)' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>แก้ไขข้อมูลนักเรียน</h2>
                            <button className="btn-icon" onClick={() => setEditStudent(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleEditStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            {editError && <div className="error-message" style={{ color: 'var(--accent-danger)', fontSize: '0.9rem', marginBottom: 'var(--space-sm)' }}>{editError}</div>}
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>รหัสพนักงาน <span style={{color: 'var(--accent-danger)'}}>*</span></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        required
                                        value={editStudent.employeeId || ''}
                                        onChange={e => setEditStudent({...editStudent, employeeId: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>ชื่อ-นามสกุล <span style={{color: 'var(--accent-danger)'}}>*</span></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        required
                                        value={editStudent.name}
                                        onChange={e => setEditStudent({...editStudent, name: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>อีเมล</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={editStudent.email}
                                    onChange={e => setEditStudent({...editStudent, email: e.target.value})}
                                />
                            </div>

                            <div className="form-group">
                                <label>แผนก <span style={{color: 'var(--accent-danger)'}}>*</span></label>
                                <input 
                                    className="form-control"
                                    list="department-options-edit"
                                    required
                                    placeholder="เลือกหรือพิมพ์แผนกใหม่..."
                                    value={editStudent.department}
                                    onChange={e => setEditStudent({...editStudent, department: e.target.value})}
                                />
                                <datalist id="department-options-edit">
                                    <option value="General" />
                                    <option value="Inbound" />
                                    <option value="Outbound" />
                                    <option value="Technical Support" />
                                    <option value="Customer Service" />
                                    <option value="Sales" />
                                </datalist>
                            </div>
                            
                            <div className="flex justify-end gap-sm" style={{ marginTop: 'var(--space-lg)' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setEditStudent(null)}>
                                    ยกเลิก
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    บันทึกการแก้ไข
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

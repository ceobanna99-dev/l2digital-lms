import { useState, useEffect, useRef, Fragment } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Plus, Edit2, Trash2, X, BookOpen, FileText, Image, Film, Loader, ChevronDown, ChevronRight } from 'lucide-react'

export default function ContentManagerPage() {
    const [courses, setCourses] = useState([])
    const [lessons, setLessons] = useState([])
    const [tab, setTab] = useState('courses')
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [expandedCourseId, setExpandedCourseId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [lessonProgress, setLessonProgress] = useState([])
    const [allStudents, setAllStudents] = useState([])
    const [courseFilter, setCourseFilter] = useState('all')

    const loadData = async () => {
        try {
            const [
                { data: c },
                { data: l },
                { data: p },
                { data: s },
            ] = await Promise.all([
                supabase.from('courses').select('*'),
                supabase.from('lessons').select('*'),
                supabase.from('lessonProgress').select('*'),
                supabase.from('users').select('*').eq('role', 'student'),
            ])
            setCourses(c || [])
            setLessons(l || [])
            setLessonProgress(p || [])
            setAllStudents(s || [])
        } catch (err) {
            console.error("Error loading data:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadData() }, [])

    // ---- File Upload to Supabase Storage ----
    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0]
        if (!file) return
        setUploading(true)
        
        try {
            // Generate a unique filename
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
            const filePath = `${type}s/${fileName}`

            // Upload to 'uploads' bucket
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filePath)

            if (publicUrl) {
                let markdown = ''
                if (type === 'image') {
                    markdown = `\n![${file.name}](${publicUrl})\n`
                } else if (type === 'pdf') {
                    markdown = `\n[📥 ดาวน์โหลด ${file.name}](${publicUrl})\n`
                } else {
                    markdown = `\n[video](${publicUrl})\n`
                }
                setLessonForm(prev => ({ ...prev, content: prev.content + markdown }))
            }
        } catch (err) {
            console.error('Upload error:', err)
            alert('อัพโหลดไม่สำเร็จ: ' + err.message)
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    // ---- Course CRUD ----
    const [courseForm, setCourseForm] = useState({ title: '', description: '', thumbnail: '📞', category: 'พื้นฐาน', instructor: '' })

    const openCourseModal = (course = null) => {
        setTab('courses')
        if (course) {
            setCourseForm({ title: course.title, description: course.description, thumbnail: course.thumbnail, category: course.category, instructor: course.instructor || '' })
            setEditItem(course)
        } else {
            setCourseForm({ title: '', description: '', thumbnail: '📞', category: 'พื้นฐาน', instructor: '' })
            setEditItem(null)
        }
        setShowModal(true)
    }

    const saveCourse = async () => {
        if (!courseForm.title.trim()) return
        const today = new Date().toISOString().split('T')[0]
        
        try {
            if (editItem) {
                await supabase
                    .from('courses')
                    .update({ ...courseForm, updatedAt: today })
                    .eq('id', editItem.id)
            } else {
                await supabase
                    .from('courses')
                    .insert([{ ...courseForm, createdAt: today, updatedAt: today }])
            }
            setShowModal(false)
            loadData()
        } catch (err) {
            console.error("Error saving course:", err)
        }
    }

    const deleteCourse = async (id) => {
        if (!confirm('ยืนยันการลบคอร์สนี้?')) return
        try {
            await supabase.from('courses').delete().eq('id', id)
            loadData()
        } catch (err) {
            console.error("Error deleting course:", err)
        }
    }

    // ---- Lesson CRUD ----
    const [lessonForm, setLessonForm] = useState({ title: '', content: '', courseId: '', order: 1, instructor: '' })
    const contentRef = useRef(null)

    const openLessonModal = (lesson = null) => {
        setTab('lessons')
        if (lesson) {
            setLessonForm({ title: lesson.title, content: lesson.content, courseId: lesson.courseId, order: lesson.order, instructor: lesson.instructor || '' })
            setEditItem(lesson)
        } else {
            setLessonForm({ title: '', content: '', courseId: courses[0]?.id || '', order: 1, instructor: '' })
            setEditItem(null)
        }
        setShowModal(true)
    }

    const saveLesson = async () => {
        if (!lessonForm.title.trim()) return
        const today = new Date().toISOString().split('T')[0]
        const data = { ...lessonForm, courseId: parseInt(lessonForm.courseId), order: parseFloat(lessonForm.order) }
        
        try {
            if (editItem) {
                await supabase
                    .from('lessons')
                    .update({ ...data, updatedAt: today })
                    .eq('id', editItem.id)
            } else {
                await supabase
                    .from('lessons')
                    .insert([{ ...data, createdAt: today, updatedAt: today }])
            }
            setShowModal(false)
            loadData()
        } catch (err) {
            console.error("Error saving lesson:", err)
        }
    }

    const deleteLesson = async (id) => {
        if (!confirm('ยืนยันการลบบทเรียนนี้?')) return
        try {
            await supabase.from('lessons').delete().eq('id', id)
            loadData()
        } catch (err) {
            console.error("Error deleting lesson:", err)
        }
    }

    if (loading) return <div className="loading-spinner" />

    const emojis = ['📞', '🛡️', '💬', '💻', '📊', '🎯', '📚', '🏆', '⭐', '🔧']

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>📝 จัดการเนื้อหา</h1>
                <p>เพิ่ม แก้ไข และจัดการคอร์สเรียนกับบทเรียน</p>
            </div>

            <div className="tab-nav">
                <button className={`tab-btn ${tab === 'courses' ? 'active' : ''}`} onClick={() => setTab('courses')}>
                    <BookOpen size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> คอร์สเรียน ({courses.length})
                </button>
                <button className={`tab-btn ${tab === 'lessons' ? 'active' : ''}`} onClick={() => setTab('lessons')}>
                    <FileText size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> บทเรียน ({lessons.length})
                </button>
            </div>

            {tab === 'courses' && (
                <>
                    <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>ทั้งหมด {courses.length} คอร์ส</span>
                        <button className="btn btn-primary" onClick={() => openCourseModal()}><Plus size={16} /> เพิ่มคอร์ส</button>
                    </div>
                    <div className="glass-card glass-card--static">
                        <table className="data-table">
                            <thead><tr><th style={{ width: 40 }}></th><th>ไอคอน</th><th>ชื่อคอร์ส</th><th>ผู้สอน</th><th>หมวดหมู่</th><th>บทเรียน</th><th>ความคืบหน้า</th><th>อัปเดตล่าสุด</th><th>จัดการ</th></tr></thead>
                            <tbody>
                                {courses.map(c => {
                                    const courseLessons = lessons.filter(l => l.courseId === c.id)
                                    const lessonIds = courseLessons.map(l => l.id)
                                    const relevantProgress = lessonProgress.filter(p => lessonIds.includes(p.lessonId))
                                    const startedUserIds = [...new Set(relevantProgress.map(p => p.userId))]
                                    const totalStarted = startedUserIds.length
                                    const totalStudentsCount = allStudents.length
                                    const isExpanded = expandedCourseId === c.id
                                    
                                    let avgProgress = 0
                                    if (totalStudentsCount > 0 && courseLessons.length > 0) {
                                        const totalPossible = totalStudentsCount * courseLessons.length
                                        const totalCompleted = relevantProgress.filter(p => p.completed).length
                                        avgProgress = Math.round((totalCompleted / totalPossible) * 100)
                                    }

                                    return (
                                        <Fragment key={c.id}>
                                            <tr className={isExpanded ? 'active-row' : ''} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => setExpandedCourseId(isExpanded ? null : c.id)}>
                                                <td>
                                                    <button className="btn btn-ghost btn-xs" style={{ padding: 4 }}>
                                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    </button>
                                                </td>
                                                <td style={{ fontSize: '1.5rem' }}>{c.thumbnail}</td>
                                                <td><strong>{c.title}</strong><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(c.description || '').slice(0, 60)}...</div></td>
                                                <td style={{ fontSize: '0.85rem' }}>{c.instructor || 'ไม่ระบุ'}</td>
                                                <td><span className="badge badge-primary">{c.category}</span></td>
                                                <td>{courseLessons.length} บท</td>
                                                <td>
                                                    <div className="flex flex-col gap-xs" style={{ minWidth: 120 }}>
                                                        <div className="flex justify-between items-center" style={{ fontSize: '0.75rem', marginBottom: 4 }}>
                                                            <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{avgProgress}%</span>
                                                            <span style={{ color: 'var(--text-muted)' }}>{totalStarted}/{totalStudentsCount} คน</span>
                                                        </div>
                                                        <div className="progress-bar" style={{ height: 6 }}>
                                                            <div className="progress-bar-fill" style={{ width: `${avgProgress}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.updatedAt || c.createdAt ? new Date(c.updatedAt || c.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>
                                                <td>
                                                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => openCourseModal(c)}><Edit2 size={14} /></button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => deleteCourse(c.id)} style={{ color: 'var(--accent-danger)' }}><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                                                    <td colSpan="9" style={{ padding: '0 0 var(--space-md) 0' }}>
                                                        <div className="nested-lessons" style={{ marginLeft: 40, borderLeft: '2px solid var(--accent-primary)', paddingLeft: 'var(--space-md)' }}>
                                                            <table className="data-table data-table--small" style={{ fontSize: '0.85rem' }}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>#</th>
                                                                        <th>ชื่อบทเรียน</th>
                                                                        <th>ความคืบหน้า</th>
                                                                        <th>จัดการ</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {courseLessons.sort((a, b) => a.order - b.order).map(l => {
                                                                        const lessonProgressData = lessonProgress.filter(p => p.lessonId === l.id && p.completed)
                                                                        const lessonPercent = totalStudentsCount > 0 ? Math.round((lessonProgressData.length / totalStudentsCount) * 100) : 0
                                                                        return (
                                                                            <tr key={l.id}>
                                                                                <td style={{ width: 30 }}>{l.order}</td>
                                                                                <td>{l.title}</td>
                                                                                <td style={{ width: 150 }}>
                                                                                    <div className="flex flex-col gap-xs">
                                                                                        <div className="flex justify-between items-center" style={{ fontSize: '0.7rem' }}>
                                                                                            <span style={{ color: 'var(--accent-success)' }}>{lessonPercent}%</span>
                                                                                            <span style={{ color: 'var(--text-muted)' }}>{lessonProgressData.length}/{totalStudentsCount} คน</span>
                                                                                        </div>
                                                                                        <div className="progress-bar" style={{ height: 4 }}>
                                                                                            <div className="progress-bar-fill" style={{ width: `${lessonPercent}%`, background: 'var(--gradient-success)' }}></div>
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                                <td style={{ width: 80 }}>
                                                                                    <div className="action-buttons">
                                                                                        <button className="btn btn-ghost btn-xs" onClick={() => openLessonModal(l)}><Edit2 size={12} /></button>
                                                                                        <button className="btn btn-ghost btn-xs" onClick={() => deleteLesson(l.id)} style={{ color: 'var(--accent-danger)' }}><Trash2 size={12} /></button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )
                                                                    })}
                                                                    {courseLessons.length === 0 && (
                                                                        <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>ยังไม่มีบทเรียน</td></tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {tab === 'lessons' && (
                <>
                    <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                        <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>ทั้งหมด {lessons.length} บทเรียน</span>
                            <div className="flex items-center gap-sm">
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>กรองตามคอร์ส:</span>
                                <select 
                                    className="form-select" 
                                    style={{ padding: '0.25rem 2rem 0.25rem 0.75rem', fontSize: '0.85rem', width: 'auto' }}
                                    value={courseFilter}
                                    onChange={(e) => setCourseFilter(e.target.value)}
                                >
                                    <option value="all">ทุกคอร์ส</option>
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>
                        </div>
                        <button className="btn btn-primary" onClick={() => openLessonModal()}><Plus size={16} /> เพิ่มบทเรียน</button>
                    </div>
                    <div className="glass-card glass-card--static">
                        <table className="data-table">
                            <thead><tr><th>ลำดับ</th><th>ชื่อบทเรียน</th><th>คอร์ส</th><th>ผู้สอน/ผู้สร้าง</th><th>ความคืบหน้า</th><th>อัปเดตล่าสุด</th><th>จัดการ</th></tr></thead>
                            <tbody>
                                {lessons
                                    .filter(l => courseFilter === 'all' || l.courseId === parseInt(courseFilter))
                                    .sort((a, b) => {
                                        if (a.courseId !== b.courseId) return a.courseId - b.courseId;
                                        return (a.order || 0) - (b.order || 0);
                                    })
                                    .map(l => {
                                    const course = courses.find(c => c.id === l.courseId)
                                    const lessonProgressData = lessonProgress.filter(p => p.lessonId === l.id && p.completed)
                                    const totalCompleted = lessonProgressData.length
                                    const totalStudentsCount = allStudents.length
                                    const percent = totalStudentsCount > 0 ? Math.round((totalCompleted / totalStudentsCount) * 100) : 0

                                    return (
                                        <tr key={l.id}>
                                            <td>{l.order}</td>
                                            <td><strong>{l.title}</strong></td>
                                            <td>{course?.title || '-'}</td>
                                            <td style={{ fontSize: '0.85rem' }}>{l.instructor || '-'}</td>
                                            <td>
                                                <div className="flex flex-col gap-xs" style={{ minWidth: 100 }}>
                                                    <div className="flex justify-between items-center" style={{ fontSize: '0.75rem', marginBottom: 4 }}>
                                                        <span style={{ fontWeight: 600, color: 'var(--accent-success)' }}>{percent}%</span>
                                                        <span style={{ color: 'var(--text-muted)' }}>{totalCompleted}/{totalStudentsCount} คน</span>
                                                    </div>
                                                    <div className="progress-bar" style={{ height: 6 }}>
                                                        <div className="progress-bar-fill" style={{ width: `${percent}%`, background: 'var(--gradient-success)' }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{l.updatedAt || l.createdAt ? new Date(l.updatedAt || l.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="btn btn-ghost btn-sm" onClick={() => openLessonModal(l)}><Edit2 size={14} /></button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => deleteLesson(l.id)} style={{ color: 'var(--accent-danger)' }}><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editItem ? 'แก้ไข' : 'เพิ่ม'}{tab === 'courses' ? 'คอร์ส' : 'บทเรียน'}</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>

                        {tab === 'courses' ? (
                            <div className="flex flex-col gap-md">
                                <div className="form-group">
                                    <label className="form-label">ไอคอน</label>
                                    <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                        {emojis.map(e => (
                                            <button key={e} onClick={() => setCourseForm(p => ({ ...p, thumbnail: e }))}
                                                style={{ fontSize: '1.5rem', padding: '0.5rem', background: courseForm.thumbnail === e ? 'rgba(99, 102, 241, 0.15)' : 'transparent', border: `1px solid ${courseForm.thumbnail === e ? 'var(--accent-primary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                                            >{e}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group"><label className="form-label">ชื่อผู้สอน/ผู้สร้าง</label><input className="form-input" value={courseForm.instructor} onChange={e => setCourseForm(p => ({ ...p, instructor: e.target.value }))} placeholder="ชื่ออาจารย์ หรือ ทีมงาน" /></div>
                                <div className="form-group"><label className="form-label">ชื่อคอร์ส</label><input className="form-input" value={courseForm.title} onChange={e => setCourseForm(p => ({ ...p, title: e.target.value }))} placeholder="ชื่อคอร์ส" /></div>
                                <div className="form-group"><label className="form-label">คำอธิบาย</label><textarea className="form-input form-textarea" value={courseForm.description} onChange={e => setCourseForm(p => ({ ...p, description: e.target.value }))} placeholder="คำอธิบายคอร์ส" /></div>
                                <div className="form-group">
                                    <label className="form-label">หมวดหมู่</label>
                                    <select className="form-select" value={courseForm.category} onChange={e => setCourseForm(p => ({ ...p, category: e.target.value }))}>
                                        <option value="พื้นฐาน">พื้นฐาน</option><option value="ขั้นสูง">ขั้นสูง</option><option value="เทคนิค">เทคนิค</option>
                                    </select>
                                </div>
                                <div className="modal-actions">
                                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>ยกเลิก</button>
                                    <button className="btn btn-primary" onClick={saveCourse}>บันทึก</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-md">
                                <div className="form-group">
                                    <label className="form-label">คอร์ส</label>
                                    <select className="form-select" value={lessonForm.courseId} onChange={e => setLessonForm(p => ({ ...p, courseId: e.target.value }))}>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">ชื่อผู้สอน/ผู้สร้าง</label><input className="form-input" value={lessonForm.instructor} onChange={e => setLessonForm(p => ({ ...p, instructor: e.target.value }))} placeholder="ชื่ออาจารย์ หรือ ทีมงาน" /></div>
                                <div className="form-group"><label className="form-label">ชื่อบทเรียน</label><input className="form-input" value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} placeholder="ชื่อบทเรียน" /></div>
                                <div className="form-group"><label className="form-label">ลำดับ</label><input type="number" className="form-input" value={lessonForm.order} onChange={e => setLessonForm(p => ({ ...p, order: e.target.value }))} min="1" step="any" /></div>
                                <div className="form-group">
                                    <label className="form-label">เนื้อหา</label>
                                    <textarea ref={contentRef} className="form-input form-textarea" style={{ minHeight: '200px' }} value={lessonForm.content} onChange={e => setLessonForm(p => ({ ...p, content: e.target.value }))} placeholder="เนื้อหาบทเรียน..." />
                                </div>

                                {/* Upload Buttons */}
                                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color-hover)' }}>
                                    <input type="file" id="img-upload" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'image')} />
                                    <input type="file" id="vid-upload" accept="video/*" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'video')} />
                                    <input type="file" id="pdf-upload" accept="application/pdf" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'pdf')} />
                                    
                                    <button className="btn btn-secondary btn-sm" onClick={() => document.getElementById('img-upload').click()} disabled={uploading}>
                                        {uploading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Image size={14} />} อัพโหลดรูปภาพ
                                    </button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => document.getElementById('vid-upload').click()} disabled={uploading}>
                                        {uploading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Film size={14} />} อัพโหลดวีดีโอ
                                    </button>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => document.getElementById('pdf-upload').click()} disabled={uploading}>
                                        {uploading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={14} />} อัพโหลด PDF
                                    </button>
                                    
                                    {uploading && <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center' }}>กำลังอัพโหลด...</span>}
                                </div>

                                <div className="modal-actions">
                                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>ยกเลิก</button>
                                    <button className="btn btn-primary" onClick={saveLesson}>บันทึก</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

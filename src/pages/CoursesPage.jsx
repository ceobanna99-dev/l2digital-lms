import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabaseClient'
import { Search, BookOpen, ArrowRight } from 'lucide-react'

export default function CoursesPage() {
    const navigate = useNavigate()
    const [courses, setCourses] = useState([])
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCourses = async () => {
            const { data, error } = await supabase.from('courses').select('*')
            if (!error && data) {
                setCourses(data)
            }
            setLoading(false)
        }
        fetchCourses()
    }, [])

    const categories = [...new Set(courses.map(c => c.category))]

    const filtered = courses.filter(c => {
        const matchSearch = c.title.includes(search) || c.description.includes(search)
        const matchFilter = filter === 'all' || c.category === filter
        return matchSearch && matchFilter
    })

    if (loading) return <div className="loading-spinner" />

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>📚 คอร์สเรียนทั้งหมด</h1>
                <p>เลือกคอร์สที่สนใจเพื่อเริ่มการเรียนรู้</p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-md" style={{ marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
                <div className="search-wrapper">
                    <Search className="search-icon" size={18} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="ค้นหาคอร์ส..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex gap-sm">
                    <button
                        className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter('all')}
                    >
                        ทั้งหมด
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilter(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Course Grid */}
            {filtered.length > 0 ? (
                <div className="grid-3">
                    {filtered.map((course, i) => (
                        <div
                            key={course.id}
                            className={`glass-card course-card animate-slide-up stagger-${i + 1}`}
                            onClick={() => navigate(`/courses/${course.id}`)}
                        >
                            <div className="course-card-thumbnail">{course.thumbnail}</div>
                            <div className="course-card-body">
                                <h3>{course.title}</h3>
                                <p>{course.description}</p>
                                <div className="course-card-footer">
                                    <span className="badge badge-primary">{course.category}</span>
                                    <button className="btn btn-ghost btn-sm">
                                        เรียน <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <h3>ไม่พบคอร์สที่ค้นหา</h3>
                    <p>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
                </div>
            )}
        </div>
    )
}

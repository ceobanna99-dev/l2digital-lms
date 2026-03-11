import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, ArrowRight, CheckCircle, BookOpen, Star, MessageSquare } from 'lucide-react'
import SecurePdfViewer from '../components/SecurePdfViewer'
import ReactPlayer from 'react-player'

export default function LessonPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [lesson, setLesson] = useState(null)
    const [allLessons, setAllLessons] = useState([])
    const [progress, setProgress] = useState(null)
    const [loading, setLoading] = useState(true)
    const [totalVideos, setTotalVideos] = useState(0)
    const [completedVideoIndices, setCompletedVideoIndices] = useState(new Set())
    const [lessonQuizzes, setLessonQuizzes] = useState([])
    const [passedQuizzes, setPassedQuizzes] = useState(false)
    
    // Rating states
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [comment, setComment] = useState('')
    const [existingRating, setExistingRating] = useState(null)
    const [submittingRating, setSubmittingRating] = useState(false)

    useEffect(() => {
        const loadLessonData = async () => {
            try {
                // Fetch current lesson
                const { data: lessonData } = await supabase.from('lessons').select('*').eq('id', id).single()
                if (!lessonData) {
                    setLoading(false)
                    return
                }
                setLesson(lessonData)

                const [
                    { data: allLessonsData },
                    { data: progressData },
                    { data: ratingData },
                    { data: quizzesData },
                    { data: quizResultsData }
                ] = await Promise.all([
                    supabase.from('lessons').select('*').eq('courseId', lessonData.courseId).order('order', { ascending: true }),
                    supabase.from('lessonProgress').select('*').eq('userId', user.id).eq('lessonId', id),
                    supabase.from('lessonRatings').select('*').eq('userId', user.id).eq('lessonId', id),
                    supabase.from('quizzes').select('*').eq('lessonId', id),
                    supabase.from('quizResults').select('*').eq('userId', user.id)
                ])

                setAllLessons(allLessonsData || [])
                setProgress(progressData && progressData.length > 0 ? progressData[0] : null)
                
                // Check if all quizzes for this lesson are passed
                const quizzes = quizzesData || []
                setLessonQuizzes(quizzes)
                
                if (quizzes.length > 0) {
                    const results = quizResultsData || []
                    const allPassed = quizzes.every(quiz => {
                        const bestResult = results.filter(r => r.quizId === quiz.id).reduce((best, r) => r.score > best.score ? r : best, { score: -1 })
                        return bestResult.score >= quiz.passingScore
                    })
                    setPassedQuizzes(allPassed)
                } else {
                    setPassedQuizzes(true)
                }
                
                if (ratingData && ratingData.length > 0) {
                    setExistingRating(ratingData[0])
                    setRating(ratingData[0].rating)
                    setComment(ratingData[0].comment || '')
                } else {
                    setExistingRating(null)
                    setRating(0)
                    setComment('')
                }
            } catch (err) {
                console.error("Error loading lesson:", err)
            } finally {
                setLoading(false)
            }
        }
        
        if (id && user) {
            loadLessonData()
        }
    }, [id, user?.id])

    useEffect(() => {
        if (lesson && lesson.content) {
            let count = 0
            const lines = lesson.content.split('\n')
            for (const line of lines) {
                if (line.match(/^\[video\]\(([^)]+)\)/) || line.match(/^https?:\/\/(www\.)?(player\.)?vimeo\.com\/(video\/)?(\d+)/)) {
                    count++
                }
            }
            setTotalVideos(count)
            setCompletedVideoIndices(new Set())
        }
    }, [lesson])

    const markComplete = async () => {
        try {
            if (progress) {
                await supabase
                    .from('lessonProgress')
                    .update({ completed: true, completedAt: new Date().toISOString() })
                    .eq('id', progress.id)
            } else {
                await supabase
                    .from('lessonProgress')
                    .insert([{
                        userId: user.id,
                        lessonId: parseInt(id),
                        completed: true,
                        completedAt: new Date().toISOString()
                    }])
            }
            setProgress({ ...progress, completed: true })
        } catch (err) {
            console.error("Error marking complete:", err)
        }
    }

    const submitRating = async () => {
        if (rating === 0) return
        setSubmittingRating(true)
        
        try {
            if (existingRating) {
                const { data, error } = await supabase
                    .from('lessonRatings')
                    .update({ rating, comment, updatedAt: new Date().toISOString() })
                    .eq('id', existingRating.id)
                    .select()
                    
                if (!error && data && data.length > 0) {
                    setExistingRating(data[0])
                }
            } else {
                const { data, error } = await supabase
                    .from('lessonRatings')
                    .insert([{
                        userId: user.id,
                        lessonId: parseInt(id),
                        courseId: lesson.courseId,
                        rating,
                        comment,
                        createdAt: new Date().toISOString()
                    }])
                    .select()
                    
                if (!error && data && data.length > 0) {
                    setExistingRating(data[0])
                }
            }
        } catch (error) {
            console.error("Error submitting rating:", error)
        } finally {
            setSubmittingRating(false)
        }
    }

    if (loading) return <div className="loading-spinner" />
    if (!lesson) return <div className="empty-state"><h3>ไม่พบบทเรียนนี้</h3></div>

    const currentIndex = allLessons.findIndex(l => l.id === parseInt(id))
    const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
    const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null
    const isCompleted = progress?.completed
    const isAllVideosCompleted = totalVideos === 0 || completedVideoIndices.size >= totalVideos

    // Helper: extract YouTube video ID
    const getYouTubeId = (url) => {
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/)
        return match ? match[1] : null
    }

    // Markdown-like rendering with image & video support
    const renderContent = (content) => {
        return content.split('\n').map((line, i) => {
            // Image: ![alt text](url)
            const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/)
            if (imgMatch) {
                return (
                    <figure key={i} style={{ margin: 'var(--space-lg) 0', textAlign: 'center' }}>
                        <img
                            src={imgMatch[2]}
                            alt={imgMatch[1]}
                            style={{
                                maxWidth: '100%',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: 'var(--shadow-md)',
                                border: '1px solid var(--border-color)'
                            }}
                        />
                        {imgMatch[1] && (
                            <figcaption style={{ marginTop: 'var(--space-sm)', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                {imgMatch[1]}
                            </figcaption>
                        )}
                    </figure>
                )
            }

            // Video: [video](url) — supports YouTube and direct video
            const vidMatch = line.match(/^\[video\]\(([^)]+)\)/)
            if (vidMatch) {
                const url = vidMatch[1]
                const isDirectMp4 = url.toLowerCase().endsWith('.mp4')

                return (
                    <div key={i} style={{ margin: 'var(--space-lg) 0', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-md)', position: 'relative', paddingBottom: isDirectMp4 ? 'auto' : '56.25%', height: isDirectMp4 ? 'auto' : 0 }}>
                        {isDirectMp4 ? (
                            <video 
                                src={url} 
                                controls 
                                width="100%" 
                                style={{ display: 'block', borderRadius: 'var(--radius-lg)' }}
                                onEnded={() => setCompletedVideoIndices(prev => new Set(prev).add(i))}
                            >
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            <ReactPlayer 
                                url={url} 
                                controls 
                                width="100%" 
                                height="100%" 
                                style={{ position: 'absolute', top: 0, left: 0 }}
                                onEnded={() => setCompletedVideoIndices(prev => new Set(prev).add(i))}
                            />
                        )}
                    </div>
                )
            }

            // Raw Vimeo URL Embed
            if (line.match(/^https?:\/\/(www\.)?(player\.)?vimeo\.com\/(video\/)?(\d+)/)) {
                return (
                    <div key={i} style={{ margin: 'var(--space-lg) 0', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-md)', position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                        <iframe
                            src={`${line.trim()}?api=1`}
                            title="Vimeo Video"
                            frameBorder="0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                            onLoad={(e) => {
                                // Add event listener for Vimeo player
                                try {
                                    const player = e.target;
                                    const onMessage = (event) => {
                                        if (!event.data) return;
                                        try {
                                            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                                            if (data.event === 'finish' || (data.event === 'ready' && player.contentWindow)) {
                                                if (data.event === 'ready') {
                                                    player.contentWindow.postMessage(JSON.stringify({ method: 'addEventListener', value: 'finish' }), '*');
                                                }
                                                if (data.event === 'finish') {
                                                    setCompletedVideoIndices(prev => new Set(prev).add(i));
                                                }
                                            }
                                        } catch (err) { }
                                    };
                                    window.addEventListener('message', onMessage);
                                } catch (e) {
                                    console.error("Error setting up Vimeo listener", e);
                                }
                            }}
                        />
                    </div>
                )
            }

            // PDF/File Link: [label](url)
            const linkMatch = line.match(/^\[(.*?)\]\((.*?\.pdf)\)$/i) || line.match(/^\[(📥 ดาวน์โหลด.*?)\]\((.*?)\)$/i)
            if (linkMatch) {
                const pdfUrl = linkMatch[2]
                return (
                    <div key={i} style={{ margin: 'var(--space-md) 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <SecurePdfViewer url={pdfUrl} />
                    </div>
                )
            }

            if (line.startsWith('## ')) return <h2 key={i}>{line.replace('## ', '')}</h2>
            if (line.startsWith('### ')) return <h3 key={i}>{line.replace('### ', '')}</h3>
            if (line.startsWith('> ')) return <blockquote key={i}>{line.replace('> ', '')}</blockquote>
            if (line.startsWith('- **')) {
                const parts = line.replace('- **', '').split('**')
                return <li key={i}><strong>{parts[0]}</strong>{parts.slice(1).join('')}</li>
            }
            if (line.startsWith('- ')) return <li key={i}>{line.replace('- ', '')}</li>
            if (line.match(/^\d+\. /)) return <li key={i}>{line.replace(/^\d+\. /, '')}</li>
            if (line.startsWith('| ')) {
                return <p key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{line}</p>
            }
            if (line.trim() === '') return <br key={i} />
            
            // Inline links for everything else
            const inlineLinkMatch = line.match(/^(.*?)\[(.*?)\]\((.*?)\)(.*)$/)
            if (inlineLinkMatch) {
                return (
                    <p key={i}>
                        {inlineLinkMatch[1]}
                        <a href={inlineLinkMatch[3]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                            {inlineLinkMatch[2]}
                        </a>
                        {inlineLinkMatch[4]}
                    </p>
                )
            }

            return <p key={i}>{line}</p>
        })
    }

    return (
        <div className="animate-fade-in">
            <button className="btn btn-ghost" onClick={() => navigate(`/courses/${lesson.courseId}`)} style={{ marginBottom: 'var(--space-lg)' }}>
                <ArrowLeft size={18} /> กลับไปหน้าคอร์ส
            </button>

            <div className="glass-card glass-card--static" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="flex items-center gap-md" style={{ marginBottom: 'var(--space-sm)' }}>
                    <BookOpen size={20} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        บทที่ {lesson.order} จาก {allLessons.length}
                    </span>
                    {isCompleted && (
                        <span className="badge badge-success">
                            <CheckCircle size={12} /> เรียนแล้ว
                        </span>
                    )}
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{lesson.title}</h1>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem' }}>
                    <span>👨‍🏫 ผู้สร้าง: {lesson.instructor || 'ทีมวิชาการ'}</span>
                    <span>•</span>
                    <span>📅 อัปเดตล่าสุด: {lesson.updatedAt || lesson.createdAt ? new Date(lesson.updatedAt || lesson.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</span>
                </div>
            </div>

            {/* Lesson Content */}
            <div className="glass-card glass-card--static lesson-content" style={{ marginBottom: 'var(--space-lg)' }}>
                {renderContent(lesson.content)}
            </div>

            {/* Actions */}
            {!isCompleted ? (
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
                    <button 
                        className={`btn btn-lg ${isAllVideosCompleted ? 'btn-success' : 'btn-secondary'}`} 
                        onClick={markComplete}
                        disabled={!isAllVideosCompleted}
                        style={{ opacity: isAllVideosCompleted ? 1 : 0.6, cursor: isAllVideosCompleted ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
                    >
                        <CheckCircle size={20} /> 
                        {isAllVideosCompleted ? 'เสร็จสิ้นบทเรียนนี้' : 'ดูวีดีโอให้จบเพื่อผ่านบทเรียน'}
                    </button>
                </div>
            ) : (
                <div className="glass-card glass-card--static" style={{ marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>คุณคิดอย่างไรกับบทเรียนนี้?</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                        คะแนนและคำแนะนำของคุณจะช่วยให้เราพัฒนาเนื้อหาให้ดียิ่งขึ้น
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: 'var(--space-md)' }}>
                        {[1, 2, 3, 4, 5].map(star => (
                            <button
                                key={star}
                                className="btn-icon"
                                style={{ padding: '0.5rem' }}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRating(star)}
                            >
                                <Star 
                                    size={32} 
                                    fill={(hoverRating || rating) >= star ? '#f59e0b' : 'transparent'} 
                                    color={(hoverRating || rating) >= star ? '#f59e0b' : '#cbd5e1'} 
                                    style={{ transition: 'all 0.2s' }}
                                />
                            </button>
                        ))}
                    </div>
                    
                    <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'left' }}>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <MessageSquare size={16} /> เสนอแนะเพิ่มเติม (ไม่บังคับ)
                            </label>
                            <textarea
                                className="form-control"
                                rows="3"
                                placeholder="พิมพ์ข้อความของคุณที่นี่..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                        </div>
                        <button 
                            className="btn btn-primary" 
                            style={{ width: '100%', marginTop: 'var(--space-md)' }}
                            disabled={rating === 0 || submittingRating || (existingRating && existingRating.rating === rating && (existingRating.comment || '') === comment)}
                            onClick={submitRating}
                        >
                            {submittingRating ? 'กำลังส่ง...' : existingRating ? 'อัปเดตคำติชม' : 'ส่งคำติชม'}
                        </button>
                    </div>
                    {existingRating && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--accent-success)', marginTop: 'var(--space-sm)' }}>
                            <CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}/> ขอบคุณสำหรับคะแนนประเมินของคุณ
                        </p>
                    )}
                </div>
            )}

            {/* Quiz Warning - Shows regardless of whether the lesson itself is marked completed */}
            {lessonQuizzes.length > 0 && !passedQuizzes && (
                <div className="glass-card glass-card--static" style={{ marginBottom: 'var(--space-lg)', textAlign: 'center', borderColor: 'var(--accent-warning)', background: 'rgba(245, 158, 11, 0.05)' }}>
                    <h3 style={{ color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        ⚠️ กรุณาทำแบบทดสอบประจำบท
                    </h3>
                    <p style={{ margin: 'var(--space-sm) 0', color: 'var(--text-secondary)' }}>
                        คุณมีแบบทดสอบที่ต้องทำให้ผ่านก่อน จึงจะสามารถไปยังบทเรียนถัดไปได้
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
                        {lessonQuizzes.map(quiz => (
                            <button key={quiz.id} className="btn btn-primary" onClick={() => navigate(`/quiz/${quiz.id}`)}>
                                เริ่มทำ: {quiz.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="lesson-nav">
                {prevLesson ? (
                    <button className="btn btn-secondary" onClick={() => navigate(`/lessons/${prevLesson.id}`)}>
                        <ArrowLeft size={16} /> {prevLesson.title}
                    </button>
                ) : <div />}
                {nextLesson ? (
                    <button 
                        className={`btn ${passedQuizzes ? 'btn-primary' : 'btn-secondary'}`} 
                        onClick={() => navigate(`/lessons/${nextLesson.id}`)}
                        disabled={!passedQuizzes}
                        title={!passedQuizzes ? "กรุณาทำแบบทดสอบประจำบทให้ผ่านก่อน" : ""}
                    >
                        {nextLesson.title} <ArrowRight size={16} />
                    </button>
                ) : (
                    <button className="btn btn-primary" onClick={() => navigate(`/courses/${lesson.courseId}`)}>
                        กลับหน้าคอร์ส <ArrowRight size={16} />
                    </button>
                )}
            </div>
        </div>
    )
}

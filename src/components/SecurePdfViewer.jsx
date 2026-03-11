import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker path to use local pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function SecurePdfViewer({ url }) {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setPageNumber(1);
    }

    // Prevent Context Menu (Right-Click) to deter Saving/Copying
    const handleContextMenu = (e) => {
        e.preventDefault();
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            width: '100%'
        }}>
            {/* Toolbar Area */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                backgroundColor: 'var(--bg-secondary)',
                padding: 'var(--space-sm) var(--space-md)',
                borderBottom: '1px solid var(--border-color)',
                userSelect: 'none'
            }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                        className="btn btn-ghost btn-icon"
                        disabled={pageNumber <= 1}
                        onClick={() => setPageNumber(p => p - 1)}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        หน้า {pageNumber} จาก {numPages || '-'}
                    </span>
                    <button
                        className="btn btn-ghost btn-icon"
                        disabled={pageNumber >= numPages}
                        onClick={() => setPageNumber(p => p + 1)}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-ghost btn-icon" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
                        <ZoomOut size={18} />
                    </button>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                        {Math.round(scale * 100)}%
                    </span>
                    <button className="btn btn-ghost btn-icon" onClick={() => setScale(s => Math.min(2.5, s + 0.2))}>
                        <ZoomIn size={18} />
                    </button>
                </div>
            </div>

            {/* Document Viewer Area */}
            <div 
                onContextMenu={handleContextMenu}
                style={{
                    padding: 'var(--space-md)',
                    overflow: 'auto',
                    maxHeight: '650px',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    userSelect: 'none',   /* Disable Text Selection */
                    pointerEvents: 'none' /* Disable Click drag selection interactions entirely over the canvas */
                }}
            >
                {/* Pointer events set back to 'auto' for the document container, 
                    but the TextLayer will be disabled via CSS override locally or disabled globally */}
                <div style={{ pointerEvents: 'auto' }}> 
                    <Document
                        file={url}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={
                            <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                                <Loader size={20} className="animate-spin" /> กำลังโหลดเอกสาร...
                            </div>
                        }
                        error={
                            <div style={{ padding: '2rem', color: 'var(--accent-danger)' }}>
                                ขออภัย ไม่สามารถโหลดไฟล์ PDF นี้ได้
                            </div>
                        }
                    >
                        <Page 
                            pageNumber={pageNumber} 
                            scale={scale} 
                            renderTextLayer={false} /* Disabled to prevent text selection */
                            renderAnnotationLayer={false} /* Disabled to prevent clicking links / objects */
                            loading={
                                <div style={{ minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <Loader size={24} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                                </div>
                            }
                        />
                    </Document>
                </div>
            </div>
            {/* Security Warning */}
            <div style={{ width: '100%', backgroundColor: 'var(--accent-warning)', padding: '4px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                * เอกสารนี้เป็นความลับ ไม่อนุญาตให้ดาวน์โหลดหรือคัดลอก *
            </div>
        </div>
    );
}

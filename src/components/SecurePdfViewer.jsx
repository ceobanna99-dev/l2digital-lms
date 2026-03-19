import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Loader } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker path to use local pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function SecurePdfViewer({ url }) {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [containerWidth, setContainerWidth] = useState(null);
    const [isAutoScaled, setIsAutoScaled] = useState(true);
    const containerRef = useRef(null);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setPageNumber(1);
    }

    // Effect to handle container width for auto-scaling
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                // Subtract padding (var(--space-md) is usually 1.25rem or 20px, so 40px total for left+right)
                const width = containerRef.current.offsetWidth - 40;
                setContainerWidth(width);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        
        // Also observe for container resize specifically (useful if sidebars toggle)
        const resizeObserver = new ResizeObserver(updateWidth);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            window.removeEventListener('resize', updateWidth);
            resizeObserver.disconnect();
        };
    }, []);

    const handleZoomIn = () => {
        setIsAutoScaled(false);
        setScale(s => Math.min(2.5, s + 0.2));
    };

    const handleZoomOut = () => {
        setIsAutoScaled(false);
        setScale(s => Math.max(0.5, s - 0.2));
    };

    const handleToggleAutoZoom = () => {
        setIsAutoScaled(prev => !prev);
        if (!isAutoScaled) setScale(1.0); // Reset scale when enabling auto
    };

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

                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <button 
                        className={`btn btn-icon ${isAutoScaled ? 'btn-primary' : 'btn-ghost'}`} 
                        onClick={handleToggleAutoZoom}
                        title="พอดีกับความกว้างหน้าจอ"
                        style={{ padding: '4px', height: '32px', width: '32px' }}
                    >
                        <Maximize size={16} />
                    </button>
                    
                    <div style={{ width: '4px' }} />

                    <button className="btn btn-ghost btn-icon" onClick={handleZoomOut}>
                        <ZoomOut size={18} />
                    </button>
                    <span style={{ 
                        fontSize: '0.85rem', 
                        color: 'var(--text-secondary)', 
                        minWidth: '45px', 
                        textAlign: 'center',
                        fontWeight: isAutoScaled ? '600' : 'normal'
                    }}>
                        {isAutoScaled ? 'พอดี' : `${Math.round(scale * 100)}%`}
                    </span>
                    <button className="btn btn-ghost btn-icon" onClick={handleZoomIn}>
                        <ZoomIn size={18} />
                    </button>
                </div>
            </div>

            {/* Document Viewer Area */}
            <div 
                ref={containerRef}
                onContextMenu={handleContextMenu}
                style={{
                    padding: 'var(--space-md)',
                    overflow: 'auto',
                    minHeight: '400px',
                    maxHeight: '75vh', // Responsive height based on viewport
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    userSelect: 'none',
                    pointerEvents: 'none'
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
                            scale={isAutoScaled ? undefined : scale}
                            width={isAutoScaled ? containerWidth : undefined}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
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

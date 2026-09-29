'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import 'react-quill-new/dist/quill.snow.css';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false }) as any;

// ── Paper size definitions (portrait, in inches) ──────────────────────────
export type PaperSize = 'letter' | 'legal' | 'a4';

const PAPER_SIZES: Record<PaperSize, { label: string; width: number; height: number }> = {
  letter: { label: 'Letter (8.5" × 11")', width: 8.5, height: 11 },
  legal: { label: 'Legal (8.5" × 14")', width: 8.5, height: 14 },
  a4: { label: 'A4 (8.27" × 11.69")', width: 8.27, height: 11.69 },
};

// Map paper size → max-width in px for editor preview (96 DPI baseline, capped for readability)
const PAPER_MAX_WIDTH: Record<PaperSize, number> = {
  letter: 816, // 8.5 * 96
  legal: 816, // same width as letter
  a4: 794, // 8.27 * 96
};

interface ReportEditorProps {
  sessionId: string;
  onExport?: (format: 'pdf' | 'docx') => void;
  onTitleChange?: (title: string) => void;
}

// ── Quill toolbar with undo/redo + expanded size options ──────────────────
const FONT_SIZES = ['8pt', '10pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '36pt'];

// Clean global module config using Quill's native container arrays
const modules = {
  toolbar: {
    container: [
      // Group 1: History Controls
      ['undo', 'redo'],
      // Group 2: Typography & Sizes
      [{ header: [1, 2, 3, false] }, { size: FONT_SIZES }],
      // Group 3: Basic Formatting
      ['bold', 'italic', 'underline', 'strike'],
      // Group 4: Text Colors & Alignment
      [{ align: [] }, { color: [] }, { background: [] }],
      // Group 5: Lists
      [{ list: 'ordered' }, { list: 'bullet' }],
      // Group 6: Inserts & Clean
      ['link', 'image', 'clean'],
    ],
    handlers: {
      undo: function (this: { quill: any }) {
        this.quill.history.undo();
      },
      redo: function (this: { quill: any }) {
        this.quill.history.redo();
      },
    },
  },
  history: {
    delay: 1000,
    maxStack: 100,
    userOnly: true,
  },
};

// Minimal toolbar module for rich headers/footers
const hfModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    ['image', 'link', 'clean']
  ],
};

const formats = [
  'header', 'font', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'align',
  'list', 'indent',
  'blockquote', 'code-block',
  'link', 'image',
];

// ── Register custom size whitelist on client ──────────────────────────────
let sizeRegistered = false;
function registerQuillSizes() {
  if (sizeRegistered || typeof window === 'undefined') return;
  try {
    // eslint-disable-next-line
    const Quill = require('react-quill-new').Quill || (window as any).Quill;
    if (Quill) {
      const Size = Quill.import('attributors/style/size');
      Size.whitelist = FONT_SIZES;
      Quill.register(Size, true);
      sizeRegistered = true;
    }
  } catch {
    // Quill not available yet — will retry on mount
  }
}

// Immediately register custom sizes if running in browser and not yet registered
if (typeof window !== 'undefined' && !sizeRegistered) {
  registerQuillSizes();
}

export const ReportEditor: React.FC<ReportEditorProps> = ({ sessionId, onExport, onTitleChange }) => {
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const quillRef = useRef<any>(null);

  // Paper size
  const [paperSize, setPaperSize] = useState<PaperSize>('letter');

  // Header / Footer rich text HTML
  const [header, setHeader] = useState<string>('');
  const [footer, setFooter] = useState<string>('');
  const [showHeaderFooter, setShowHeaderFooter] = useState(false);

  // Ensure Quill sizes are registered before first render
  useEffect(() => {
    registerQuillSizes();
  }, []);

  // Load saved data on mount or when sessionId changes
  useEffect(() => {
    setMounted(true);
    registerQuillSizes();

    // Content
    const savedContent = sessionStorage.getItem(sessionId) ?? localStorage.getItem(sessionId);
    setContent(savedContent ?? '');

    // Title
    const savedTitle = sessionStorage.getItem(`${sessionId}_title`) ?? localStorage.getItem(`${sessionId}_title`);
    setTitle(savedTitle ?? 'Untitled BDRRMC Report');

    // Paper size
    const savedPaper = (sessionStorage.getItem(`${sessionId}_paperSize`) ?? localStorage.getItem(`${sessionId}_paperSize`)) as PaperSize | null;
    if (savedPaper && PAPER_SIZES[savedPaper]) {
      setPaperSize(savedPaper);
    } else {
      setPaperSize('letter');
    }

    // Header / Footer loading & migration
    try {
      const savedHeader = sessionStorage.getItem(`${sessionId}_header`) ?? localStorage.getItem(`${sessionId}_header`);
      const savedFooter = sessionStorage.getItem(`${sessionId}_footer`) ?? localStorage.getItem(`${sessionId}_footer`);

      const parseHF = (val: string | null) => {
        if (!val) return '';
        if (val.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(val);
            return `<div style="display:flex; justify-content:space-between;"><span>${parsed.left || ''}</span><span>${parsed.center || ''}</span><span>${parsed.right || ''}</span></div>`;
          } catch {
            return val;
          }
        }
        return val;
      };

      setHeader(parseHF(savedHeader));
      setFooter(parseHF(savedFooter));
    } catch {
      setHeader('');
      setFooter('');
    }

    // Auto-expand header/footer section if data exists
    const hRaw = sessionStorage.getItem(`${sessionId}_header`) ?? localStorage.getItem(`${sessionId}_header`);
    const fRaw = sessionStorage.getItem(`${sessionId}_footer`) ?? localStorage.getItem(`${sessionId}_footer`);
    if (hRaw || fRaw) {
      if (hRaw && hRaw.length > 7 || fRaw && fRaw.length > 7) {
        setShowHeaderFooter(true);
      }
    }

    setSaveStatus('saved');

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [sessionId]);

  // Set default font size on first load to avoid "Normal" label
  useEffect(() => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      editor.format('size', FONT_SIZES[0]);
    }
  }, [mounted]);

  // ── Persist helpers ───────────────────────────────────────────────────
  const persistBoth = (key: string, value: string) => {
    sessionStorage.setItem(key, value);
    localStorage.setItem(key, value);
  };

  const triggerSaveIndicator = () => {
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveStatus('saved'), 600);
  };

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    persistBoth(`${sessionId}_title`, newTitle);
    persistBoth(`${sessionId}_timestamp`, Date.now().toString());
    triggerSaveIndicator();
    onTitleChange?.(newTitle);
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    persistBoth(sessionId, value);
    persistBoth(`${sessionId}_timestamp`, Date.now().toString());
    triggerSaveIndicator();
  };

  const handlePaperSizeChange = (size: PaperSize) => {
    setPaperSize(size);
    persistBoth(`${sessionId}_paperSize`, size);
    triggerSaveIndicator();
  };

  const handleHeaderChange = (value: string) => {
    setHeader(value);
    persistBoth(`${sessionId}_header`, value);
    persistBoth(`${sessionId}_timestamp`, Date.now().toString());
    triggerSaveIndicator();
  };

  const handleFooterChange = (value: string) => {
    setFooter(value);
    persistBoth(`${sessionId}_footer`, value);
    persistBoth(`${sessionId}_timestamp`, Date.now().toString());
    triggerSaveIndicator();
  };

  // ── Editor max-width from paper size ──────────────────────────────────
  const editorMaxWidth = PAPER_MAX_WIDTH[paperSize];

  if (!mounted) {
    return (
      <div className="h-[70vh] rounded border p-4 flex items-center justify-center text-gray-400">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Top Controls: Title + Paper Size + Header/Footer Toggle ── */}
      <div className="flex flex-col gap-3">
        {/* Row: label + controls */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-[color:var(--portal-ink-600)]">
            Report Title / Pamagat ng Ulat
          </label>

          {/* Seamless Dashboard Controls */}
          <div className="flex items-center gap-2.5 text-xs flex-wrap">
            {/* Autosave Status */}
            <div className="flex items-center gap-1.5 mr-2">
              {saveStatus === 'saving' ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
                  <span className="italic text-amber-600 font-medium">Saving...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  <span className="text-emerald-600 font-medium">✓ Auto-saved</span>
                </>
              ) : null}
            </div>

            {/* Paper Size dropdown */}
            <div className="text-xs font-semibold px-2.5 py-1 rounded border flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs bg-white border-gray-200 text-gray-600 hover:bg-gray-50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">Paper:</span>
              <select
                value={paperSize}
                onChange={(e) => handlePaperSizeChange(e.target.value as PaperSize)}
                className="text-xs font-semibold bg-transparent border-none text-gray-700 cursor-pointer focus:outline-none focus:ring-0 p-0"
              >
                {Object.entries(PAPER_SIZES).map(([key, { label }]) => (
                  <option key={key} value={key}>{key.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Header/Footer Toggle Button */}
            <button
              type="button"
              onClick={() => setShowHeaderFooter((v) => !v)}
              className={`text-xs font-semibold px-2.5 py-1 rounded border flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${showHeaderFooter
                ? 'bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
            >
              {showHeaderFooter ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Header & Footer
            </button>
          </div>
        </div>

        {/* Title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Enter report title..."
          className="w-full px-4 py-2.5 rounded-lg border border-[color:var(--portal-border-soft)] bg-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[color:var(--portal-accent-strong)] focus:border-transparent transition-all"
        />
      </div>

      {/* ── Document Page Workspace (Sleek Drafting Table layout) ── */}
      <div className="bg-gray-100/60 border border-[color:var(--portal-border-soft)] rounded-lg p-8 flex justify-center shadow-inner">
        <div
          className="bg-white shadow-xl border border-gray-200 p-10 flex flex-col gap-6 transition-all duration-300 w-full animate-fade-in"
          style={{ maxWidth: editorMaxWidth, minHeight: '80vh' }}
        >
          {/* ── Rich Header Section ── */}
          {showHeaderFooter ? (
            <div className="border border-dashed border-blue-400 bg-blue-50/10 rounded-lg p-2.5 space-y-1.5 transition-all duration-300">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Header Area / Pamagat ng Pahina
                </span>
                <span className="text-[9px] text-gray-400 italic">
                  Tip: Copy-paste/drag logos or insert pictures here.
                </span>
              </div>
              <ReactQuill
                theme="snow"
                value={header}
                onChange={handleHeaderChange}
                modules={hfModules}
                placeholder="Type header text or insert a logo picture..."
              />
            </div>
          ) : (
            header && (
              <div
                className="px-4 py-2 border-b border-gray-200/60 text-xs text-gray-500 ql-editor ql-snow-preview animate-fade-in"
                dangerouslySetInnerHTML={{ __html: header }}
              />
            )
          )}

          {/* ── Seamless Main Quill Editor ── */}
          <div className="flex-1 flex flex-col">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={handleContentChange}
              modules={modules}
              formats={formats}
              placeholder="Start drafting BDRRMC report..."
              style={{ flex: 1 }}
            />
          </div>

          {/* ── Rich Footer Section ── */}
          {showHeaderFooter ? (
            <div className="border border-dashed border-blue-400 bg-blue-50/10 rounded-lg p-2.5 space-y-1.5 transition-all duration-300 mt-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Footer Area / Paanan ng Pahina
                </span>
                <span className="text-[9px] text-gray-400 italic">
                  Use center or right alignment for page info/signature marks.
                </span>
              </div>
              <ReactQuill
                theme="snow"
                value={footer}
                onChange={handleFooterChange}
                modules={hfModules}
                placeholder="Type footer text or insert signature stamp..."
              />
            </div>
          ) : (
            footer && (
              <div
                className="px-4 py-2 border-t border-gray-200/60 text-xs text-gray-500 ql-editor ql-snow-preview animate-fade-in"
                dangerouslySetInnerHTML={{ __html: footer }}
              />
            )
          )}
        </div>
      </div>

      {/* ── Export Options Section ── */}
      {onExport && (
        <div className="mt-4 p-4 rounded-xl border border-[color:var(--portal-border-soft)] bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-[color:var(--portal-ink-900)]">
              Export Report
            </h4>
            <p className="text-xs text-[color:var(--portal-ink-600)]">
              Download this document to your device in PDF or Microsoft Word (.docx) format.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="residentOutline"
              size="sm"
              onClick={() => onExport('pdf')}
              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 flex items-center gap-2 font-medium"
            >
              <FileDown size={14} /> Export to PDF
            </Button>
            <Button
              variant="residentOutline"
              size="sm"
              onClick={() => onExport('docx')}
              className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 flex items-center gap-2 font-medium"
            >
              <FileText size={14} /> Export to Word (.docx)
            </Button>
          </div>
        </div>
      )}

      {/* ── Custom styles for Quill toolbar ── */}
      <style jsx global>{`
        /* Custom toolbar modular layout styling */
        .ql-toolbar.ql-snow {
          border-top-left-radius: 8px !important;
          border-top-right-radius: 8px !important;
          background-color: #f3f4f6 !important;
          border-color: var(--portal-border-soft, #e5e7eb) !important;
          border-bottom: none !important;
          padding: 8px 10px !important;
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 6px !important;
        }

        .ql-toolbar.ql-snow .ql-formats {
          background-color: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          padding: 2px 4px !important;
          margin-right: 2px !important;
          margin-bottom: 2px !important;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04) !important;
          display: inline-flex !important;
          align-items: center !important;
        }

        .ql-toolbar.ql-snow button {
          height: 28px !important;
          width: 28px !important;
          padding: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: none !important;
          color: #4b5563 !important;
          background: transparent !important;
          border-radius: 4px !important;
          transition: background-color 0.1s, color 0.1s !important;
        }

        .ql-toolbar.ql-snow .ql-picker-label {
          /* keep default styling for pickers */
        }

        .ql-toolbar.ql-snow .ql-picker {
          height: 28px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: none !important;
        }

        /* Header + Size picker sizing */
.ql-toolbar.ql-snow .ql-picker.ql-header,
.ql-toolbar.ql-snow .ql-picker.ql-size {
  width: unset !important;
}

.ql-toolbar.ql-snow .ql-picker.ql-header .ql-picker-label,
.ql-toolbar.ql-snow .ql-picker.ql-size .ql-picker-label {
  padding: 0 22px 0 8px !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  display: flex !important;
  align-items: center !important;
  min-width: 72px;
}

/* REMOVE QUILL DEFAULT NORMAL LABELS */
.ql-snow .ql-picker.ql-size .ql-picker-item::before,
.ql-snow .ql-picker.ql-size .ql-picker-label::before {
  content: attr(data-value) !important;
}

/* DEFAULT LABEL */
.ql-snow .ql-picker.ql-size .ql-picker-label:not([data-value])::before {
  content: "16pt" !important;
}

        .ql-toolbar.ql-snow button:hover,
        .ql-toolbar.ql-snow .ql-picker-label:hover {
          background-color: #f3f4f6 !important;
          color: #111827 !important;
        }

        .ql-toolbar.ql-snow .ql-active,
        .ql-toolbar.ql-snow .ql-picker-label.ql-active {
          background-color: #e2e8f0 !important;
          color: #059669 !important;
        }

        /* Standardize Quill Toolbar SVGs */
        .ql-toolbar.ql-snow svg {
          height: 14px !important;
          width: 14px !important;
          stroke-width: 2.2 !important;
        }
        .ql-toolbar.ql-snow svg .ql-stroke {
          stroke: currentColor !important;
        }
        .ql-toolbar.ql-snow svg .ql-fill {
          fill: currentColor !important;
        }

        /* Undo / Redo custom icon characters */
        .ql-toolbar.ql-snow button.ql-undo::after {
          content: '↩';
          font-size: 15px;
          line-height: 1;
        }
        .ql-toolbar.ql-snow button.ql-redo::after {
          content: '↪';
          font-size: 15px;
          line-height: 1;
        }
        
        /* Constrain the editor area within the paper-width container */
        .ql-container.ql-snow {
          border: none !important;
          font-size: 11pt !important;
          font-family: Arial, sans-serif !important;
          line-height: 1.6;
        }
        .ql-editor {
          padding: 0 !important;
          min-height: 50vh;
        }
        .ql-editor.ql-blank::before {
          left: 0 !important;
          font-style: italic;
          color: #9ca3af;
        }
        
        /* Read-only preview styling inside the page */
        .ql-snow-preview {
          padding: 6px 0 !important;
          min-height: unset !important;
          border: none !important;
          font-family: Arial, sans-serif !important;
          line-height: 1.4;
        }
        .ql-snow-preview p {
          margin: 0 !important;
        }
        .ql-snow-preview img {
          max-height: 54px;
          width: auto;
          display: inline-block;
          vertical-align: middle;
        }
        
        /* Mini header/footer editors inside the sheet */
        .border-dashed .ql-container.ql-snow {
          font-size: 9.5pt !important;
        }
        .border-dashed .ql-editor {
          min-height: 80px !important;
          padding: 6px !important;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          background: #fff;
        }
        .border-dashed .ql-toolbar.ql-snow {
          border: none !important;
          background: transparent !important;
          padding: 2px 0 6px 0 !important;
        }
      `}</style>
    </div>
  );
};

"use client";
import { useState, useEffect, useRef } from 'react';
import PortalShell from '@/components/portal-shell';
import { SectionCard, EmptyState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { ReportEditor } from '@/components/ReportEditor/ReportEditor';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { FileText, FolderPlus, Trash2 } from 'lucide-react';
// Short ID generator (6 alphanumeric characters)
const generateShortId = () => Math.random().toString(36).substring(2, 8);

const BDRRMC_OUTLINE = `
<h2>BARANGAY DISASTER RISK REDUCTION AND MANAGEMENT COMMITTEE (BDRRMC) REPORT</h2>
<p><strong>Barangay:</strong> [Insert Barangay Name]</p>
<p><strong>Period Covered:</strong> [Insert Date/Period]</p>
<hr />
<h3>I. EXECUTIVE SUMMARY</h3>
<p>Write a brief summary of the BDRRMC accomplishments, readiness status, and recent disaster response/preparedness initiatives during this period.</p>

<h3>II. BARANGAY DEMOGRAPHICS & HAZARD PROFILE</h3>
<ul>
  <li><strong>Total Population:</strong> [Insert Population]</li>
  <li><strong>High-Risk Areas (Hazards like Flood, Landslide, Fire):</strong> [List high-risk zones/areas]</li>
  <li><strong>Evacuation Center Capacity:</strong> [Insert capacity details and locations]</li>
</ul>

<h3>III. DRRM PLAN IMPLEMENTATION STATUS</h3>
<ol>
  <li><strong>Disaster Prevention & Mitigation:</strong> [e.g., clearing of waterways, building dikes, pruning trees]</li>
  <li><strong>Disaster Preparedness:</strong> [e.g., community drills, training, public information campaigns]</li>
  <li><strong>Disaster Response:</strong> [e.g., rescue operations, relief distribution, first-aid assistance]</li>
  <li><strong>Rehabilitation & Recovery:</strong> [e.g., repairing infrastructure, livelihood assistance]</li>
</ol>

<h3>IV. INVENTORY OF DISASTER RESPONSE EQUIPMENT</h3>
<ul>
  <li><strong>Communication Devices (Radios, Megaphones):</strong> [Specify count & status]</li>
  <li><strong>Emergency Vehicles (Ambulances, Rescue Boats):</strong> [Specify count & status]</li>
  <li><strong>First Aid & Medical Supplies:</strong> [Specify status/inventory]</li>
  <li><strong>Rescue Equipment (Chainsaws, Ropes, Helmets):</strong> [Specify count & status]</li>
</ul>

<h3>V. FINANCIAL STATUS & FUND UTILIZATION (5% BDRRMC Fund)</h3>
<p>Provide details of the budget allocation and actual spending for BDRRM activities.</p>

<h3>VI. RECOMMENDATIONS & NEXT STEPS</h3>
<p>Identify areas of improvement, requested assistance, and upcoming projects for disaster resiliency.</p>
`;

export default function StaffBDRRMCReportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { locale } = useAppState();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pastReports, setPastReports] = useState<Array<{ id: string; date: string; title: string }>>([]);

  // Load past report IDs and titles from localStorage on mount and when sessionId changes
  const loadReports = () => {
    // Exclude ALL metadata suffixes so only bare session IDs (e.g. "bdrrmc-abc123") are listed
    const META_SUFFIXES = ['_timestamp', '_title', '_paperSize', '_header', '_footer'];
    const keys = Object.keys(localStorage).filter(
      (k) => k.startsWith('bdrrmc-') && !META_SUFFIXES.some((s) => k.endsWith(s))
    );
    const reports = keys.map((k) => {
      const date = new Date(parseInt(localStorage.getItem(`${k}_timestamp`) || '0')).toLocaleString();
      const title = localStorage.getItem(`${k}_title`) || 'Untitled BDRRMC Report';
      return { id: k, date, title };
    });
    setPastReports(reports);
  };

  const deleteReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(locale === 'fil' ? 'Sigurado ka bang burahin ang ulat na ito?' : 'Are you sure you want to delete this report?')) return;
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(id));
    keys.forEach((k) => localStorage.removeItem(k));
    loadReports();
  };

  useEffect(() => {
    loadReports();
  }, [sessionId]);

  const startNewReport = () => {
    const newId = `bdrrmc-${generateShortId()}`;
    // Start with blank content (not pre-populated)
    localStorage.removeItem(`${newId}_timestamp`);
    localStorage.setItem(newId, '');
    localStorage.setItem(`${newId}_title`, locale === 'fil' ? 'Bagong Ulat ng BDRRMC' : 'New BDRRMC Report');
    localStorage.setItem(`${newId}_timestamp`, Date.now().toString());
    // Mirror to sessionStorage for current session components
    sessionStorage.setItem(newId, '');
    sessionStorage.setItem(`${newId}_title`, locale === 'fil' ? 'Bagong Ulat ng BDRRMC' : 'New BDRRMC Report');
    sessionStorage.setItem(`${newId}_timestamp`, Date.now().toString());
    setSessionId(newId);
  };

  const startExistingReport = () => {
    // Legacy function retained for compatibility; not used directly.
    const newId = `bdrrmc-${generateShortId()}`;
    // Store empty content for existing report placeholder
    localStorage.removeItem(`${newId}_timestamp`);
    localStorage.setItem(newId, '');
    localStorage.setItem(`${newId}_title`, locale === 'fil' ? 'Dating Ulat ng BDRRMC' : 'Existing BDRRMC Report');
    localStorage.setItem(`${newId}_timestamp`, Date.now().toString());
    // Mirror to sessionStorage
    sessionStorage.removeItem(`${newId}_timestamp`);
    sessionStorage.setItem(newId, '');
    sessionStorage.setItem(`${newId}_title`, locale === 'fil' ? 'Dating Ulat ng BDRRMC' : 'Existing BDRRMC Report');
    sessionStorage.setItem(`${newId}_timestamp`, Date.now().toString());
    setSessionId(newId);
  };

  const handleExistingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const newId = `bdrrmc-${generateShortId()}`;
      // Store in both storages
      localStorage.setItem(newId, content);
      localStorage.setItem(`${newId}_title`, locale === 'fil' ? 'Dating Ulat ng BDRRMC' : 'Existing BDRRMC Report');
      localStorage.setItem(`${newId}_timestamp`, Date.now().toString());
      sessionStorage.setItem(newId, content);
      sessionStorage.setItem(`${newId}_title`, locale === 'fil' ? 'Dating Ulat ng BDRRMC' : 'Existing BDRRMC Report');
      sessionStorage.setItem(`${newId}_timestamp`, Date.now().toString());
      setSessionId(newId);
    };
    reader.readAsText(file);
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!sessionId) return;
    // Prefer sessionStorage (current session) but fallback to localStorage for persisted data
    const html = sessionStorage.getItem(sessionId) || localStorage.getItem(sessionId) || '';
    const title = sessionStorage.getItem(`${sessionId}_title`) || localStorage.getItem(`${sessionId}_title`) || 'bdrrmc-report';
    if (!html) return;

    // Load paper size, header, footer
    const paperSize = (sessionStorage.getItem(`${sessionId}_paperSize`) || localStorage.getItem(`${sessionId}_paperSize`) || 'letter') as 'letter' | 'legal' | 'a4';

    const loadHF = (val: string | null) => {
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

    const header = loadHF(sessionStorage.getItem(`${sessionId}_header`) || localStorage.getItem(`${sessionId}_header`));
    const footer = loadHF(sessionStorage.getItem(`${sessionId}_footer`) || localStorage.getItem(`${sessionId}_footer`));

    const paperDimensions: Record<'letter' | 'legal' | 'a4', { width: number; height: number }> = {
      letter: { width: 8.5, height: 11 },
      legal:  { width: 8.5, height: 14 },
      a4:     { width: 8.27, height: 11.69 },
    };
    const dims = paperDimensions[paperSize] || paperDimensions.letter;

    if (format === 'pdf') {
      // Use html2pdf.js (installed) to directly download a PDF file
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default;
      // Create a temporary container with proper styling for the PDF
      const container = document.createElement('div');
      container.innerHTML = html;
      container.style.fontFamily = 'Arial, sans-serif';
      container.style.fontSize = '12pt';
      container.style.lineHeight = '1.6';
      container.style.color = '#000';
      container.style.padding = '10px';
      document.body.appendChild(container);

      // Offscreen container for header rendering (to capture rich text + images)
      const headerContainer = document.createElement('div');
      headerContainer.innerHTML = header;
      headerContainer.style.width = `${(dims.width - 1.2) * 96}px`;
      headerContainer.style.fontFamily = 'Arial, sans-serif';
      headerContainer.style.fontSize = '9.5pt';
      headerContainer.style.lineHeight = '1.4';
      headerContainer.style.color = '#4b5563';
      headerContainer.style.position = 'absolute';
      headerContainer.style.left = '-9999px';
      headerContainer.style.top = '0';
      headerContainer.style.background = '#fff';
      document.body.appendChild(headerContainer);

      // Offscreen container for footer rendering
      const footerContainer = document.createElement('div');
      footerContainer.innerHTML = footer;
      footerContainer.style.width = `${(dims.width - 1.2) * 96}px`;
      footerContainer.style.fontFamily = 'Arial, sans-serif';
      footerContainer.style.fontSize = '9.5pt';
      footerContainer.style.lineHeight = '1.4';
      footerContainer.style.color = '#4b5563';
      footerContainer.style.position = 'absolute';
      footerContainer.style.left = '-9999px';
      footerContainer.style.top = '0';
      footerContainer.style.background = '#fff';
      document.body.appendChild(footerContainer);

      // Import html2canvas dynamically
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;

      // Helper to check if a string is empty HTML
      const isHtmlEmpty = (val: string) => {
        if (!val) return true;
        const stripped = val.replace(/<[^>]+>/g, '').trim();
        return stripped === '' && !val.includes('<img');
      };

      // Generate canvas images for rich header & footer
      let headerImg: string | null = null;
      let headerAspect = 0;
      if (!isHtmlEmpty(header)) {
        const headerCanvas = await html2canvas(headerContainer, { scale: 2, useCORS: true, logging: false, backgroundColor: null });
        headerImg = headerCanvas.toDataURL('image/png');
        headerAspect = headerCanvas.height / headerCanvas.width;
      }

      let footerImg: string | null = null;
      let footerAspect = 0;
      if (!isHtmlEmpty(footer)) {
        const footerCanvas = await html2canvas(footerContainer, { scale: 2, useCORS: true, logging: false, backgroundColor: null });
        footerImg = footerCanvas.toDataURL('image/png');
        footerAspect = footerCanvas.height / footerCanvas.width;
      }

      const headerWidth = dims.width - 1.2;
      const headerHeight = headerWidth * headerAspect;

      const footerWidth = dims.width - 1.2;
      const footerHeight = footerWidth * footerAspect;

      const opt = {
        margin: 0.6,
        filename: `${title}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: paperSize, orientation: 'portrait' as const },
      };

      const worker = html2pdf().set(opt).from(container).toPdf() as any;
      const pdf = await worker.get('pdf');
      const totalPages = pdf.internal.getNumberOfPages();

      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);

        // Draw rich header if available
        if (headerImg) {
          pdf.addImage(headerImg, 'PNG', 0.6, 0.2, headerWidth, headerHeight);
          
          // Header boundary line
          pdf.setDrawColor(220, 220, 220);
          pdf.setLineWidth(0.01);
          pdf.line(0.6, 0.2 + headerHeight + 0.05, dims.width - 0.6, 0.2 + headerHeight + 0.05);
        }

        // Draw rich footer if available, otherwise print page numbering
        if (footerImg) {
          pdf.addImage(footerImg, 'PNG', 0.6, dims.height - 0.2 - footerHeight, footerWidth, footerHeight);

          // Footer boundary line
          pdf.setDrawColor(220, 220, 220);
          pdf.setLineWidth(0.01);
          pdf.line(0.6, dims.height - 0.2 - footerHeight - 0.05, dims.width - 0.6, dims.height - 0.2 - footerHeight - 0.05);
        } else {
          // Standard page numbering fallback
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.5);
          pdf.setTextColor(120, 120, 120);
          pdf.text(`Page ${i} of ${totalPages}`, dims.width - 0.6, dims.height - 0.35, { align: 'right' });

          // Boundary line
          pdf.setDrawColor(220, 220, 220);
          pdf.setLineWidth(0.01);
          pdf.line(0.6, dims.height - 0.45, dims.width - 0.6, dims.height - 0.45);
        }
      }

      await worker.save();
      document.body.removeChild(container);
      document.body.removeChild(headerContainer);
      document.body.removeChild(footerContainer);
    } else {
      // Export to Word using HTML Blob — Word can natively render HTML content
      const wordHtml = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; color: #000; }
    h1, h2, h3, h4 { margin-top: 1em; margin-bottom: 0.4em; }
    p { margin: 0.4em 0; }
    ul, ol { margin: 0.4em 0 0.4em 1.5em; }
    table { width: 100%; border-collapse: collapse; }
    td, th { border: 1px solid #ccc; padding: 6px 10px; }
    hr { margin: 1em 0; border: none; border-top: 1px solid #999; }
    
    /* Word specific styles for headers, footers and page sizes */
    @page Section1 {
      size: ${dims.width}in ${dims.height}in;
      margin: 1.0in 1.0in 1.0in 1.0in;
      mso-header-margin: 0.5in;
      mso-footer-margin: 0.5in;
      mso-header: h1;
      mso-footer: f1;
    }
    div.Section1 {
      page: Section1;
    }
    .ql-editor {
      font-family: Arial, sans-serif;
      font-size: 9.5pt;
      color: #4b5563;
    }
    .ql-editor img {
      max-height: 54px;
      width: auto;
      display: inline-block;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <div class="Section1">
    <!-- Header -->
    <div style="mso-element:header" id="h1">
      <div class="ql-editor">
        ${header}
      </div>
      <div style="border-bottom: 1px solid #e0e0e0; margin-top: 5px; font-size: 1px;">&nbsp;</div>
    </div>

    <!-- Main Content -->
    ${html}

    <!-- Footer -->
    <div style="mso-element:footer" id="f1">
      <div style="border-top: 1px solid #e0e0e0; margin-bottom: 5px; font-size: 1px;">&nbsp;</div>
      <div class="ql-editor">
        ${footer ? footer : '<table width="100%" style="border:none; margin:0; padding:0; font-size:9pt; font-family:Arial; color:#666;"><tr style="border:none;"><td align="right" style="border:none; padding:0;">Page <span style="mso-field-code: PAGE"></span> of <span style="mso-field-code: NUMPAGES"></span></td></tr></table>'}
      </div>
    </div>
  </div>
</body>
</html>`;
      const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${title}.doc`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  return (
    <PortalShell
      role="staff"
      title={{
        en: 'BDRRMC Report',
        fil: 'Ulat ng BDRRMC',
      }}
      description={{
        en: 'Manage and generate Barangay Disaster Risk Reduction and Management Committee reports and plans.',
        fil: 'Pamahalaan at gumawa ng mga ulat at plano ng Barangay Disaster Risk Reduction and Management Committee.',
      }}
      showHero={true}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-[color:var(--portal-ink-900)]">
          {sessionId ? (locale === 'fil' ? 'Kasalukuyang Report' : 'Current Report') : (locale === 'fil' ? 'Mga Ulat' : 'Reports')}
        </h2>
        <div className="flex gap-2">
          {sessionId && (
            <Button variant="residentOutline" onClick={() => setSessionId(null)}>
              {locale === 'fil' ? 'Bumalik sa Listahan' : 'Back to List'}
            </Button>
          )}
        </div>
      </div>

      {!sessionId && (
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <div className="p-5 rounded-2xl border border-[color:rgba(16,185,129,0.18)] bg-[color:rgba(240,253,244,0.3)] flex flex-col justify-between items-start gap-4 shadow-sm hover:border-[color:rgba(16,185,129,0.3)] transition-colors">
            <div className="space-y-1.5">
              <h3 className="text-emerald-800 font-bold flex items-center gap-2 text-base">
                <span className="p-1.5 rounded-lg bg-emerald-100/80 text-emerald-800">
                  <FileText size={18} />
                </span>
                {locale === 'fil' ? 'Gumawa ng Bagong Report' : 'Create New Report'}
              </h3>
              <p className="text-sm text-[color:var(--portal-ink-700)] leading-relaxed">
                {locale === 'fil'
                  ? 'Magsimula ng bagong ulat na may pre-populated na opisyal na BDRRMC outline template.'
                  : 'Start a new report pre-populated with the official BDRRMC outline template.'}
              </p>
            </div>
            <Button onClick={startNewReport} className="w-full sm:w-auto bg-[#06402B] hover:bg-[#0b5c3e] text-white font-semibold" variant="default">
              + {locale === 'fil' ? 'Gumawa ng Bago' : 'Create New'}
            </Button>
          </div>

          <div className="p-5 rounded-2xl border border-[color:rgba(16,185,129,0.18)] bg-[color:rgba(240,253,244,0.3)] flex flex-col justify-between items-start gap-4 shadow-sm hover:border-[color:rgba(16,185,129,0.3)] transition-colors">
            <div className="space-y-1.5">
              <h3 className="text-emerald-800 font-bold flex items-center gap-2 text-base">
                <span className="p-1.5 rounded-lg bg-emerald-100/80 text-emerald-800">
                  <FolderPlus size={18} />
                </span>
                {locale === 'fil' ? 'Itala ang Dating Ulat' : 'Record Existing Report'}
              </h3>
              <p className="text-sm text-[color:var(--portal-ink-700)] leading-relaxed">
                {locale === 'fil'
                  ? 'I-save o i-paste ang mga nakaraan o panlabas na ulat para sa inyong records.'
                  : 'Save or paste past, external, or existing reports for your records.'}
              </p>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleExistingUpload} className="hidden" accept=".html,.txt,.md" />
            <Button onClick={() => fileInputRef.current?.click()} variant="residentOutline" className="w-full sm:w-auto bg-[#06402B] hover:bg-[#0b5c3e] text-white font-semibold">
              {locale === 'fil' ? 'Itala ang Dating Ulat' : 'Record Existing Report'}
            </Button>
          </div>
        </div>
      )}

      {sessionId ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="residentOutline"
              onClick={() => setSessionId(null)}
              className="flex items-center gap-2 text-sm font-medium"
            >
              ← {locale === 'fil' ? 'Bumalik sa Listahan ng Ulat' : 'Back to Reports List'}
            </Button>
          </div>
          <SectionCard
            title={locale === 'fil' ? 'I-edit ang BDRRMC Report' : 'Edit BDRRMC Report'}
            description={sessionId}
          >
            <ReportEditor
              sessionId={sessionId}
              onExport={handleExport}
              onTitleChange={loadReports}
            />
          </SectionCard>
        </div>
      ) : (
        <SectionCard
          title={locale === 'fil' ? 'Nakaraang BDRRMC Papers' : 'Past BDRRMC Papers'}
          description={locale === 'fil' ? 'Listahan ng mga nagawang BDRRMC reports.' : 'List of generated BDRRMC reports.'}
        >
          {!pastReports.length ? (
            <EmptyState
              title={locale === 'fil' ? 'Walang nakitang ulat' : 'No reports found'}
              description={locale === 'fil' ? 'Gumawa ng bago gamit ang button sa itaas.' : 'Create a new one using the options above.'}
            />
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="grid gap-3 md:hidden">
                {pastReports.map((r) => (
                  <div key={r.id} className="rounded-xl border border-[color:var(--portal-border-soft)] bg-white p-4 shadow-sm flex flex-col gap-3">
                    <div>
                      <h4 className="font-semibold text-[color:var(--portal-ink-900)] text-base">{r.title}</h4>
                      <p className="text-xs text-[color:var(--portal-ink-500)] font-mono mt-0.5">{r.id}</p>
                      <p className="text-xs text-[color:var(--portal-ink-600)] mt-1.5">
                        <span className="font-medium">{locale === 'fil' ? 'Huling inedit:' : 'Last edited:'}</span> {r.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-[color:var(--portal-border-soft)]">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 justify-center"
                        onClick={() => setSessionId(r.id)}
                      >
                        {locale === 'fil' ? 'I-edit ang Ulat' : 'Edit Report'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3"
                        onClick={(e) => deleteReport(r.id, e)}
                        aria-label={locale === 'fil' ? 'Burahin ang ulat' : 'Delete report'}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--portal-border-soft)]">
                      <th className="px-4 py-3 text-left font-semibold text-[color:var(--portal-ink-900)]">
                        {locale === 'fil' ? 'Pamagat' : 'Title'}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[color:var(--portal-ink-900)]">
                        {locale === 'fil' ? 'Huling Inedit' : 'Last Edited'}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[color:var(--portal-ink-900)] w-36">
                        {locale === 'fil' ? 'Aksyon' : 'Action'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastReports.map((r) => (
                      <tr key={r.id} className="border-b border-[color:var(--portal-border-soft)]">
                        <td className="px-4 py-3 text-[color:var(--portal-ink-900)]">
                          <div className="font-semibold">{r.title}</div>
                          <div className="text-[10px] text-[color:var(--portal-ink-500)] font-mono">{r.id}</div>
                        </td>
                        <td className="px-4 py-3 text-[color:var(--portal-ink-700)] text-xs">
                          {r.date}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSessionId(r.id)}
                            >
                              {locale === 'fil' ? 'I-edit' : 'Edit'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => deleteReport(r.id, e)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>
      )}
    </PortalShell>
  );
}

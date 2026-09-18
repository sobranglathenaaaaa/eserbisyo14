'use client';

import { useMemo, useState } from 'react';
import { Download, FileDown, RotateCcw } from 'lucide-react';
import { PageGuide, SectionCard, StatusBadge } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  getAdminApprovalDeclineRows,
  getAdminFeedbackReportRows,
  getAdminGenerationActivityRows,
  getAdminIncidentRows,
  getAdminRequestReportRows,
} from '@/features/admin/model/selectors';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import PortalShell from '../../../components/portal-shell';
import { downloadCsv, exportCsv } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';

type ReportRow = Record<string, string | number | boolean | undefined>;

interface DownloadableReport {
  id: string;
  title: string;
  description: string;
  filename: string;
  dateField: string;
  rows: ReportRow[];
}

function getRowDate(row: ReportRow, dateField: string) {
  const value = row[dateField];
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateLabel(value: string) {
  if (!value) return 'Any date';
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function formatColumnLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusTone(value: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const normalized = value.toLowerCase();
  if (['approved', 'verified', 'resolved', 'completed', 'issued'].some((status) => normalized.includes(status))) return 'success';
  if (['declined', 'rejected', 'cancelled', 'deleted', 'failed'].some((status) => normalized.includes(status))) return 'danger';
  if (['pending', 'processing', 'submitted', 'under_review'].some((status) => normalized.includes(status))) return 'warning';
  return 'neutral';
}

function isWithinDateRange(row: ReportRow, dateField: string, startDate: string, endDate: string) {
  const date = getRowDate(row, dateField);
  if (!date) return true;

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    if (date < start) return false;
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59`);
    if (date > end) return false;
  }

  return true;
}

function escapeHtml(value: unknown) {
  return `${value ?? ''}`
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function downloadText(filename: string, text: string, type: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildPrintableReport(report: DownloadableReport, rows: ReportRow[], startDate: string, endDate: string) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const generatedAt = new Date().toLocaleString();
  const dateRange =
    startDate || endDate ? `${formatDateLabel(startDate)} to ${formatDateLabel(endDate)}` : 'All available records';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #16291f; }
    header { border-bottom: 2px solid #1b6145; margin-bottom: 20px; padding-bottom: 14px; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    p { margin: 4px 0; color: #3c5749; }
    table { border-collapse: collapse; width: 100%; margin-top: 18px; font-size: 12px; }
    th, td { border: 1px solid #cbd8d0; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #eaf4ef; color: #163b2b; }
    .meta { display: grid; gap: 4px; margin-top: 12px; }
    .empty { border: 1px dashed #9ab3a6; padding: 20px; margin-top: 18px; text-align: center; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(report.title)}</h1>
    <p>${escapeHtml(report.description)}</p>
    <div class="meta">
      <p><strong>Generated:</strong> ${escapeHtml(generatedAt)}</p>
      <p><strong>Date range:</strong> ${escapeHtml(dateRange)}</p>
      <p><strong>Total records:</strong> ${rows.length}</p>
    </div>
  </header>
  ${
    rows.length
      ? `<table>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(formatColumnLabel(header))}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows
              .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`)
              .join('')}
          </tbody>
        </table>`
      : '<div class="empty">No records match the selected date range.</div>'
  }
</body>
</html>`;
}

export default function AdminReportsPage() {
  const { state, locale } = useAppState();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const pageCopy = getRolePageCopy('admin/reports');

  const requestRows = getAdminRequestReportRows(state);
  const approvalRows = getAdminApprovalDeclineRows(state);
  const feedbackRows = getAdminFeedbackReportRows(state);
  const incidentRows = getAdminIncidentRows(state);
  const generationRows = getAdminGenerationActivityRows(state);

  const reports = useMemo<DownloadableReport[]>(
    () => [
      {
        id: 'request-actions',
        title: locale === 'fil' ? 'Request Actions' : 'Request Actions',
        description:
          locale === 'fil'
            ? 'Document request status, amount, resident, and latest action date.'
            : 'Document request status, amount, resident, and latest action date.',
        filename: 'request-actions',
        dateField: 'updatedAt',
        rows: requestRows,
      },
      {
        id: 'approval-decline-history',
        title: locale === 'fil' ? 'Approval/Decline History' : 'Approval/Decline History',
        description:
          locale === 'fil'
            ? 'Approved, declined, and cancelled document request decisions with reasons.'
            : 'Approved, declined, and cancelled document request decisions with reasons.',
        filename: 'approval-decline-history',
        dateField: 'updatedAt',
        rows: approvalRows,
      },
      {
        id: 'feedback-trends',
        title: locale === 'fil' ? 'Feedback Trends' : 'Feedback Trends',
        description:
          locale === 'fil'
            ? 'Resident feedback ratings and comments for completed services.'
            : 'Resident feedback ratings and comments for completed services.',
        filename: 'feedback-trends',
        dateField: 'createdAt',
        rows: feedbackRows,
      },
      {
        id: 'incident-summary',
        title: locale === 'fil' ? 'Incident Summary' : 'Incident Summary',
        description:
          locale === 'fil'
            ? 'Resident incident reports with status, location, and incident date.'
            : 'Resident incident reports with status, location, and incident date.',
        filename: 'incident-summary',
        dateField: 'updatedAt',
        rows: incidentRows,
      },
      {
        id: 'generation-processing-activity',
        title: locale === 'fil' ? 'Generation and Processing Activity' : 'Generation and Processing Activity',
        description:
          locale === 'fil'
            ? 'Generated document activity, processor, issuance date, and verification status.'
            : 'Generated document activity, processor, issuance date, and verification status.',
        filename: 'generation-processing-activity',
        dateField: 'dateIssued',
        rows: generationRows,
      },
    ],
    [approvalRows, feedbackRows, generationRows, incidentRows, locale, requestRows]
  );

  const filteredReports = useMemo(
    () =>
      reports.map((report) => ({
        ...report,
        rows: report.rows.filter((row) => isWithinDateRange(row, report.dateField, startDate, endDate)),
      })),
    [endDate, reports, startDate]
  );

  const totalVisibleRows = filteredReports.reduce((sum, report) => sum + report.rows.length, 0);

  const exportRows = async (filename: string, rows: ReportRow[]) => {
    const csv = await exportCsv(rows);
    await downloadCsv(`${filename}.csv`, csv);
  };

  const exportPrintableReport = (report: DownloadableReport) => {
    const html = buildPrintableReport(report, report.rows, startDate, endDate);
    downloadText(`${report.filename}-printable-report.html`, html, 'text/html;charset=utf-8;');
  };

  const exportAllRows = async () => {
    const rows = filteredReports.flatMap((report) =>
      report.rows.map((row) => ({
        report: report.title,
        ...row,
      }))
    );
    await exportRows('all-service-reports', rows);
  };

  const renderPreview = (rows: ReportRow[]) => {
    if (!rows.length) {
      return (
        <div className="rounded-[var(--portal-radius-md)] border border-dashed border-[color:var(--portal-border-strong)] bg-[color:var(--portal-surface-3)] p-5 text-center text-sm text-[color:var(--portal-ink-700)]">
          {locale === 'fil' ? 'Walang record para sa napiling date range.' : 'No records for the selected date range.'}
        </div>
      );
    }

    const headers = Object.keys(rows[0]).slice(0, 5);
    return (
      <Table>
        <TableHeader>
          <TableRow>
              {headers.map((header) => (
                <TableHead key={header} className="text-center">{formatColumnLabel(header)}</TableHead>
              ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, 6).map((row, index) => (
            <TableRow key={`row-${index}`}>
              {headers.map((header) => (
                <TableCell key={`${header}-${index}`} className="text-center">
                  {header === 'status' || header === 'verificationStatus' ? (
                    <StatusBadge tone={statusTone(`${row[header] ?? ''}`)}>{formatColumnLabel(`${row[header] ?? ''}`)}</StatusBadge>
                  ) : (
                    `${row[header] ?? ''}`
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <PortalShell role="admin" allowedRoles={['admin', 'staff']} title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {pageCopy.guide ? (
        <PageGuide
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      <SectionCard
        title={locale === 'fil' ? 'Downloadable Reports' : 'Downloadable Reports'}
        description={
          locale === 'fil'
            ? 'Pumili ng date range, tingnan ang preview, at i-download ang reports.'
            : 'Choose a date range, preview the data, and download reports.'
        }
        actions={
          <Button variant="residentOutline" className="border hover:border-[#145f3d] hover:bg-[#bfe6d0] hover:text-[#0d422c] hover:shadow-[0_5px_14px_rgba(20,95,61,0.22)] active:scale-[0.96] active:border-[#0d422c] active:bg-[#8dccaa] active:text-[#082c1d]" type="button" onClick={() => void exportAllRows()} disabled={totalVisibleRows === 0}>
            <Download size={14} className="mr-2" />
            {locale === 'fil' ? 'Download All CSV' : 'Download All CSV'}
          </Button>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-3)] p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="grid gap-2 text-sm font-medium text-[color:var(--portal-ink-800)]">
              {locale === 'fil' ? 'Start date' : 'Start date'}
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[color:var(--portal-ink-800)]">
              {locale === 'fil' ? 'End date' : 'End date'}
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
            <Button
              variant="residentOutline"
              className="border hover:border-[#145f3d] hover:bg-[#bfe6d0] hover:text-[#0d422c] hover:shadow-[0_5px_14px_rgba(20,95,61,0.22)] active:scale-[0.96] active:border-[#0d422c] active:bg-[#8dccaa] active:text-[#082c1d]"
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
            >
              <RotateCcw size={14} className="mr-2" />
              {locale === 'fil' ? 'Clear' : 'Clear'}
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="grid min-w-0 gap-3 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-white p-4 shadow-[var(--portal-shadow-1)]"
              >
                <div className="min-w-0">
                  <p className="font-heading text-base font-semibold text-[color:var(--portal-ink-900)]">{report.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--portal-ink-700)]">{report.description}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.1em] text-[color:var(--portal-ink-500)]">
                    {report.rows.length} records
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="residentOutline" className="border hover:border-[#145f3d] hover:bg-[#bfe6d0] hover:text-[#0d422c] hover:shadow-[0_5px_14px_rgba(20,95,61,0.22)] active:scale-[0.96] active:border-[#0d422c] active:bg-[#8dccaa] active:text-[#082c1d]" type="button" onClick={() => void exportRows(report.filename, report.rows)} disabled={report.rows.length === 0}>
                    <Download size={14} className="mr-2" />
                    CSV
                  </Button>
                  <Button variant="residentOutline" className="border hover:border-[#145f3d] hover:bg-[#bfe6d0] hover:text-[#0d422c] hover:shadow-[0_5px_14px_rgba(20,95,61,0.22)] active:scale-[0.96] active:border-[#0d422c] active:bg-[#8dccaa] active:text-[#082c1d]" type="button" onClick={() => exportPrintableReport(report)}>
                    <FileDown size={14} className="mr-2" />
                    {locale === 'fil' ? 'Printable' : 'Printable'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {filteredReports.map((report) => (
        <SectionCard
          key={report.id}
          title={report.title}
          description={`${report.rows.length} ${locale === 'fil' ? 'records sa kasalukuyang filter' : 'records in the current filter'}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="residentOutline" className="border hover:border-[#145f3d] hover:bg-[#bfe6d0] hover:text-[#0d422c] hover:shadow-[0_5px_14px_rgba(20,95,61,0.22)] active:scale-[0.96] active:border-[#0d422c] active:bg-[#8dccaa] active:text-[#082c1d]" type="button" onClick={() => void exportRows(report.filename, report.rows)} disabled={report.rows.length === 0}>
                <Download size={14} className="mr-2" />
                CSV
              </Button>
              <Button variant="residentOutline" className="border hover:border-[#145f3d] hover:bg-[#bfe6d0] hover:text-[#0d422c] hover:shadow-[0_5px_14px_rgba(20,95,61,0.22)] active:scale-[0.96] active:border-[#0d422c] active:bg-[#8dccaa] active:text-[#082c1d]" type="button" onClick={() => exportPrintableReport(report)}>
                <FileDown size={14} className="mr-2" />
                {locale === 'fil' ? 'Printable' : 'Printable'}
              </Button>
            </div>
          }
        >
          {renderPreview(report.rows)}
        </SectionCard>
      ))}

      <SectionCard
        title={locale === 'fil' ? 'Download Notes' : 'Download Notes'}
        description={
          locale === 'fil'
            ? 'Ang CSV ay para sa spreadsheet apps. Ang printable HTML ay puwedeng buksan sa browser at i-save o i-print as PDF.'
            : 'CSV works in spreadsheet apps. Printable HTML can be opened in a browser and printed or saved as PDF.'
        }
      >
        <div className="grid gap-2 text-sm text-[color:var(--portal-ink-700)]">
          <p>
            {locale === 'fil'
              ? 'Kasama sa reports ang request actions, approval/decline history, feedback trends, incident summary, at generation activity.'
              : 'Reports include request actions, approval/decline history, feedback trends, incident summary, and generation activity.'}
          </p>
          <p>
            {locale === 'fil'
              ? 'Ang date filters ay ginagamit bago mag-preview at bago mag-download.'
              : 'Date filters are applied to both previews and downloads.'}
          </p>
        </div>
      </SectionCard>
    </PortalShell>
  );
}

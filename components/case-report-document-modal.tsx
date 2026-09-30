'use client';

import { useRef, useState } from 'react';
import { Download, Printer, X, FileText, CheckCircle2, Shield, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatDateTime, formatIncidentCaseNumber } from '@/lib/formatters';
import type { IncidentReport } from '@/lib/types/models';

interface CaseReportDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: IncidentReport | null;
  locale?: 'en' | 'fil';
}

export default function CaseReportDocumentModal({
  open,
  onOpenChange,
  report,
  locale = 'fil',
}: CaseReportDocumentModalProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!report) return null;

  const caseNo = formatIncidentCaseNumber(report.id, report.createdAt);
  const isCommunity = report.trackType === 'community_concern';
  const isCfa = report.status === 'cfa_issued' || Boolean(report.cfa);
  const isPnp = report.status === 'referred_to_pnp' || Boolean(report.pnpReferral);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!documentRef.current) return;
    setIsExporting(true);
    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default;
      const element = documentRef.current;

      const opt = {
        margin: [0.4, 0.4, 0.4, 0.4],
        filename: `Barangay_Report_${caseNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF export error:', error);
      // Fallback to print
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-gray-200 bg-gray-100 p-0 shadow-2xl">
        {/* Top Control Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-[#123726] px-6 py-3 text-white shadow-md">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-emerald-300" />
            <h3 className="font-semibold text-sm">
              {locale === 'fil' ? 'Opisyal na Dokumento ng Kaso' : 'Official Case Report Document'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs font-medium bg-white/10 text-white hover:bg-white/20 border-white/20"
            >
              <Printer size={14} />
              {locale === 'fil' ? 'I-print' : 'Print'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="resident"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="h-8 gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Download size={14} />
              {isExporting ? (locale === 'fil' ? 'Inihahanda...' : 'Generating...') : locale === 'fil' ? 'I-download PDF' : 'Download PDF'}
            </Button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="ml-2 rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <DialogTitle className="sr-only">Official Case Document - {caseNo}</DialogTitle>
        <DialogDescription className="sr-only">Printable official barangay report document for case {caseNo}</DialogDescription>

        {/* Printable Official Document Sheet */}
        <div className="p-6 md:p-8 flex justify-center">
          <div
            ref={documentRef}
            className="w-full max-w-[800px] min-h-[1000px] rounded-lg border border-gray-300 bg-white p-8 md:p-12 shadow-lg text-gray-900 font-serif"
            style={{ fontFamily: 'Georgia, Times New Roman, serif' }}
          >
            {/* Official Header / Letterhead */}
            <header className="text-center border-b-2 border-gray-900 pb-4 mb-6">
              <p className="text-xs uppercase tracking-widest font-sans text-gray-600">Republic of the Philippines</p>
              <p className="text-xs uppercase tracking-widest font-sans text-gray-600">Province of Cavite / Local Government Unit</p>
              <h1 className="text-lg font-bold uppercase tracking-wider text-gray-900 mt-1 font-sans">
                OFFICE OF THE BARANGAY CHAIRMAN
              </h1>
              <p className="text-xs italic text-gray-600 mt-0.5">Barangay Hall, E-Serbisyo Portal Document Issuance</p>
            </header>

            {/* Document Title */}
            <div className="text-center my-6">
              <h2 className="text-xl font-bold uppercase tracking-wide border-b-2 border-dashed border-gray-400 inline-block pb-1">
                {isCfa
                  ? 'CERTIFICATE TO FILE ACTION (C.F.A.)'
                  : isPnp
                  ? 'POLICE ENDORSEMENT & INCIDENT TRANSMITTAL'
                  : isCommunity
                  ? 'BARANGAY COMMUNITY CONCERN RESOLUTION REPORT'
                  : 'OFFICIAL BARANGAY INCIDENT & BLOTTER TRANSCRIPT'}
              </h2>
              <p className="text-xs font-mono font-semibold text-gray-700 mt-2">
                OFFICIAL CASE CONTROL NO: <span className="bg-gray-100 px-2 py-0.5 border rounded">{caseNo}</span>
              </p>
            </div>

            {/* Case Meta Box */}
            <div className="my-6 rounded border border-gray-300 bg-gray-50/50 p-4 text-xs font-sans grid gap-2">
              <div className="grid grid-cols-2 gap-4">
                <p><strong>DATE FILED:</strong> {formatDateTime(report.createdAt, locale)}</p>
                <p><strong>CASE TRACK:</strong> {isCommunity ? 'COMMUNITY CONCERN' : 'INCIDENT / BLOTTER'}</p>
                <p><strong>CATEGORY:</strong> {report.kind.toUpperCase()}</p>
                <p><strong>LOCATION:</strong> {report.location}</p>
                <p><strong>INCIDENT DATE:</strong> {report.dateOfIncident}</p>
                <p><strong>FINAL STATUS:</strong> <span className="font-bold uppercase text-[#123726]">{report.status.replace(/_/g, ' ')}</span></p>
              </div>
            </div>

            {/* Parties Section for Incidents */}
            {!isCommunity ? (
              <div className="my-5 font-sans">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1 text-gray-800">
                  PARTIES INVOLVED / PARTICIPANTS
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs mt-2">
                  <div>
                    <p className="font-semibold text-gray-700 uppercase">COMPLAINANT / REPORTER:</p>
                    <p className="text-sm font-bold text-gray-900">{report.residentName}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 uppercase">RESPONDENT(S):</p>
                    <p className="text-sm font-bold text-gray-900">
                      {report.parties?.find((p) => p.role === 'respondent')?.fullName || 'N/A (Documented Record)'}
                    </p>
                    {report.relationshipToRespondent || report.parties?.find((p) => p.role === 'respondent')?.relationship ? (
                      <p className="text-xs text-gray-600 mt-0.5">
                        RELATIONSHIP: <span className="font-semibold text-gray-800">{report.relationshipToRespondent || report.parties?.find((p) => p.role === 'respondent')?.relationship}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Incident Summary & Statements */}
            <div className="my-5 font-sans">
              <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1 text-gray-800">
                SUBJECT MATTER & STATEMENT OF DETAILS
              </h3>
              <p className="text-sm font-bold text-gray-900 mt-2 mb-1">{report.title}</p>
              <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50/70 p-3 rounded border">
                {report.details}
              </p>
            </div>

            {/* Community Concern Action Log */}
            {isCommunity && report.actionLog ? (
              <div className="my-5 font-sans">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1 text-gray-800">
                  BARANGAY ACTION TAKEN & RESOLUTION LOG
                </h3>
                <div className="text-xs grid gap-1.5 mt-2 bg-emerald-50/50 p-3 rounded border border-emerald-200">
                  {report.actionLog.assignedTo ? (
                    <p><strong>ASSIGNED PERSONNEL / CREW:</strong> {report.actionLog.assignedTo}</p>
                  ) : null}
                  {report.actionLog.actionTaken ? (
                    <p><strong>ACTION COMPLETED:</strong> {report.actionLog.actionTaken}</p>
                  ) : null}
                  {report.actionLog.actionTakenAt ? (
                    <p><strong>COMPLETION DATE:</strong> {formatDateTime(report.actionLog.actionTakenAt, locale)}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Proceedings History Table */}
            {report.proceedings?.length ? (
              <div className="my-5 font-sans">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1 text-gray-800 mb-2">
                  SUMMARY OF BARANGAY PROCEEDINGS & HEARINGS
                </h3>
                <table className="w-full text-left text-xs border border-gray-300 border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300 font-bold uppercase">
                      <th className="p-2 border-r">SESSION</th>
                      <th className="p-2 border-r">DATE / VENUE</th>
                      <th className="p-2 border-r">MINUTES / DISCUSSION</th>
                      <th className="p-2">OUTCOME</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {report.proceedings.map((proc, index) => (
                      <tr key={proc.id || index}>
                        <td className="p-2 font-semibold border-r">
                          {proc.stage === 'barangay_hearing' ? 'Hearing' : 'Lupon'} #{proc.proceedingNo}
                        </td>
                        <td className="p-2 border-r">
                          {formatDateTime(proc.scheduledAt, locale)}
                          <br />
                          <span className="text-[10px] text-gray-500">{proc.venue}</span>
                        </td>
                        <td className="p-2 border-r">{proc.minutes || 'Session conducted'}</td>
                        <td className="p-2 uppercase font-semibold text-emerald-900">
                          {proc.agreements || proc.outcome || 'Logged'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* CFA Block if issued */}
            {isCfa && report.cfa ? (
              <div className="my-6 font-sans p-4 rounded border-2 border-amber-300 bg-amber-50/50 text-xs">
                <h4 className="font-bold text-amber-950 uppercase border-b border-amber-300 pb-1">
                  CERTIFICATION OF FAILURE OF CONCILIATION
                </h4>
                <p className="mt-2 text-amber-900 leading-relaxed">
                  This certifies that the above-mentioned incident was submitted for barangay conciliation under Case Control No.{' '}
                  <strong>{caseNo}</strong>. After due proceedings, no amicable settlement was reached by the parties.
                  Therefore, the Complainant is hereby issued this Certificate to File Action in the proper Court / PNP Office.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-amber-950 font-mono">
                  <p><strong>CFA CERTIFICATE NO:</strong> {report.cfa.certificateNumber}</p>
                  <p><strong>DATE ISSUED:</strong> {report.cfa.dateIssued}</p>
                  <p><strong>ISSUING AUTHORITY:</strong> {report.cfa.issuingAuthority}</p>
                  <p><strong>RECIPIENT:</strong> {report.cfa.recipientName}</p>
                </div>
              </div>
            ) : null}

            {/* PNP Referral Block if referred */}
            {isPnp && report.pnpReferral ? (
              <div className="my-6 font-sans p-4 rounded border-2 border-blue-300 bg-blue-50/50 text-xs">
                <h4 className="font-bold text-blue-950 uppercase border-b border-blue-300 pb-1">
                  POLICE REFERRAL TRANSMITTAL
                </h4>
                <p className="mt-2 text-blue-900 leading-relaxed">
                  The matter described above is hereby officially turned over to the Philippine National Police for subsequent lawful action and investigation.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-blue-950 font-mono">
                  <p><strong>RECEIVING POLICE UNIT:</strong> {report.pnpReferral.receivingUnit}</p>
                  <p><strong>POLICE REFERENCE NO:</strong> {report.pnpReferral.referenceNumber || 'N/A'}</p>
                  <p><strong>DATE REFERRED:</strong> {report.pnpReferral.dateReferred}</p>
                </div>
              </div>
            ) : null}

            {/* Official Certification & Signature Block */}
            <div className="mt-12 pt-6 font-sans">
              <p className="text-xs text-gray-700 italic">
                Issued and verified under the official authority of Barangay E-Serbisyo Digital System on{' '}
                {new Date().toLocaleDateString()}.
              </p>

              <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="border-b border-gray-900 mx-auto w-48 mb-1 min-h-[30px] flex items-end justify-center font-bold uppercase">
                    {report.residentName}
                  </div>
                  <p className="text-gray-600 uppercase text-[10px]">Complainant / Reporting Resident Signature</p>
                </div>

                <div>
                  <div className="border-b border-gray-900 mx-auto w-48 mb-1 min-h-[30px] flex items-end justify-center font-bold uppercase text-[#123726]">
                    HON. BARANGAY CHAIRMAN
                  </div>
                  <p className="text-gray-600 uppercase text-[10px]">Punong Barangay / Authorized Presiding Officer</p>
                </div>
              </div>

              {/* Digital Seal Watermark Note */}
              <div className="mt-8 text-center border-t pt-3">
                <p className="text-[10px] text-gray-500 font-mono">
                  [OFFICIAL BARANGAY DIGITAL DOCUMENT • VALID WITH EMBEDDED SYSTEM CONTROL NO. {caseNo}]
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

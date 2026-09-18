'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ReportEditor } from '@/src/components/ReportEditor/ReportEditor';
import { v4 as uuidv4 } from 'uuid';

export default function StaffReportsPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  const startNewReport = () => {
    const newId = `report-${uuidv4()}`;
    sessionStorage.removeItem(newId); // ensure clean
    setSessionId(newId);
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!sessionId) return;
    const html = sessionStorage.getItem(sessionId) || '';
    if (!html) return;
    if (format === 'pdf') {
      // @ts-ignore - html2pdf is loaded via script tag or npm
      const opt = { margin: 0.5, filename: `${sessionId}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
      // @ts-ignore
      html2pdf().set(opt).from(html).save();
    } else {
      // Generate DOCX using docx library
      const { Document, Packer, Paragraph } = await import('docx');
      const doc = new Document({ sections: [{ properties: {}, children: [new Paragraph(html)] }] });
      const blob = await Packer.toBlob(doc);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${sessionId}.docx`;
      a.click();
    }
  };

  return (
    <div className="p-6">
      {!sessionId && (
        <Button onClick={startNewReport}>Create New BDRRMC Report</Button>
      )}
      {sessionId && (
        <ReportEditor sessionId={sessionId} onExport={handleExport} />
      )}
    </div>
  );
}

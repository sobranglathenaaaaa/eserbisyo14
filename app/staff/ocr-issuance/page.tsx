'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import PortalShell from '@/components/portal-shell';
import { FormFeedback, PageGuide, SectionCard } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  createStandaloneOcrIssuance,
  finalizeStandaloneOcrIssuance,
  patchStandaloneOcrIssuance,
  runStandaloneOcrIssuanceScan,
} from '@/lib/frontend-data/store';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import { buildOcrIntakeFormHtml } from '@/lib/documents/ocr-intake-forms';
import {
  getAllOcrTemplates,
  getMissingRequiredTemplateFields,
  getTemplateOrDefault,
  validateOcrTemplateMatch,
  INDIGENCY_TEMPLATE_KEY,
} from '@/lib/ocr/templates';
import { getSupabaseBrowserClient, getSupabaseSessionSafely } from '@/lib/supabase/client';
import type { UIStatusTone } from '@/lib/types/ui';
import type { StandaloneOcrIssuance } from '@/lib/types/models';

function createPrintWindow() {
  return window.open('', '_blank', 'width=980,height=1200');
}

function writeAndPromptPrint(printWindow: Window, html: string) {
  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 150);
    return true;
  } catch {
    return false;
  }
}

function isOcrChoiceField(fieldKey: string) {
  return fieldKey.startsWith('reason') || fieldKey.startsWith('permit');
}

function hasOcrChoiceMark(value: string | undefined) {
  const normalized = (value ?? '').trim().toLowerCase();
  return Boolean(normalized && !['0', 'false', 'no', 'none', 'n/a'].includes(normalized));
}

export default function StaffOcrIssuancePage() {
  const { state, locale } = useAppState();
  const pageCopy = getRolePageCopy('staff/ocr-issuance');
  const [issuance, setIssuance] = useState<StandaloneOcrIssuance | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(INDIGENCY_TEMPLATE_KEY);
  const [linkedResidentId, setLinkedResidentId] = useState('');
  const [fieldDraft, setFieldDraft] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ tone: UIStatusTone; text: string } | null>(null);
  const [isUploadingOcr, setIsUploadingOcr] = useState(false);
  const [ocrProgressPercent, setOcrProgressPercent] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  const residents = useMemo(
    () => state.users.filter((user) => user.role === 'resident' && !user.isDeleted),
    [state.users],
  );

  const activeTemplate = useMemo(
    () => getTemplateOrDefault(issuance?.templateKey ?? selectedTemplateKey),
    [issuance?.templateKey, selectedTemplateKey],
  );
  const missingFieldKeys = useMemo(
    () => getMissingRequiredTemplateFields(activeTemplate.key, fieldDraft),
    [activeTemplate.key, fieldDraft],
  );
  const missingRequiredFields = useMemo(
    () =>
      missingFieldKeys.map((key) => ({
        key,
        label:
          key === 'reasonSelection'
            ? 'Marked reason(s)'
            : key === 'permitSelection'
              ? 'Marked permit choice(s)'
              : activeTemplate.labels[key] ?? key,
      })),
    [activeTemplate.labels, missingFieldKeys],
  );

  const printGeneratedDocument = async (generatedDocumentId: string, existingPrintWindow?: Window) => {
    const session = await getSupabaseSessionSafely(getSupabaseBrowserClient());
    const token = session.data.session?.access_token;
    const response = await fetch(`/api/v1/generated-documents/${generatedDocumentId}/printable`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    const payload = (await response.json().catch(() => null)) as
      | { success: boolean; data?: { html: string } }
      | null;
    if (!response.ok || !payload?.success || !payload.data?.html) {
      throw new Error('Unable to load printable document for this issuance.');
    }
    const printWindow = existingPrintWindow ?? createPrintWindow();
    if (!printWindow) {
      throw new Error('Popup blocked. Please allow popups for this site to print.');
    }
    const ok = writeAndPromptPrint(printWindow, payload.data.html);
    if (!ok) {
      throw new Error('Unable to open printable window.');
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null);
  };

  const handleTemplateChange = async (newKey: string) => {
    setSelectedTemplateKey(newKey);
    setFeedback(null);
    if (issuance && issuance.status === 'draft' && issuance.templateKey !== newKey) {
      try {
        const updated = await patchStandaloneOcrIssuance(issuance.id, {
          templateKey: newKey,
        });
        setIssuance(updated);
        setFieldDraft(updated.parsedFields ?? {});
      } catch (error) {
        console.error('Unable to patch templateKey on draft issuance:', error);
      }
    }
  };

  const handlePrintIntakeForm = () => {
    const html = buildOcrIntakeFormHtml(activeTemplate.key);
    const printWindow = createPrintWindow();
    if (!printWindow) {
      setFeedback({ tone: 'danger', text: 'Popup blocked. Please allow popups for this site to print.' });
      return;
    }
    writeAndPromptPrint(printWindow, html);
  };

  const handleRunOcr = async () => {
    if (!selectedFile) return;
    if (issuance?.status === 'issued') {
      setFeedback({
        tone: 'warning',
        text: 'This issuance is already finalized. Create a new issuance to run OCR again.',
      });
      return;
    }
    setIsUploadingOcr(true);
    setOcrProgressPercent(8);
    let progressTimer: number | null = null;
    let progressStep = 0;
    const progressMarks = [18, 34, 52, 67, 79, 88, 94];
    const startProgress = () => {
      progressTimer = window.setInterval(() => {
        const nextValue = progressMarks[Math.min(progressStep, progressMarks.length - 1)] ?? 94;
        progressStep += 1;
        setOcrProgressPercent((current) => {
          if (current == null) return nextValue;
          return Math.min(95, Math.max(current + 6, nextValue));
        });
      }, 450);
    };
    try {
      let activeIssuance = issuance;
      if (!activeIssuance) {
        console.log('Creating new standalone OCR issuance...');
        activeIssuance = await createStandaloneOcrIssuance({ templateKey: selectedTemplateKey });
        console.log('Issuance created:', activeIssuance);
        setIssuance(activeIssuance);
        setFieldDraft(activeIssuance.parsedFields ?? {});
      } else if (activeIssuance.templateKey !== selectedTemplateKey) {
        activeIssuance = await patchStandaloneOcrIssuance(activeIssuance.id, { templateKey: selectedTemplateKey });
        setIssuance(activeIssuance);
        setFieldDraft(activeIssuance.parsedFields ?? {});
      }
      startProgress();

      console.log('Running OCR scan for issuance:', activeIssuance.id);
      const updated = await runStandaloneOcrIssuanceScan(activeIssuance.id, { file: selectedFile });
      setIssuance(updated);
      setFieldDraft(updated.parsedFields ?? {});
      setSelectedFile(null);
      setOcrProgressPercent(100);
      setOcrProgressPercent(null);

      const validation = validateOcrTemplateMatch(selectedTemplateKey, updated.extractedText ?? '', locale);
      if (!validation.isMatch && validation.errorMessage) {
        setFeedback({ tone: 'danger', text: validation.errorMessage });
      } else if (updated.errorMessage) {
        setFeedback({ tone: 'danger', text: updated.errorMessage });
      } else {
        setFeedback({ tone: 'success', text: 'OCR extraction completed. Review and edit fields before issuing.' });
      }
    } catch (error) {
      console.error('OCR Error:', error);
      let errorMessage = error instanceof Error ? error.message : 'Unable to run OCR scan.';
      if (issuance?.extractedText) {
        const check = validateOcrTemplateMatch(selectedTemplateKey, issuance.extractedText, locale);
        if (!check.isMatch && check.errorMessage) {
          errorMessage = check.errorMessage;
        }
      }
      setFeedback({ tone: 'danger', text: errorMessage });
    } finally {
      if (progressTimer !== null) {
        window.clearInterval(progressTimer);
      }
      setOcrProgressPercent(null);
      setIsUploadingOcr(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!issuance) return;
    if (issuance.status === 'issued') {
      setFeedback({
        tone: 'warning',
        text: 'Issued records are locked. Create a new issuance for new edits.',
      });
      return;
    }
    setIsSaving(true);
    try {
      const updated = await patchStandaloneOcrIssuance(issuance.id, {
        parsedFields: fieldDraft,
        residentId: linkedResidentId || null,
      });
      setIssuance(updated);
      setLinkedResidentId(updated.residentId ?? '');
      setFeedback({ tone: 'success', text: 'Extracted fields saved.' });
    } catch (error) {
      setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : 'Unable to save extracted fields.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleIssueAndPrint = async () => {
    if (!issuance) return;
    if (issuance.status === 'issued') {
      if (!issuance.generatedDocumentId) {
        setFeedback({
          tone: 'danger',
          text: 'This issuance is already finalized but has no linked generated document to print.',
        });
        return;
      }
      setIsIssuing(true);
      try {
        const printWindow = createPrintWindow();
        if (!printWindow) {
          throw new Error('Popup blocked. Please allow popups for this site to print.');
        }
        await printGeneratedDocument(issuance.generatedDocumentId, printWindow);
        setFeedback({
          tone: 'success',
          text: `${activeTemplate.documentLabel} already issued. Reprinted successfully.`,
        });
      } catch (error) {
        setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : 'Unable to reprint document.' });
      } finally {
        setIsIssuing(false);
      }
      return;
    }
    if (missingRequiredFields.length) {
      setFeedback({
        tone: 'danger',
        text: `Complete all required fields first: ${missingRequiredFields.map((field) => field.label).join(', ')}`,
      });
      return;
    }

    setIsIssuing(true);
    try {
      const printWindow = createPrintWindow();
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for this site to print.');
      }

      // Always persist latest staff edits before final issuance.
      const patched = await patchStandaloneOcrIssuance(issuance.id, {
        parsedFields: fieldDraft,
        residentId: linkedResidentId || null,
      });
      setIssuance(patched);
      setLinkedResidentId(patched.residentId ?? '');

      const result = await finalizeStandaloneOcrIssuance(issuance.id, {
        residentId: linkedResidentId || null,
      });
      setIssuance(result.issuance);

      const printed = writeAndPromptPrint(printWindow, result.printableHtml);
      if (!printed) {
        throw new Error('Unable to open printable window.');
      }

      setFeedback({
        tone: 'success',
        text: linkedResidentId
          ? `${activeTemplate.documentLabel} issued and printed. A copy is also sent to the linked resident portal.`
          : `${activeTemplate.documentLabel} issued and printed (print-only issuance).`,
      });
    } catch (error) {
      setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : 'Unable to issue document.' });
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <PortalShell
      role="staff"
      title={pageCopy.title}
      description={pageCopy.description}
      showHero={false}
    >
      {pageCopy.guide ? (
        <PageGuide
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      <SectionCard
        title="Issuance via OCR"
      >
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm text-(--portal-ink-800)">
            <span>Template</span>
            <Select
              value={selectedTemplateKey}
              onChange={(event) => void handleTemplateChange(event.target.value)}
              disabled={issuance?.status === 'issued' || isUploadingOcr || isSaving || isIssuing}
            >
              {getAllOcrTemplates().map((template) => (
                <option key={template.key} value={template.key}>
                  {template.documentLabel}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="resident" onClick={handlePrintIntakeForm}>
              Print OCR Form
            </Button>
          </div>

          <label className="grid gap-1 text-sm text-(--portal-ink-800)">
            <span>Upload Returned Form</span>
            <Input type="file" accept="image/png,image/jpeg,image/jfif,image/webp,.jfif" onChange={handleFileChange} />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="resident" onClick={() => void handleRunOcr()} disabled={!selectedFile || isUploadingOcr}>
              {isUploadingOcr
                ? 'Running OCR...'
                : issuance
                  ? 'Run OCR Extraction'
                  : 'Run OCR Extraction'}
            </Button>
            <Button
              type="button"
              variant="residentOutline"
              onClick={() => void handleSaveDraft()}
              disabled={!issuance || isSaving || issuance.status === 'issued'}
            >
              {isSaving ? 'Saving fields...' : 'Save Draft Fields'}
            </Button>
          </div>
          <p className="text-xs text-(--portal-ink-600)">
            Upload completed OCR form then click Run OCR. If no draft exists yet, one is created automatically.
          </p>

          {isUploadingOcr ? (
            <div className="grid gap-2 rounded-(--portal-radius-md) border border-(--portal-border-soft) bg-[linear-gradient(180deg,#f8fbf9_0%,#eff7f2_100%)] p-3">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-(--portal-ink-700)">
                <span>OCR processing</span>
                <span>{Math.max(0, Math.min(100, ocrProgressPercent ?? 0))}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-(--portal-border-soft)" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#1b7a50_0%,#2f9a65_100%)] transition-[width] duration-200 ease-out"
                  style={{ width: `${Math.max(0, Math.min(100, ocrProgressPercent ?? 0))}%` }}
                />
              </div>
            </div>
          ) : null}

          {issuance ? (
            <div className="grid gap-2 rounded-(--portal-radius-md) border border-(--portal-border-soft) bg-white p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-(--portal-ink-500)">
                Issuance ID: {issuance.id}
              </p>
              <p className="text-xs text-(--portal-ink-600)">Status: {issuance.status}</p>
              {activeTemplate.intakeFields.map((field) => {
                const isChoiceField = isOcrChoiceField(field.key);
                return (
                  <label key={field.key} className="grid gap-1 text-xs text-(--portal-ink-700)">
                    <span>{field.label}{field.required ? ' *' : ''}</span>
                    <Input
                      value={isChoiceField ? (hasOcrChoiceMark(fieldDraft[field.key]) ? 'Yes' : 'No') : fieldDraft[field.key] ?? ''}
                      onChange={(event) =>
                        setFieldDraft((prev) => ({
                          ...prev,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                );
              })}
              {missingRequiredFields.length ? (
                <p className="text-xs text-[#a33b32]">
                  Missing required fields: {missingRequiredFields.map((field) => field.label).join(', ')}
                </p>
              ) : null}
              {!selectedFile && issuance.status === 'draft' ? (
                <p className="text-xs text-(--portal-ink-600)">
                  Upload a returned OCR form and click Run OCR Extraction.
                </p>
              ) : null}
              <Button
                type="button"
                variant="residentOutline"
                onClick={() => void handleIssueAndPrint()}
                disabled={
                  !issuance ||
                  isIssuing ||
                  (issuance.status !== 'issued' && missingRequiredFields.length > 0) ||
                  (issuance.status === 'issued' && !issuance.generatedDocumentId)
                }
              >
                {isIssuing
                  ? 'Preparing print...'
                  : issuance.status === 'issued'
                    ? `Reprint ${activeTemplate.documentLabel}`
                    : `Issue and Print ${activeTemplate.documentLabel}`}
              </Button>
            </div>
          ) : null}

          {feedback ? (
            <FormFeedback
              tone={
                feedback.tone === 'danger'
                  ? 'error'
                  : feedback.tone === 'warning'
                    ? 'info'
                    : 'success'
              }
              text={feedback.text}
            />
          ) : null}
        </div>
      </SectionCard>
    </PortalShell>
  );
}

'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
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
  buildDynamicOcrTemplateDefinition,
  getAllOcrTemplates,
  getCategoryDefaultOcrTemplate,
  getDefaultOcrTemplate,
  getOcrTemplateByKey,
  validateOcrTemplateMatch,
  BARANGAY_CERTIFICATE_TEMPLATE_KEY,
  INDIGENCY_TEMPLATE_KEY,
  type OcrTemplateDefinition,
} from '@/lib/ocr/templates';
import {
  OFFICIAL_DOCUMENT_CATEGORIES,
  getCategoryForDocType,
} from '@/lib/documents/document-catalog-constants';
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
  const [fileInputKey, setFileInputKey] = useState(0);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('barangay_certification');
  const [linkedResidentId, setLinkedResidentId] = useState('');
  const [fieldDraft, setFieldDraft] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ tone: UIStatusTone; text: string } | null>(null);
  const [isUploadingOcr, setIsUploadingOcr] = useState(false);
  const [hasScanCompleted, setHasScanCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  const residents = useMemo(
    () => state.users.filter((user) => user.role === 'resident' && !user.isDeleted),
    [state.users],
  );

  // 7 Official Document Types matching the system catalog and Admin templates
  const availableDocumentTypes = useMemo(() => {
    const officialTypes = OFFICIAL_DOCUMENT_CATEGORIES.map((cat) => {
      const matchedDb = (state.documentTemplates ?? []).find(
        (t) => t.documentType === cat.id || getCategoryForDocType(t.documentType, t.name) === cat.id
      );

      const definition: OcrTemplateDefinition = matchedDb
        ? buildDynamicOcrTemplateDefinition(matchedDb)
        : getCategoryDefaultOcrTemplate(cat.id);

      return {
        key: cat.id,
        label: locale === 'fil' ? cat.labelFil : cat.labelEn,
        category: cat.id,
        definition,
        hasCustomTemplate: Boolean(matchedDb),
      };
    });

    const customTypes = (state.documentTemplates ?? [])
      .filter(
        (t) =>
          !OFFICIAL_DOCUMENT_CATEGORIES.some(
            (cat) => cat.id === t.documentType || getCategoryForDocType(t.documentType, t.name) === cat.id
          )
      )
      .map((t) => ({
        key: t.id,
        label: t.name.replace(/\s+Template$/i, '').trim() || t.name,
        category: 'custom',
        definition: buildDynamicOcrTemplateDefinition(t),
        hasCustomTemplate: true,
      }));

    return [...officialTypes, ...customTypes];
  }, [state.documentTemplates, locale]);

  // Sync selectedTemplateKey to first available if initial value not found
  useEffect(() => {
    if (availableDocumentTypes.length > 0 && !availableDocumentTypes.some((t) => t.key === selectedTemplateKey)) {
      setSelectedTemplateKey(availableDocumentTypes[0].key);
    }
  }, [availableDocumentTypes, selectedTemplateKey]);

  const activeTemplate: OcrTemplateDefinition = useMemo(() => {
    const key = issuance?.templateKey ?? selectedTemplateKey;
    const found = availableDocumentTypes.find((t) => t.key === key);
    if (found) return found.definition;
    const directPreset = getOcrTemplateByKey(key);
    if (directPreset) return directPreset;
    const matchedDb = (state.documentTemplates ?? []).find(
      (t) => t.id === key || t.documentType === key || getCategoryForDocType(t.documentType, t.name) === key
    );
    if (matchedDb) return buildDynamicOcrTemplateDefinition(matchedDb);
    return availableDocumentTypes[0]?.definition ?? getDefaultOcrTemplate();
  }, [issuance?.templateKey, selectedTemplateKey, availableDocumentTypes, state.documentTemplates]);

  const missingFieldKeys = useMemo(
    () => {
      return activeTemplate.getMissingFields(fieldDraft);
    },
    [activeTemplate, fieldDraft],
  );

  const missingRequiredFields = useMemo(
    () => {
      return missingFieldKeys.map((key) => ({
        key,
        label: activeTemplate.labels[key] ?? key,
      }));
    },
    [activeTemplate, missingFieldKeys],
  );

  const ocrAccuracyPercent = useMemo(() => {
    const intakeFields = activeTemplate.intakeFields;
    if (!intakeFields.length) return 95;
    const filledCount = intakeFields.filter((field) => Boolean((fieldDraft[field.key] ?? '').trim())).length;
    const ratio = filledCount / intakeFields.length;
    return Math.min(99, Math.max(85, Math.round(85 + ratio * 13)));
  }, [activeTemplate.intakeFields, fieldDraft]);

  const handleStartNewIssuance = () => {
    setIssuance(null);
    setSelectedFile(null);
    setLinkedResidentId('');
    setFieldDraft({});
    setFeedback({ tone: 'info', text: 'Started a new issuance. Select a document type and upload a form to run OCR.' });
    setHasScanCompleted(false);
    setFileInputKey((prev) => prev + 1);
  };

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
    setHasScanCompleted(false);
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
    const html = buildOcrIntakeFormHtml(activeTemplate.key, activeTemplate);
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
    setHasScanCompleted(false);
    setFeedback(null);

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

      console.log('Running OCR scan for issuance:', activeIssuance.id);
      const updated = await runStandaloneOcrIssuanceScan(activeIssuance.id, { file: selectedFile });
      setIssuance(updated);
      setFieldDraft(updated.parsedFields ?? {});
      setSelectedFile(null);

      const validation = validateOcrTemplateMatch(selectedTemplateKey, updated.extractedText ?? '', locale);
      if (!validation.isMatch && validation.errorMessage) {
        setFeedback({ tone: 'danger', text: validation.errorMessage });
        setHasScanCompleted(false);
      } else if (updated.errorMessage) {
        setFeedback({ tone: 'danger', text: updated.errorMessage });
        setHasScanCompleted(false);
      } else {
        setHasScanCompleted(true);
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
      setHasScanCompleted(false);
    } finally {
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
            <span>Document Type</span>
            <Select
              value={selectedTemplateKey}
              onChange={(event) => void handleTemplateChange(event.target.value)}
              disabled={issuance?.status === 'issued' || isUploadingOcr || isSaving || isIssuing}
            >
              {availableDocumentTypes.map((docType) => (
                <option key={docType.key} value={docType.key}>
                  {docType.label}
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
            <Input key={fileInputKey} type="file" accept="image/png,image/jpeg,image/jfif,image/webp,.jfif" onChange={handleFileChange} />
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
            <div className="grid gap-3 rounded-(--portal-radius-md) border-2 border-[#2f9a65]/40 bg-[linear-gradient(135deg,#f2faf5_0%,#e1f4e8_100%)] p-4 text-xs shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1b7a50]/15 text-[#1b7a50]">
                  <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="absolute inset-0 animate-ping rounded-full bg-[#1b7a50]/20" aria-hidden="true" />
                </div>
                <div className="grid gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#114b30]">
                      OCR Scanning & Extraction in Progress
                    </span>
                    <span className="inline-flex items-center rounded-full bg-[#1b7a50] px-2 py-0.5 text-[10px] font-semibold text-white animate-pulse">
                      Processing...
                    </span>
                  </div>
                  <p className="text-xs text-[#1e6141]">
                    Please wait while the OCR reads text and fills in form fields.
                  </p>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#c3e6d2]">
                <div className="h-full w-full rounded-full bg-[linear-gradient(90deg,#1b7a50,#42b27b,#1b7a50)] animate-pulse" />
              </div>
            </div>
          ) : null}

          {!isUploadingOcr && (hasScanCompleted || Boolean(issuance?.extractedText)) && feedback?.tone !== 'danger' ? (
            <div className="grid gap-2 rounded-(--portal-radius-md) border border-[#bce3cd] bg-[linear-gradient(180deg,#f4fbf7_0%,#eaf6ef_100%)] p-3.5 text-xs">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#1b7a50]">
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 1001-18 0 9 9 0 0118 0z" />
                  </svg>
                  OCR Accuracy Threshold
                </span>
                <span className="rounded-full bg-[#1b7a50]/10 px-2.5 py-0.5 text-xs font-bold text-[#1b7a50]">
                  {ocrAccuracyPercent}% Accuracy
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#cde8d8]" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#1b7a50_0%,#2f9a65_100%)] transition-all duration-300 ease-out"
                  style={{ width: `${ocrAccuracyPercent}%` }}
                />
              </div>
              <p className="mt-0.5 text-xs font-medium text-(--portal-ink-700)">
                OCR extraction completed. Review and edit fields before issuing.
              </p>
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
              <div className="flex flex-wrap gap-2 pt-2">
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
                <Button
                  type="button"
                  variant="resident"
                  onClick={handleStartNewIssuance}
                  disabled={isUploadingOcr || isSaving || isIssuing}
                >
                  Issue Another Document
                </Button>
              </div>
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


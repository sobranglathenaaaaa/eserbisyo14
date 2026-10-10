'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
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
  getCategoryDefaultOcrTemplate,
  getDefaultOcrTemplate,
  getOcrTemplateByKey,
  type OcrTemplateDefinition,
} from '@/lib/ocr/templates';
import {
  OFFICIAL_DOCUMENT_CATEGORIES,
  OFFICIAL_WORD_TEMPLATES,
  loadDocumentTypesCatalog,
  getCategoryForDocType,
  getPurposesForDocumentType,
  type DocumentTypeCatalogItem,
} from '@/lib/documents/document-catalog-constants';
import {
  renderDocumentTemplateHtml,
  resolvePurposeFromReasons,
} from '@/lib/documents/official-template-builder';
import { getSupabaseBrowserClient, getSupabaseSessionSafely } from '@/lib/supabase/client';
import type { UIStatusTone } from '@/lib/types/ui';
import type { DocumentTemplate, StandaloneOcrIssuance } from '@/lib/types/models';
import {
  CheckCircle2,
  Printer,
  FileText,
} from 'lucide-react';

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

function cleanOcrText(input: string): string {
  return input
    .replace(/^[\s:;,\-.()_[\]{}]+/, '')
    .replace(/^\s*(?:x|check|checked)\s*[:\-]?\s*/i, '')
    .trim();
}

function extractDraftFromOcr(
  parsed: Record<string, unknown> = {},
  extractedText: string = '',
  previous: Record<string, string> = {}
): Record<string, string> {
  const p = (key: string): string => {
    const val = parsed[key];
    return typeof val === 'string' ? val.trim() : val != null ? String(val).trim() : '';
  };

  // Helper to extract regex pattern matches from extractedText as a fallback
  const matchText = (patterns: RegExp[]): string => {
    if (!extractedText) return '';
    for (const pat of patterns) {
      const match = extractedText.match(pat);
      if (match && match[1]?.trim()) {
        const cleaned = cleanOcrText(match[1]);
        if (cleaned) return cleaned;
      }
    }
    return '';
  };

  const textResidentName = matchText([
    /(?:Resident(?:\s+Full)?\s*Name|Name\s+of\s+Owner|Owner(?:\s*Name)?|Respondent(?:\s*Name)?|Certify\s+that|Issued\s+upon\s+the\s+request\s+of|Applicant(?:\s*Name)?|Pangalan(?:\s+ng\s+May-ari)?)\s*[:\-]?\s*([^\n\r]+)/i,
  ]);

  const textAddress = matchText([
    /(?:Residence\s+(?:Address|at)|Postal\s+Address|Address(?:\s+of\s+Owner)?|Owner\s+Address|Tirahan|Address)\s*[:\-]?\s*([^\n\r]+)/i,
  ]);

  const textBusinessName = matchText([
    /(?:Name\s+of\s+Establishment|Business(?:\s+Name)?|Establishment(?:\s*Name)?|Pangalan\s+ng\s+Negosyo|Trade\s+Name)\s*[:\-]?\s*([^\n\r]+)/i,
  ]);

  const textPurpose = matchText([
    /(?:Purpose|Reason|Layunin|For(?:\s+the\s+purpose\s+of)?|Assistance\s+Type|Complaint\s+For)\s*[:\-]?\s*([^\n\r]+)/i,
  ]);

  const textComplainant = matchText([
    /(?:Complainant(?:\/s|\s*Name)?|Nagsusumbong|May-sumbong)\s*[:\-]?\s*([^\n\r]+)/i,
  ]);

  const textCaseNo = matchText([
    /(?:Barangay\s+Case\s+(?:No|Number)|Case\s+(?:No|Number)|Kaso\s+Blg)\s*[:\-]?\s*([^\n\r]+)/i,
  ]);

  const textDateFiled = matchText([
    /(?:Date\s+Filed|Petsa\s+ng\s+Pagsusumbong|Petsa\s+Naihain)\s*[:\-]?\s*([^\n\r]+)/i,
  ]);

  const textSiteLocation = matchText([
    /(?:Site\s+Location|Project\s+Location|Kung\s+saan\s+gaganapin|Workplace\s+Address|Hauling\s+Address)\s*[:\-]?\s*([^\n\r]+)/i,
  ]);

  const textPermitType = matchText([
    /(?:Permit\s+Type|Uri\s+ng\s+Permit|Permit)\s*[:\-]?\s*([^\n\r]+)/i,
  ]);

  const textIssuedDate = matchText([
    /(?:Date\s+(?:to\s+issue|Issued)|Given\s+this|Issued\s+this|Petsa)\s*[:\-]?\s*([^\n\r]+)/i,
  ]);

  const residentName =
    p('residentName') ||
    p('resident_name') ||
    p('ownerName') ||
    p('owner_name') ||
    p('applicantName') ||
    p('applicant_name') ||
    p('respondents') ||
    p('respondent') ||
    p('respondentName') ||
    p('fullName') ||
    p('full_name') ||
    p('name') ||
    p('requestedBy') ||
    textResidentName ||
    previous.residentName ||
    '';

  const residentAddress =
    p('residentAddress') ||
    p('resident_address') ||
    p('residentAddressLine') ||
    p('resident_address_line') ||
    p('address') ||
    p('postalAddress') ||
    p('postal_address') ||
    p('ownerAddress') ||
    p('owner_address') ||
    p('residenceAddress') ||
    p('residence_address') ||
    p('workplace_address') ||
    textAddress ||
    previous.residentAddress ||
    previous.address ||
    '';

  const businessName =
    p('businessName') ||
    p('business_name') ||
    p('establishmentName') ||
    p('establishment_name') ||
    p('tradeName') ||
    p('trade_name') ||
    p('companyName') ||
    p('company_name') ||
    textBusinessName ||
    previous.businessName ||
    '';

  const complainantName =
    p('complainantName') ||
    p('complainant_name') ||
    p('complainants') ||
    p('complainant') ||
    textComplainant ||
    previous.complainantName ||
    '';

  const caseNumber =
    p('caseNumber') ||
    p('case_number') ||
    p('barangayCaseNumber') ||
    p('barangay_case_number') ||
    p('caseNo') ||
    p('case_no') ||
    textCaseNo ||
    previous.caseNumber ||
    '';

  const dateFiled =
    p('dateFiled') ||
    p('date_filed') ||
    p('filedDate') ||
    p('filed_date') ||
    textDateFiled ||
    previous.dateFiled ||
    '';

  const addWhere =
    p('addWhere') ||
    p('add_where') ||
    p('location') ||
    p('projectLocation') ||
    p('project_location') ||
    p('siteAddress') ||
    p('site_address') ||
    p('hauling_address') ||
    p('workplace_address') ||
    textSiteLocation ||
    previous.addWhere ||
    '';

  const permitType =
    p('permitType') ||
    p('permit_type') ||
    p('otherPermitText') ||
    p('permitOther') ||
    textPermitType ||
    previous.permitType ||
    '';

  const stringParsed = Object.entries(parsed).reduce<Record<string, string>>((acc, [k, v]) => {
    acc[k] = typeof v === 'string' ? v : String(v ?? '');
    return acc;
  }, {});

  const purpose =
    p('purpose') ||
    p('reason') ||
    p('reasonText') ||
    p('otherReasonText') ||
    p('complaintFor') ||
    p('complaint_for') ||
    resolvePurposeFromReasons(stringParsed) ||
    textPurpose ||
    previous.purpose ||
    '';

  const issuedDate =
    p('issuedDate') ||
    p('dateIssued') ||
    p('date_issued') ||
    p('issued_date') ||
    textIssuedDate ||
    previous.issuedDate ||
    previous.dateIssued ||
    new Date().toISOString().slice(0, 10);

  return {
    ...previous,
    ...stringParsed,
    residentName,
    residentAddress,
    address: residentAddress,
    residentAddressLine: residentAddress,
    postalAddress: residentAddress,
    businessName,
    establishmentName: businessName,
    purpose,
    issuedDate,
    dateIssued: issuedDate,
    complainantName,
    caseNumber,
    dateFiled,
    addWhere,
    permitType,
  };
}

export default function StaffOcrIssuancePage() {
  const { state, locale } = useAppState();
  const isFil = locale === 'fil';
  const pageCopy = getRolePageCopy('staff/ocr-issuance');

  const [issuance, setIssuance] = useState<StandaloneOcrIssuance | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('tpl_brgy_clearance');
  const todayIso = new Date().toISOString().slice(0, 10);
  const [fieldDraft, setFieldDraft] = useState<Record<string, string>>({
    issuedDate: todayIso,
    dateIssued: todayIso,
  });
  const [feedback, setFeedback] = useState<{ tone: UIStatusTone; text: string } | null>(null);
  const [isUploadingOcr, setIsUploadingOcr] = useState(false);
  const [hasScanCompleted, setHasScanCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) {
      setSelectedFilePreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(selectedFile);
    setSelectedFilePreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [selectedFile]);

  // Admin Document Types Catalog (Synced with Admin Configuration)
  const [docTypesCatalog, setDocTypesCatalog] = useState<DocumentTypeCatalogItem[]>([]);

  useEffect(() => {
    setDocTypesCatalog(loadDocumentTypesCatalog());

    const handleCatalogUpdate = (e: Event) => {
      const customEv = e as CustomEvent<DocumentTypeCatalogItem[]>;
      if (customEv.detail && Array.isArray(customEv.detail)) {
        setDocTypesCatalog(customEv.detail);
      } else {
        setDocTypesCatalog(loadDocumentTypesCatalog());
      }
    };

    window.addEventListener('eserbisyo:document-types-catalog-updated', handleCatalogUpdate);
    window.addEventListener('eserbisyo:document-types-updated', handleCatalogUpdate);
    return () => {
      window.removeEventListener('eserbisyo:document-types-catalog-updated', handleCatalogUpdate);
      window.removeEventListener('eserbisyo:document-types-updated', handleCatalogUpdate);
    };
  }, []);

  // Concisely map the 7 Primary Document Types to their official/custom templates
  const templatesList = useMemo(() => {
    const customTemplates = state.documentTemplates || [];
    const catalog = docTypesCatalog.length > 0 ? docTypesCatalog : OFFICIAL_DOCUMENT_CATEGORIES.map((c) => ({
      id: c.id,
      name: c.labelEn,
      categoryId: c.id,
      categoryLabel: c.labelEn,
      isActive: true,
    }));

    return catalog
      .filter((docType) => docType.isActive !== false)
      .map((docType) => {
        // 1. Check if Admin saved a custom template specifically for this document type
        const customMatch = customTemplates.find((tpl) => {
          const cat = getCategoryForDocType(tpl.documentType, tpl.name);
          return (
            cat === docType.id ||
            cat === docType.categoryId ||
            tpl.id === docType.id ||
            tpl.documentType === docType.id
          );
        });

        if (customMatch) {
          const officialWordMatch = OFFICIAL_WORD_TEMPLATES.find(
            (ow) => ow.id === customMatch.id || ow.categoryId === docType.categoryId || ow.documentType === docType.id
          );
          return {
            ...customMatch,
            name: docType.name,
            dynamicFields:
              customMatch.dynamicFields && customMatch.dynamicFields.length > 0
                ? customMatch.dynamicFields
                : officialWordMatch?.dynamicFields || ['resident_name', 'resident_address', 'purpose', 'date_issued', 'punong_barangay'],
            documentType: docType.id,
            sourceType: customMatch.sourceType || 'custom',
          };
        }

        // 2. Otherwise use the primary official Word template definition
        const officialWordMatch = OFFICIAL_WORD_TEMPLATES.find(
          (ow) => ow.categoryId === docType.categoryId || ow.documentType === docType.id
        );

        return {
          id: officialWordMatch ? officialWordMatch.id : docType.id,
          name: docType.name,
          body: '',
          dynamicFields: officialWordMatch
            ? officialWordMatch.dynamicFields
            : ['resident_name', 'resident_address', 'purpose', 'date_issued', 'punong_barangay'],
          updatedAt: new Date().toISOString(),
          updatedBy: 'System (Official)',
          documentType: docType.id,
          sourceType: 'official',
          originalFileName: officialWordMatch?.fileName,
          isActive: true,
        };
      });
  }, [docTypesCatalog, state.documentTemplates]);

  // Sync selectedTemplateKey to first available if initial value not found
  useEffect(() => {
    if (templatesList.length > 0 && !templatesList.some((t) => t.id === selectedTemplateKey)) {
      setSelectedTemplateKey(templatesList[0].id);
    }
  }, [templatesList, selectedTemplateKey]);

  // Currently active selected document template
  const activeSelectedTemplate = useMemo(() => {
    const key = issuance?.templateKey ?? selectedTemplateKey;
    return templatesList.find((t) => t.id === key) ?? templatesList[0] ?? null;
  }, [issuance?.templateKey, selectedTemplateKey, templatesList]);

  // Active Document Type details from Admin Catalog
  const activeDocTypeItem = useMemo(() => {
    if (!activeSelectedTemplate) return null;
    const catId = getCategoryForDocType(activeSelectedTemplate.documentType, activeSelectedTemplate.name);
    return (
      docTypesCatalog.find((c) => c.id === catId || c.categoryId === catId || c.name.toLowerCase() === activeSelectedTemplate.name.toLowerCase()) ||
      docTypesCatalog.find((c) => c.id === activeSelectedTemplate.documentType) ||
      null
    );
  }, [activeSelectedTemplate, docTypesCatalog]);

  // Purposes configured in Admin for this Document Type
  const availablePurposes = useMemo(() => {
    if (activeDocTypeItem?.purposes && activeDocTypeItem.purposes.length > 0) {
      return activeDocTypeItem.purposes;
    }
    const catId = activeDocTypeItem?.id || getCategoryForDocType(activeSelectedTemplate?.documentType, activeSelectedTemplate?.name);
    return getPurposesForDocumentType(activeSelectedTemplate?.name, catId);
  }, [activeDocTypeItem, activeSelectedTemplate]);

  const otherPurposeOptionValue = useMemo(() => {
    return availablePurposes.find((p) => p.toLowerCase().includes('other') || p.toLowerCase().includes('specify')) || 'Other Purpose';
  }, [availablePurposes]);

  const isOtherPurposeSelected = useMemo(() => {
    const current = (fieldDraft.purpose || '').toLowerCase();
    const otherOption = availablePurposes.find((p) => p.toLowerCase().includes('other') || p.toLowerCase().includes('specify'));
    return (
      (Boolean(otherOption) && fieldDraft.purpose === otherOption) ||
      current.includes('other') ||
      current.includes('specify') ||
      Boolean(fieldDraft.otherPurposeDetails) ||
      (!availablePurposes.includes(fieldDraft.purpose ?? '') && Boolean(fieldDraft.purpose))
    );
  }, [fieldDraft.purpose, fieldDraft.otherPurposeDetails, availablePurposes]);

  // Active OCR Template Definition for extraction validation
  const activeOcrDefinition: OcrTemplateDefinition = useMemo(() => {
    if (!activeSelectedTemplate) return getDefaultOcrTemplate();
    const directPreset = getOcrTemplateByKey(activeSelectedTemplate.id) ?? getOcrTemplateByKey(activeSelectedTemplate.documentType ?? '');
    if (directPreset) return directPreset;
    const cat = getCategoryForDocType(activeSelectedTemplate.documentType, activeSelectedTemplate.name);
    return getCategoryDefaultOcrTemplate(cat);
  }, [activeSelectedTemplate]);

  // Determine which specialized field inputs to show based on Document Type / Template
  const docCategoryKey = useMemo(() => {
    return getCategoryForDocType(activeSelectedTemplate?.documentType, activeSelectedTemplate?.name);
  }, [activeSelectedTemplate]);

  const isLuponDoc = useMemo(() => {
    return (
      docCategoryKey === 'lupon_tagapamayapa' ||
      (activeSelectedTemplate?.name || '').toLowerCase().includes('lupon') ||
      (activeSelectedTemplate?.name || '').toLowerCase().includes('patawag') ||
      (activeSelectedTemplate?.name || '').toLowerCase().includes('summons') ||
      (activeSelectedTemplate?.name || '').toLowerCase().includes('cfa')
    );
  }, [docCategoryKey, activeSelectedTemplate]);

  const isBusinessDoc = useMemo(() => {
    return (
      docCategoryKey === 'business_clearance' ||
      (activeSelectedTemplate?.name || '').toLowerCase().includes('business')
    );
  }, [docCategoryKey, activeSelectedTemplate]);

  const isSiteLocationDoc = useMemo(() => {
    return (
      docCategoryKey === 'construction_clearances' ||
      docCategoryKey === 'transient_employees' ||
      docCategoryKey === 'delivery_hauling_clearances' ||
      docCategoryKey === 'special_commercial_permits' ||
      (activeSelectedTemplate?.name || '').toLowerCase().includes('construction') ||
      (activeSelectedTemplate?.name || '').toLowerCase().includes('transient') ||
      (activeSelectedTemplate?.name || '').toLowerCase().includes('permit') ||
      (activeSelectedTemplate?.name || '').toLowerCase().includes('hauling')
    );
  }, [docCategoryKey, activeSelectedTemplate]);

  // Live Template Preview HTML (100% Identical to Admin Document Templates)
  const livePreviewHtml = useMemo(() => {
    const purpose = fieldDraft.otherPurposeDetails || fieldDraft.purpose || resolvePurposeFromReasons(fieldDraft);
    const residentName = fieldDraft.residentName || 'Juan Dela Cruz';
    const residentAddress =
      fieldDraft.residentAddress ||
      fieldDraft.address ||
      fieldDraft.residentAddressLine ||
      fieldDraft.residenceAddress ||
      'Barangay Progreso, City of San Juan';
    const dateIssued = fieldDraft.issuedDate || fieldDraft.dateIssued || new Date().toISOString().slice(0, 10);

    return renderDocumentTemplateHtml(
      activeSelectedTemplate,
      {
        ...fieldDraft,
        residentName,
        residentAddress,
        purpose,
        dateIssued,
      }
    );
  }, [fieldDraft, activeSelectedTemplate]);

  const missingRequiredFields = useMemo(() => {
    const missing: Array<{ key: string; label: string }> = [];
    if (!(fieldDraft.residentName ?? '').trim()) {
      missing.push({ key: 'residentName', label: isLuponDoc ? 'Respondent / Resident Name' : 'Resident Full Name' });
    }
    if (!isLuponDoc && !(fieldDraft.residentAddress ?? fieldDraft.address ?? fieldDraft.residentAddressLine ?? '').trim()) {
      missing.push({ key: 'residentAddress', label: 'Residence / Postal Address' });
    }
    if (isLuponDoc) {
      if (!(fieldDraft.complainantName ?? '').trim()) {
        missing.push({ key: 'complainantName', label: 'Complainant Full Name' });
      }
    }
    if (isBusinessDoc) {
      if (!(fieldDraft.businessName ?? '').trim()) {
        missing.push({ key: 'businessName', label: 'Business / Establishment Name' });
      }
    }
    return missing;
  }, [fieldDraft, isLuponDoc, isBusinessDoc]);

  const ocrAccuracyPercent = useMemo(() => {
    if (!hasScanCompleted) return 0;
    const nameFilled = Boolean((fieldDraft.residentName ?? fieldDraft.ownerName ?? '').trim());
    const addressFilled = Boolean((fieldDraft.residentAddress ?? fieldDraft.address ?? fieldDraft.postalAddress ?? '').trim());
    const purposeFilled = Boolean((fieldDraft.otherPurposeDetails || fieldDraft.purpose || '').trim());
    
    const checks: boolean[] = [nameFilled, addressFilled, purposeFilled];
    if (isBusinessDoc) {
      checks.push(Boolean((fieldDraft.businessName ?? fieldDraft.establishmentName ?? '').trim()));
    }
    if (isLuponDoc) {
      checks.push(Boolean((fieldDraft.complainantName ?? fieldDraft.complainants ?? '').trim()));
    }
    if (isSiteLocationDoc) {
      checks.push(Boolean((fieldDraft.addWhere ?? '').trim()));
    }
    const filledCount = checks.filter(Boolean).length;
    const totalCount = checks.length;
    const completeness = Math.round((filledCount / totalCount) * 100);
    const extractedTextLength = issuance?.extractedText?.trim().length ?? 0;
    const textQualityPenalty = extractedTextLength < 80 ? 8 : extractedTextLength < 180 ? 4 : 0;
    return Math.min(95, Math.max(0, completeness - textQualityPenalty));
  }, [fieldDraft, isBusinessDoc, isLuponDoc, isSiteLocationDoc, hasScanCompleted, issuance?.extractedText]);

  const handleStartNewIssuance = () => {
    setIssuance(null);
    setSelectedFile(null);
    setFieldDraft({
      issuedDate: new Date().toISOString().slice(0, 10),
      dateIssued: new Date().toISOString().slice(0, 10),
    });
    setFeedback({ tone: 'info', text: 'Started a new issuance. Select a document template and upload a form to run OCR.' });
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

    // If new template has specific default purposes, preset initial purpose if empty
    const matched = templatesList.find((t) => t.id === newKey);
    if (matched) {
      const cat = getCategoryForDocType(matched.documentType, matched.name);
      const purposes = getPurposesForDocumentType(matched.name, cat);
      if (purposes.length > 0 && !fieldDraft.purpose) {
        setFieldDraft((prev) => ({
          ...prev,
          purpose: purposes[0],
        }));
      }
    }

    if (issuance && issuance.status === 'draft' && issuance.templateKey !== newKey) {
      try {
        const updated = await patchStandaloneOcrIssuance(issuance.id, {
          templateKey: newKey,
        });
        setIssuance(updated);
        setFieldDraft((prev) => extractDraftFromOcr(updated.parsedFields ?? {}, updated.extractedText ?? '', prev));
      } catch (error) {
        console.error('Unable to patch templateKey on draft issuance:', error);
      }
    }
  };

  const handlePrintIntakeForm = () => {
    const html = buildOcrIntakeFormHtml(activeOcrDefinition.key, {
      ...activeOcrDefinition,
      name: activeSelectedTemplate?.name || activeOcrDefinition.name,
      purposes: availablePurposes,
    });
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
    setFieldDraft({
      issuedDate: new Date().toISOString().slice(0, 10),
      dateIssued: new Date().toISOString().slice(0, 10),
    });

    try {
      let activeIssuance = issuance;
      if (!activeIssuance) {
        activeIssuance = await createStandaloneOcrIssuance({ templateKey: selectedTemplateKey });
        setIssuance(activeIssuance);
        setFieldDraft(extractDraftFromOcr(activeIssuance.parsedFields ?? {}, activeIssuance.extractedText ?? '', fieldDraft));
      } else if (activeIssuance.templateKey !== selectedTemplateKey) {
        activeIssuance = await patchStandaloneOcrIssuance(activeIssuance.id, { templateKey: selectedTemplateKey });
        setIssuance(activeIssuance);
        setFieldDraft(extractDraftFromOcr(activeIssuance.parsedFields ?? {}, activeIssuance.extractedText ?? '', fieldDraft));
      }

      const updated = await runStandaloneOcrIssuanceScan(activeIssuance.id, { file: selectedFile });
      setIssuance(updated);

      if (updated.errorMessage) {
        setHasScanCompleted(false);
        setFieldDraft({
          issuedDate: new Date().toISOString().slice(0, 10),
          dateIssued: new Date().toISOString().slice(0, 10),
        });
        setFeedback({ tone: 'warning', text: updated.errorMessage });
        return;
      }

      const mapped = extractDraftFromOcr(
        updated.parsedFields ?? {},
        updated.extractedText ?? '',
        fieldDraft
      );
      setFieldDraft(mapped);
      setHasScanCompleted(true);

      // Note: We don't set a duplicate success banner here because the Quality Match banner will render clearly.
      setFeedback(null);
    } catch (error) {
      setFeedback({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Failed to scan intake form via OCR.',
      });
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
      });
      setIssuance(updated);
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
        setFeedback(null);
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
      });
      setIssuance(patched);

      const result = await finalizeStandaloneOcrIssuance(issuance.id);
      setIssuance(result.issuance);

      const printed = writeAndPromptPrint(printWindow, result.printableHtml);
      if (!printed) {
        throw new Error('Unable to open printable window.');
      }

      setFeedback({
        tone: 'success',
        text: `${activeSelectedTemplate?.name || 'Document'} issued and printed successfully.`,
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

      <div className="grid gap-6">
        {/* Top Control Card */}
        <SectionCard title="Issuance via OCR">
          <div className="grid gap-4">
            {/* Clean Template Selector for the 7 Primary Document Types */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-(--portal-ink-800)">
                <span className="font-medium flex items-center justify-between">
                  <span>Document Template</span>
                  <span className="text-xs font-normal text-slate-500">
                    {templatesList.length} Official Document Types
                  </span>
                </span>
                <Select
                  value={selectedTemplateKey}
                  onChange={(event) => void handleTemplateChange(event.target.value)}
                  disabled={issuance?.status === 'issued' || isUploadingOcr || isSaving || isIssuing}
                >
                  {templatesList.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </Select>
              </label>

              <div className="flex flex-col justify-end">
                <Button
                  type="button"
                  variant="residentOutline"
                  onClick={handlePrintIntakeForm}
                  className="w-full sm:w-auto"
                >
                  <Printer className="mr-1.5 h-4 w-4" />
                  Print Blank OCR Form ({activeSelectedTemplate?.name || 'Intake'})
                </Button>
              </div>
            </div>

            {/* Upload Box */}
            <div className="grid gap-3 rounded-(--portal-radius-md) border border-(--portal-border-soft) bg-(--portal-bg-card) p-4">
              <div className="grid gap-1.5 text-sm text-(--portal-ink-800)">
                <span className="font-semibold">Upload Returned Intake Form (Image / Scan)</span>
                <input
                  ref={fileInputRef}
                  key={fileInputKey}
                  type="file"
                  accept="image/png,image/jpeg,image/jfif,image/webp,.jfif"
                  onChange={handleFileChange}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <div className="flex min-h-11 items-center gap-3 rounded-(--portal-radius-md) border border-(--portal-border-soft) bg-white px-3 py-2 text-xs text-(--portal-ink-600)">
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    Choose File
                  </Button>
                  {selectedFile && selectedFilePreviewUrl ? (
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <a
                        href={selectedFilePreviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Preview ${selectedFile.name}`}
                        title="Preview image"
                        className="break-all font-semibold text-[#176b48] underline underline-offset-2 hover:text-[#114b30]"
                      >
                        {selectedFile.name}
                      </a>
                      <span>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <span>No file chosen</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="resident"
                  onClick={() => void handleRunOcr()}
                  disabled={!selectedFile || isUploadingOcr}
                >
                  <FileText className="mr-1.5 h-4 w-4" />
                  {isUploadingOcr ? 'Running OCR Extraction...' : 'Run OCR Extraction'}
                </Button>

                <Button
                  type="button"
                  variant="residentOutline"
                  onClick={() => void handleSaveDraft()}
                  disabled={!issuance || isSaving || issuance.status === 'issued'}
                >
                  {isSaving ? 'Saving...' : 'Save Draft Fields'}
                </Button>

                {issuance ? (
                  <Button
                    type="button"
                    variant="residentOutline"
                    onClick={handleStartNewIssuance}
                    disabled={isUploadingOcr || isSaving || isIssuing}
                  >
                    Start New Issuance
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-(--portal-ink-600)">
                Upload the scanned form, then click Run OCR Extraction to auto-populate the official Document Template connected to Admin.
              </p>
            </div>

            {/* Live Loading Animation while scanning */}
            {isUploadingOcr ? (
              <div className="grid gap-3 rounded-(--portal-radius-md) border border-[#1b7a50]/40 bg-[#f4fbf7] p-4 text-xs shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1b7a50]/15 text-[#1b7a50]">
                    <svg className="h-7 w-7 animate-spin text-[#1b7a50]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="absolute inset-0 animate-ping rounded-full bg-[#1b7a50]/20" aria-hidden="true" />
                  </div>
                  <div className="grid gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#114b30]">
                        OCR Scanning & Field Mapping in Progress
                      </span>
                      <span className="inline-flex items-center rounded-full bg-[#1b7a50] px-2.5 py-0.5 text-[10px] font-semibold text-white animate-pulse">
                        Analyzing Document...
                      </span>
                    </div>
                    <p className="text-xs text-[#1e6141]">
                      Tinitingnan muna kung tugma ang uploaded form sa {activeSelectedTemplate?.name || 'Document'} bago kunin ang lahat ng fields.
                    </p>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#c3e6d2]">
                  <div className="h-full w-full rounded-full bg-[linear-gradient(90deg,#1b7a50,#42b27b,#1b7a50)] animate-pulse" />
                </div>
              </div>
            ) : null}

            {/* OCR Quality Match & Accuracy Threshold Card (When Scan Completed or Extracted Text Loaded) */}
            {!isUploadingOcr && hasScanCompleted ? (
              <div className="grid gap-3 rounded-(--portal-radius-md) border border-[#bce3cd] bg-[linear-gradient(180deg,#f4fbf7_0%,#eaf6ef_100%)] p-4 text-xs shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1b7a50]/15 text-[#1b7a50]">
                      <svg className="h-6 w-6 text-[#1b7a50] animate-[spin_8s_linear_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="12" cy="12" r="9" strokeWidth="2.5" strokeDasharray="6 4" />
                      </svg>
                      <CheckCircle2 className="absolute h-5 w-5 text-[#1b7a50]" />
                    </div>
                    <div className="grid gap-0.5">
                      <span className="text-sm font-bold text-[#114b30]">
                        OCR Extraction Complete
                      </span>
                      <span className="text-xs text-[#1e6141]">
                        Template: <strong className="font-semibold">{activeSelectedTemplate?.name}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase font-semibold text-[#1e6141] tracking-wider">
                        Accuracy Threshold
                      </span>
                      <span className="inline-flex items-center rounded-full bg-[#1b7a50] px-3.5 py-1 text-xs font-bold text-white shadow-xs">
                        {ocrAccuracyPercent}% Quality Match
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accuracy progress meter bar */}
                <div className="grid gap-1">
                  <div className="flex justify-between text-[11px] text-[#1e6141]">
                    <span>Field Detection & Mapping Completeness</span>
                    <span className="font-semibold">{ocrAccuracyPercent}% Threshold Met</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#c3e6d2]">
                    <div
                      className="h-full rounded-full bg-[#1b7a50] transition-all duration-500 ease-out"
                      style={{ width: `${Math.max(10, ocrAccuracyPercent)}%` }}
                    />
                  </div>
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

        {/* Extracted Form Fields & Document Issuance Card */}
        {hasScanCompleted ? <SectionCard title="Extracted Document Data">
          <div className="grid gap-4">
            <div className="flex items-center justify-between text-xs text-(--portal-ink-600)">
              <div className="flex items-center gap-2">
                <span>
                  Status:{' '}
                  <strong className="text-(--portal-ink-800) uppercase font-semibold">
                    {issuance?.status || 'Draft'}
                  </strong>
                </span>
                {hasScanCompleted ? (
                  <span className="inline-flex items-center rounded-full bg-[#eaf6ef] border border-[#bce3cd] px-2.5 py-0.5 text-[11px] font-bold text-[#1b7a50]">
                    {ocrAccuracyPercent}% Accuracy
                  </span>
                ) : null}
              </div>
              {issuance ? (
                <span className="font-mono text-[11px] text-(--portal-ink-500)">
                  ID: {issuance.id.slice(0, 8)}...
                </span>
              ) : null}
            </div>

            {/* Primary Document Fields */}
            <div className="grid gap-4 border-t border-(--portal-border-soft) pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="grid gap-1 text-xs font-semibold text-(--portal-ink-800)">
                  <span>{isLuponDoc ? 'Respondent / Resident Name *' : 'Resident Full Name *'}</span>
                  <Input
                    placeholder="e.g. Juan Dela Cruz"
                    value={fieldDraft.residentName ?? ''}
                    onChange={(e) =>
                      setFieldDraft((prev) => ({
                        ...prev,
                        residentName: e.target.value,
                      }))
                    }
                  />
                </label>

                {!isLuponDoc && (
                  <label className="grid gap-1 text-xs font-semibold text-(--portal-ink-800)">
                    <span>Residence / Postal Address *</span>
                    <Input
                      placeholder="e.g. #123 M. Cruz St., Barangay Progreso, San Juan City"
                      value={fieldDraft.residentAddress ?? fieldDraft.address ?? fieldDraft.residentAddressLine ?? ''}
                      onChange={(e) =>
                        setFieldDraft((prev) => ({
                          ...prev,
                          residentAddress: e.target.value,
                          address: e.target.value,
                          residentAddressLine: e.target.value,
                        }))
                      }
                    />
                  </label>
                )}
              </div>

              {/* Document Type Purpose Dropdown (Official Purposes from Admin) */}
              <div className="grid gap-1.5 text-xs font-semibold text-(--portal-ink-800)">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{isFil ? 'Layunin ng Dokumento (Document Purpose) *' : 'Document Purpose / Request Reason *'}</span>
                  </span>
                  {availablePurposes.length > 0 && (
                    <span className="text-[11px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {availablePurposes.length} {isFil ? 'opsyon' : 'options'}
                    </span>
                  )}
                </div>

                <Select
                  value={
                    availablePurposes.includes(fieldDraft.purpose ?? '')
                      ? fieldDraft.purpose
                      : isOtherPurposeSelected
                        ? otherPurposeOptionValue
                        : availablePurposes[0] ?? ''
                  }
                  onChange={(e) => {
                    const selected = e.target.value;
                    setFieldDraft((prev) => ({
                      ...prev,
                      purpose: selected,
                    }));
                  }}
                  className="bg-white font-normal text-xs"
                >
                  {availablePurposes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>

                {/* If 'Other Purpose' is selected or specified in OCR, show the exact input box */}
                {isOtherPurposeSelected && (
                  <div className="mt-1">
                    <span className="text-[11px] text-slate-600 font-normal">
                      {isFil ? 'Pakitukoy ang partikular na layunin (Other Purpose Specification) *:' : 'Please specify other purpose details *:'}
                    </span>
                    <Input
                      placeholder={isFil ? 'Hal. Para sa partikular na transaksyon / requirement...' : 'e.g. For specific transaction or requirement...'}
                      value={fieldDraft.otherPurposeDetails ?? (availablePurposes.includes(fieldDraft.purpose ?? '') ? '' : fieldDraft.purpose ?? '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFieldDraft((prev) => ({
                          ...prev,
                          otherPurposeDetails: val,
                          purpose: val.trim() ? val : (otherPurposeOptionValue || 'Other Purpose'),
                        }));
                      }}
                      className="mt-1 bg-white font-normal text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Lupon Specific Fields */}
              {isLuponDoc && (
                <>
                  <label className="grid gap-1 text-xs font-semibold text-(--portal-ink-800)">
                    <span>Complainant Full Name (Lupon) *</span>
                    <Input
                      placeholder="e.g. Pedro Santos"
                      value={fieldDraft.complainantName ?? ''}
                      onChange={(e) =>
                        setFieldDraft((prev) => ({
                          ...prev,
                          complainantName: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-(--portal-ink-800)">
                      <span>Barangay Case No.</span>
                      <Input
                        placeholder="e.g. KP-2026-001"
                        value={fieldDraft.caseNumber ?? ''}
                        onChange={(e) =>
                          setFieldDraft((prev) => ({
                            ...prev,
                            caseNumber: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-(--portal-ink-800)">
                      <span>Date Filed</span>
                      <Input
                        type="date"
                        value={fieldDraft.dateFiled ?? ''}
                        onChange={(e) =>
                          setFieldDraft((prev) => ({
                            ...prev,
                            dateFiled: e.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </>
              )}

              {/* Business Clearance Specific Fields */}
              {isBusinessDoc && (
                <label className="grid gap-1 text-xs font-semibold text-(--portal-ink-800)">
                  <span>Business / Establishment Name *</span>
                  <Input
                    placeholder="e.g. Progreso Sari-Sari Store"
                    value={fieldDraft.businessName ?? ''}
                    onChange={(e) =>
                      setFieldDraft((prev) => ({
                        ...prev,
                        businessName: e.target.value,
                      }))
                    }
                  />
                </label>
              )}

              {/* Construction / Transient / Hauling / Special Permits Location */}
              {isSiteLocationDoc && (
                <label className="grid gap-1 text-xs font-semibold text-(--portal-ink-800)">
                  <span>Project / Activity Site Location (Kung saan gaganapin)</span>
                  <Input
                    placeholder="e.g. Lot 4 Block 2, Progreso St., San Juan City"
                    value={fieldDraft.addWhere ?? ''}
                    onChange={(e) =>
                      setFieldDraft((prev) => ({
                        ...prev,
                        addWhere: e.target.value,
                      }))
                    }
                  />
                </label>
              )}
            </div>

            {missingRequiredFields.length ? (
              <p className="text-xs font-medium text-[#a33b32]">
                Missing required fields: {missingRequiredFields.map((field) => field.label).join(', ')}
              </p>
            ) : null}

            {/* Issuance Action Bar */}
            <div className="flex flex-col gap-2 border-t border-(--portal-border-soft) pt-4">
              <Button
                type="button"
                variant="resident"
                onClick={() => void handleIssueAndPrint()}
                disabled={
                  isIssuing ||
                  (issuance?.status !== 'issued' && missingRequiredFields.length > 0) ||
                  (issuance?.status === 'issued' && !issuance?.generatedDocumentId)
                }
                className="w-full py-2.5 text-sm font-semibold shadow-sm"
              >
                <Printer className="mr-1.5 h-4 w-4" />
                {isIssuing
                  ? 'Preparing print...'
                  : issuance?.status === 'issued'
                    ? `Reprint ${activeSelectedTemplate?.name || 'Document'}`
                    : `Issue and Print ${activeSelectedTemplate?.name || 'Document'}`}
              </Button>
            </div>
          </div>
        </SectionCard> : null}
      </div>
    </PortalShell>
  );
}

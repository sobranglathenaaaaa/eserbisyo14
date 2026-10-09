'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FormFeedback, InfoNotice, PageGuide, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime, getRequestStatusLabel } from '@/lib/formatters';
import { submitDocumentRequest, cancelPendingRequest } from '@/lib/frontend-data/store';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { copyText } from '@/features/resident/model/copy';
import { getResidentDocumentRequestView } from '@/features/resident/model/requests';
import { ResidentEmpty, ResidentSection } from '@/features/resident/view/resident-primitives';
import { ResidentShell } from '@/features/resident/view/resident-shell';
import { DocumentRequestSummaryModal } from '@/features/resident/view/document-request-summary-modal';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import { getSupabaseBrowserClient, getSupabaseSessionSafely } from '@/lib/supabase/client';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import {
  OFFICIAL_DOCUMENT_CATEGORIES,
  DEFAULT_OFFICIAL_TEMPLATES,
  getCategoryForDocType,
  getCategoryLabel,
  loadDocumentTypesCatalog,
  getPurposesForDocumentType,
} from '@/lib/documents/document-catalog-constants';

const DRAFT_KEY = 'eserbisyo.draft.document-request';

type RequestViewTab = 'active' | 'history' | 'docs';
type RawDocumentType = { id: string; category: string; type: string; price: number; pricing_note?: string | null };
type DocumentTypeOption = {
  optionId: string;
  backendId: string;
  category: string;
  type: string;
  price: number;
  pricing_note?: string | null;
};
type ProxyRequestDetails = {
  fullName: string;
  birthDate: string;
  address: string;
  contactNumber: string;
  relationship: string;
  consentChecked: boolean;
};

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function getRequestNextStep(status: string, locale: 'en' | 'fil') {
  if (status === 'pending') {
    return copyText(locale, 'Waiting for barangay review. You can still cancel while it is pending.', 'Naghihintay ng review ng barangay. Puwede mo pa itong kanselahin habang pending.');
  }
  if (status === 'staff_reviewed') {
    return copyText(locale, 'Reviewed by staff. Waiting for admin approval.', 'Nasuri na ng staff. Naghihintay ng admin approval.');
  }
  if (status === 'approved') {
    return copyText(locale, 'Approved. Please wait for further instructions. We will notify you when your document is ready for pickup.', 'Approved na. Maghintay ng susunod na abiso. Aabisuhan ka namin kapag ready nang kunin ang dokumento.');
  }
  if (status === 'completed') {
    return copyText(locale, 'Your request is complete. We would appreciate your feedback about the service.', 'Tapos na ang request mo. Malaking tulong sa amin ang feedback mo tungkol sa serbisyo.');
  }
  if (status === 'ready_for_pickup') {
    return copyText(locale, 'Your document is ready for pickup at the barangay hall. Please bring a valid ID.', 'Ready nang kunin ang dokumento sa barangay hall. Magdala ng valid ID.');
  }
  if (status === 'declined') {
    return copyText(locale, 'Declined. Open the summary to see the reason before submitting again.', 'Tinanggihan. Buksan ang buod para makita ang dahilan bago muling magsumite.');
  }
  if (status === 'cancelled') {
    return copyText(locale, 'Cancelled. Submit a new request if you still need this document.', 'Kinansela. Magsumite ng bagong request kung kailangan mo pa ang dokumentong ito.');
  }
  return copyText(locale, 'Check the summary for the latest update.', 'Tingnan ang buod para sa pinakabagong update.');
}

export default function ResidentDocumentRequestsPage() {
  const { state, user, locale } = useAppState();
  const pageCopy = getRolePageCopy('resident/document-requests');
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dbTypes, setDbTypes] = useState<RawDocumentType[]>([]);
  const [purpose, setPurpose] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [addWhere, setAddWhere] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [complainantName, setComplainantName] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [submissionToast, setSubmissionToast] = useState<string | null>(null);
  const [hasChosenType, setHasChosenType] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [proxyModalOpen, setProxyModalOpen] = useState(false);
  const [isRequestingForSomeone, setIsRequestingForSomeone] = useState(false);
  const [proxyDetails, setProxyDetails] = useState<ProxyRequestDetails>({
    fullName: '',
    birthDate: '',
    address: '',
    contactNumber: '',
    relationship: '',
    consentChecked: false,
  });
  const [summaryRequestId, setSummaryRequestId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const [activeTab, setActiveTab] = useState<RequestViewTab>('active');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [printingDocId, setPrintingDocId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const session = await getSupabaseSessionSafely(supabase);
      const token = session.data.session?.access_token;
      const response = await fetch('/api/v1/document-types', {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const payload = (await response.json().catch(() => null)) as
        | { success: true; data: { documentTypes: RawDocumentType[] } }
        | null;
      if (payload?.success && Array.isArray(payload.data.documentTypes)) {
        setDbTypes(payload.data.documentTypes);
      }
    })();
  }, []);

  // Dynamically build document types and templates connected to Admin Document Templates & Catalog
  const documentTypes = useMemo<DocumentTypeOption[]>(() => {
    const catalog = loadDocumentTypesCatalog().filter((c) => c.isActive !== false);
    const customTemplates = (state.documentTemplates || []).filter((t) => t.isActive !== false);
    const options: DocumentTypeOption[] = [];
    const seenOptionKeys = new Set<string>();

    // 1. Process custom catalog items from Admin Document Types & Purposes Catalog
    catalog.forEach((catItem) => {
      const categoryLabel = catItem.categoryLabel || getCategoryLabel(catItem.categoryId);
      const optionKey = `${categoryLabel.toLowerCase()}|${catItem.name.toLowerCase()}`;
      if (!seenOptionKeys.has(optionKey)) {
        seenOptionKeys.add(optionKey);
        const matchingDbType =
          dbTypes.find(
            (db) => db.category.toLowerCase() === categoryLabel.toLowerCase() && db.type.toLowerCase() === catItem.name.toLowerCase()
          ) ||
          dbTypes.find((db) => db.category.toLowerCase() === categoryLabel.toLowerCase()) ||
          dbTypes[0];

        options.push({
          optionId: catItem.id,
          backendId: matchingDbType?.id || catItem.id,
          category: categoryLabel,
          type: catItem.name,
          price: matchingDbType?.price ?? catItem.price,
          pricing_note: matchingDbType?.pricing_note ?? catItem.pricingNote,
        });
      }
    });

    // 2. Process custom / active templates from Admin (state.documentTemplates)
    customTemplates.forEach((tpl) => {
      const categoryId =
        tpl.documentType && OFFICIAL_DOCUMENT_CATEGORIES.some((c) => c.id === tpl.documentType)
          ? tpl.documentType
          : getCategoryForDocType(tpl.documentType, tpl.name);
      const categoryLabel = getCategoryLabel(categoryId);
      const matchingDbType =
        dbTypes.find(
          (db) => db.category.toLowerCase() === categoryLabel.toLowerCase() && db.type.toLowerCase() === tpl.name.toLowerCase()
        ) ||
        dbTypes.find(
          (db) => db.category.toLowerCase() === categoryLabel.toLowerCase()
        ) ||
        dbTypes[0];

      const optionKey = `${categoryLabel.toLowerCase()}|${tpl.name.toLowerCase()}`;
      if (!seenOptionKeys.has(optionKey)) {
        seenOptionKeys.add(optionKey);
        options.push({
          optionId: tpl.id,
          backendId: matchingDbType?.id || tpl.id,
          category: categoryLabel,
          type: tpl.name,
          price: matchingDbType?.price ?? 0,
          pricing_note: matchingDbType?.pricing_note,
        });
      }
    });

    // 3. Include default official templates for all official categories if not already added
    DEFAULT_OFFICIAL_TEMPLATES.forEach((defTpl) => {
      const categoryLabel = getCategoryLabel(defTpl.categoryId);
      const optionKey = `${categoryLabel.toLowerCase()}|${defTpl.name.toLowerCase()}`;
      if (!seenOptionKeys.has(optionKey)) {
        seenOptionKeys.add(optionKey);
        const matchingDbType =
          dbTypes.find(
            (db) => db.category.toLowerCase() === categoryLabel.toLowerCase() && db.type.toLowerCase() === defTpl.name.toLowerCase()
          ) ||
          dbTypes.find(
            (db) => db.category.toLowerCase() === categoryLabel.toLowerCase()
          ) ||
          dbTypes[0];

        options.push({
          optionId: defTpl.id,
          backendId: matchingDbType?.id || defTpl.id,
          category: categoryLabel,
          type: defTpl.name,
          price: matchingDbType?.price ?? defTpl.price,
          pricing_note: matchingDbType?.pricing_note ?? defTpl.pricingNote,
        });
      }
    });

    return options;
  }, [state.documentTemplates, dbTypes]);

  useEffect(() => {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw) as { selectedCategory?: string; selectedOptionId?: string; typeId?: string; purpose: string };
      setSelectedCategory(draft.selectedCategory || '');
      setSelectedOptionId(draft.selectedOptionId || draft.typeId || '');
      setPurpose(draft.purpose || '');
    } catch {
      // ignore invalid draft payload
    }
  }, []);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('tab') as RequestViewTab | null;
    if (param && ['active', 'history', 'docs'].includes(param)) {
      setActiveTab(param);
    }
  }, []);

  useEffect(() => {
    if (!submissionToast) return;
    const timeoutId = window.setTimeout(() => setSubmissionToast(null), 7000);
    return () => window.clearTimeout(timeoutId);
  }, [submissionToast]);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ selectedCategory, selectedOptionId, purpose }));
  }, [selectedCategory, selectedOptionId, purpose]);

  const { myRequests, activeRequests, sortedHistory, myDocs } = useMemo(
    () => getResidentDocumentRequestView(state, user?.id),
    [state, user?.id]
  );

  useEffect(() => {
    const documentId = new URLSearchParams(window.location.search).get('documentId');
    if (!documentId) return;
    if (myDocs.some((doc) => doc.id === documentId)) {
      setActiveTab('docs');
      setSelectedDocId(documentId);
    }
  }, [myDocs]);

  // Clean, strictly unique 7 Official Document Categories in exact order
  const categories = useMemo(() => {
    return OFFICIAL_DOCUMENT_CATEGORIES.map((c) => c.labelEn);
  }, []);


  const typesByCategory = useMemo(
    () =>
      documentTypes.reduce<Record<string, DocumentTypeOption[]>>((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {}),
    [documentTypes]
  );
  const currentCategory = selectedCategory || categories[0] || '';
  const currentTypes = typesByCategory[currentCategory] ?? [];

  useEffect(() => {
    if (!categories.length) {
      if (selectedCategory) setSelectedCategory('');
      if (selectedOptionId) setSelectedOptionId('');
      return;
    }

    if (!selectedCategory || !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0]);
      return;
    }

    const availableInCategory = typesByCategory[selectedCategory] ?? [];
    if (!availableInCategory.length) {
      if (selectedOptionId) setSelectedOptionId('');
      return;
    }

    const typeExists = availableInCategory.some((item) => item.optionId === selectedOptionId);
    if (!typeExists) {
      setSelectedOptionId(availableInCategory[0].optionId);
    }
  }, [categories, selectedCategory, typesByCategory, selectedOptionId]);

  // Prevent background scroll when modal is open
  useBodyScrollLock(proxyModalOpen || confirmSubmitOpen || Boolean(summaryRequestId));

  const selected = documentTypes.find((item) => item.optionId === selectedOptionId);
  const availablePurposes = useMemo(() => {
    if (!selected) return [];
    return getPurposesForDocumentType(selected.type, selected.category);
  }, [selected]);
  const summaryRequest = myRequests.find((item) => item.id === summaryRequestId) ?? null;
  const selectedDoc = myDocs.find((item) => item.id === selectedDocId) ?? myDocs[0] ?? null;

  const isBusinessDoc = useMemo(() => {
    const combined = `${selectedCategory} ${selected?.type || ''}`.toLowerCase();
    return combined.includes('business') || combined.includes('negosyo');
  }, [selectedCategory, selected]);

  const isSiteLocationDoc = useMemo(() => {
    const combined = `${selectedCategory} ${selected?.type || ''}`.toLowerCase();
    return (
      combined.includes('construction') ||
      combined.includes('transient') ||
      combined.includes('delivery') ||
      combined.includes('hauling') ||
      combined.includes('commercial') ||
      combined.includes('pagpapatayo') ||
      combined.includes('renovation') ||
      combined.includes('demolition') ||
      combined.includes('excavation') ||
      combined.includes('fencing')
    );
  }, [selectedCategory, selected]);

  const isLuponDoc = useMemo(() => {
    const combined = `${selectedCategory} ${selected?.type || ''}`.toLowerCase();
    return (
      combined.includes('lupon') ||
      combined.includes('patawag') ||
      combined.includes('summons') ||
      combined.includes('cfa') ||
      combined.includes('hearing') ||
      combined.includes('notice')
    );
  }, [selectedCategory, selected]);

  const submitConfirmedRequest = async () => {
    if (!selected) return;

    const extraDetails: string[] = [];
    if (isBusinessDoc) {
      if (businessName.trim()) extraDetails.push(`Business Name: ${businessName.trim()}`);
      if (businessAddress.trim()) extraDetails.push(`Business Address: ${businessAddress.trim()}`);
    }
    if (isSiteLocationDoc) {
      if (addWhere.trim()) extraDetails.push(`Project Location: ${addWhere.trim()}`);
    }
    if (isLuponDoc) {
      if (complainantName.trim()) extraDetails.push(`Complainant Name: ${complainantName.trim()}`);
      if (respondentName.trim()) extraDetails.push(`Respondent Name: ${respondentName.trim()}`);
    }

    let composedPurpose = purpose.trim();
    if (extraDetails.length > 0) {
      composedPurpose = `${composedPurpose ? `${composedPurpose}\n\n` : ''}[Additional Details]\n${extraDetails.join('\n')}`;
    }

    if (isRequestingForSomeone) {
      composedPurpose = `${composedPurpose ? `${composedPurpose}\n\n` : ''}[Requested For Someone Else]\nFull Name: ${proxyDetails.fullName}\nDate of Birth: ${proxyDetails.birthDate}\nAddress: ${proxyDetails.address}\nContact Number: ${proxyDetails.contactNumber}\nRelationship: ${proxyDetails.relationship}`;
    }

    setConfirmSubmitOpen(false);
    setIsSubmitting(true);
    try {
      const result = await submitDocumentRequest({
        typeId: selected.backendId,
        purpose: composedPurpose,
        selectedTypeLabel: selected.type,
      });
      if (!result.ok) {
        setFeedback({
          tone: 'error',
          text: locale === 'fil' ? `Hindi naipadala ang kahilingan: ${result.error}` : `We couldn't submit your request: ${result.error}`,
        });
        return;
      }

      const successMessage =
        locale === 'fil'
          ? `Naipadala na ang kahilingan ${result.data.request.referenceNumber}. Mangyaring maghintay ng approval. Makikita mo ang updates sa portal at email kapag handa na ang dokumento.`
          : `Request ${result.data.request.referenceNumber} has been submitted. Please wait for approval. Updates will appear in the portal and by email when the document is ready.`;

      setPurpose('');
      setBusinessName('');
      setBusinessAddress('');
      setAddWhere('');
      setRespondentName('');
      setComplainantName('');
      setAttachmentFiles([]);
      setAttachmentError(null);
      setIsRequestingForSomeone(false);
      setProxyDetails({
        fullName: '',
        birthDate: '',
        address: '',
        contactNumber: '',
        relationship: '',
        consentChecked: false,
      });
      window.localStorage.removeItem(DRAFT_KEY);
      setSubmissionToast(successMessage);
      setActiveTab('active');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!summaryRequestId) return;

    setIsCancelling(true);
    try {
      await cancelPendingRequest(summaryRequestId);
      
      setSummaryRequestId(null);
      const successMessage = locale === 'fil'
        ? 'Matagumpay na kanselahin ang kahilingan.'
        : 'Request cancelled successfully.';

      setFeedback({
        tone: 'success',
        text: successMessage,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setFeedback({
        tone: 'error',
        text: locale === 'fil'
          ? `Ang pagkansela ng kahilingan ay nabigo: ${errorMsg}`
          : `Failed to cancel request: ${errorMsg}`,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (!selected) {
      setFeedback({
        tone: 'error',
        text: copyText(locale, 'Please choose a document type first.', 'Pumili muna ng uri ng dokumento.'),
      });
      return;
    }

    if (!purpose.trim()) {
      setFeedback({
        tone: 'error',
        text: copyText(locale, 'Please enter the purpose of request.', 'Pakilagay ang layunin ng kahilingan.'),
      });
      return;
    }

    if (isBusinessDoc) {
      if (!businessName.trim() || !businessAddress.trim()) {
        setFeedback({
          tone: 'error',
          text: copyText(
            locale,
            'Please complete the Business Name and Business Address fields.',
            'Pakiusap punan ang Pangalan ng Negosyo at Lokasyon ng Negosyo.'
          ),
        });
        return;
      }
    }

    if (isSiteLocationDoc) {
      if (!addWhere.trim()) {
        setFeedback({
          tone: 'error',
          text: copyText(
            locale,
            'Please specify the Project / Activity Site Location.',
            'Pakiusap ilagay ang lokasyon kung saan gaganapin ang proyekto o aktibidad.'
          ),
        });
        return;
      }
    }

    if (isLuponDoc) {
      if (!respondentName.trim()) {
        setFeedback({
          tone: 'error',
          text: copyText(
            locale,
            'Please specify the Respondent Full Name (Pangalan ng Inirereklamo).',
            'Pakiusap ilagay ang pangalan ng inirereklamo (Respondent Name).'
          ),
        });
        return;
      }
    }

    if (isRequestingForSomeone) {
      const missingProxyField =
        !proxyDetails.fullName.trim() ||
        !proxyDetails.birthDate ||
        !proxyDetails.address.trim() ||
        !proxyDetails.contactNumber.trim() ||
        !proxyDetails.relationship.trim();
      if (missingProxyField) {
        setFeedback({
          tone: 'error',
          text: copyText(
            locale,
            'Please complete all requestor details in the "Request for someone else" popup.',
            'Pakikumpleto ang lahat ng detalye sa popup na "Request for someone else".',
          ),
        });
        return;
      }

      if (!proxyDetails.consentChecked) {
        setFeedback({
          tone: 'error',
          text: copyText(
            locale,
            'Please confirm consent before submitting this request.',
            'Pakikumpirma muna ang consent bago isumite ang kahilingang ito.',
          ),
        });
        return;
      }
    }

    setConfirmSubmitOpen(true);
  };

  return (
    <ResidentShell title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {submissionToast ? (
        <div className="pointer-events-none fixed left-1/2 top-6 z-50 flex w-[min(92vw,760px)] -translate-x-1/2 justify-center">
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto w-full rounded-2xl border border-emerald-200/70 bg-[linear-gradient(145deg,#0f5132_0%,#146c43_100%)] px-4 py-3 text-emerald-50 shadow-[0_16px_36px_rgba(8,49,30,0.45)] backdrop-blur"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                ✓
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-5">
                  {copyText(locale, 'Request submitted successfully', 'Matagumpay na naipadala ang kahilingan')}
                </p>
                <p className="mt-1 text-sm leading-5 text-emerald-50/95">{submissionToast}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {pageCopy.guide ? (
        <PageGuide
          tone="resident"
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}
      <ResidentSection
        title={copyText(locale, 'Submit New Request', 'Magsumite ng Bagong Kahilingan')}
        description={copyText(locale, 'Drafts auto-save on this device while you complete details.', 'Awtomatikong nase-save ang draft sa device na ito habang kumukumpleto ng detalye.')}
        tone="accent"
      >
        <form className="grid gap-4 md:grid-cols-2 md:gap-5" onSubmit={onSubmit}>
          <div className="grid gap-4 text-sm md:col-span-2">
            <label className="grid gap-3">
              <span className="font-medium text-[color:#123726]">
                {copyText(locale, 'Step 1: Choose Document Type', 'Hakbang 1: Pumili ng Uri ng Dokumento')}
              </span>
              <Select
                value={currentCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                disabled={!categories.length}
                aria-label={copyText(locale, 'Document Type', 'Uri ng Dokumento')}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </label>

            <label className="grid gap-3">
              <span className="font-medium text-[color:#123726]">
                {copyText(locale, 'Step 2: Choose Purpose', 'Hakbang 2: Pumili ng Purpose')}
              </span>
              <Select
                value={selectedOptionId}
                onChange={(event) => {
                  setSelectedOptionId(event.target.value);
                  setHasChosenType(true);
                }}
                disabled={!currentTypes.length}
                aria-label={copyText(locale, 'Purpose', 'Purpose')}
              >
                {currentTypes.map((item) => (
                  <option key={item.optionId} value={item.optionId}>
                    {`For ${item.type}`}
                  </option>
                ))}
              </Select>
            </label>

            {hasChosenType && selected ? (
              <div className="rounded-xl border border-[color:#d2e5da] bg-white p-4 text-sm text-[color:#456453]">
                <p>
                  <span className="font-medium text-[color:#123726]">{copyText(locale, 'Selected', 'Napili')}:</span>{' '}
                  {selected.type}
                </p>
                <p>
                  <span className="font-medium text-[color:#123726]">{copyText(locale, 'Price', 'Presyo')}:</span>{' '}
                  {selected.price === 0 ? copyText(locale, 'Free', 'Libre') : `P${selected.price}`}
                </p>
                {selected.pricing_note ? (
                  <p>
                    <span className="font-medium text-[color:#123726]">{copyText(locale, 'Pricing note', 'Paalala sa presyo')}:</span>{' '}
                    {selected.pricing_note}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <label className="grid gap-3 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Purpose / Notes *', 'Layunin / Mga Tala *')}</span>
            <Textarea
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder={copyText(
                locale,
                'Select a suggested purpose below or type your specific request reason...',
                'Pumili sa mga mungkahing layunin sa ibaba o i-type ang iyong partikular na dahilan...',
              )}
              className="min-h-[110px]"
              required
              aria-describedby="document-purpose-help"
            />
            {availablePurposes.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[color:#123726] shrink-0">
                  {copyText(locale, 'Suggested Purposes:', 'Mga Mungkahing Layunin:')}
                </span>
                {availablePurposes.map((p) => {
                  const isSelected = purpose === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPurpose(p)}
                      className={`rounded-full px-2.5 py-1 text-xs transition-colors border cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-700 text-white border-emerald-800 font-semibold shadow-xs'
                          : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            )}
            <span id="document-purpose-help" className="text-xs leading-5 text-[color:#557968]">
              {copyText(
                locale,
                'Click any suggested option above or freely edit/type your specific purpose.',
                'I-click ang alinman sa mga opsyon sa itaas o malayang i-type ang iyong partikular na layunin.',
              )}
            </span>
          </label>

          {/* Conditional Additional Fields based on Document Category / Type */}
          {(isBusinessDoc || isSiteLocationDoc || isLuponDoc) && (
            <div className="grid gap-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                  {copyText(locale, 'Additional Required Information', 'Karagdagang Impormasyon para sa Dokumento')}
                </span>
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                  {isBusinessDoc
                    ? copyText(locale, 'Business Details', 'Mga Detalye ng Negosyo')
                    : isSiteLocationDoc
                    ? copyText(locale, 'Location Details', 'Detalye ng Lokasyon')
                    : copyText(locale, 'Lupon Case Details', 'Mga Detalye ng Kaso')}
                </span>
              </div>

              {isBusinessDoc && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <label className="grid gap-1.5 text-xs font-semibold text-[color:#123726]">
                    <span>{copyText(locale, 'Business / Establishment Name *', 'Pangalan ng Negosyo / Establishment Name *')}</span>
                    <Input
                      placeholder={copyText(locale, 'e.g. Progreso Sari-Sari Store', 'Hal. Progreso Sari-Sari Store')}
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                      className="bg-white text-xs h-9"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold text-[color:#123726]">
                    <span>{copyText(locale, 'Business Address / Location *', 'Lokasyon o Tirahan ng Negosyo (Business Address) *')}</span>
                    <Input
                      placeholder={copyText(locale, 'e.g. #123 M. Cruz St., Barangay Progreso', 'Hal. #123 M. Cruz St., Barangay Progreso')}
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      required
                      className="bg-white text-xs h-9"
                    />
                  </label>
                </div>
              )}

              {isSiteLocationDoc && (
                <label className="grid gap-1.5 text-xs font-semibold text-[color:#123726] pt-1">
                  <span>{copyText(locale, 'Project / Activity Site Location (Kung saan gaganapin) *', 'Lokasyon kung saan gaganapin ang aktibidad o proyekto *')}</span>
                  <Input
                    placeholder={copyText(locale, 'e.g. Lot 4 Block 2, Progreso St., San Juan City', 'Hal. Lot 4 Block 2, Progreso St., San Juan City')}
                    value={addWhere}
                    onChange={(e) => setAddWhere(e.target.value)}
                    required
                    className="bg-white text-xs h-9"
                  />
                </label>
              )}

              {isLuponDoc && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <label className="grid gap-1.5 text-xs font-semibold text-[color:#123726]">
                    <span>{copyText(locale, 'Respondent Full Name (Inirereklamo) *', 'Pangalan ng Inirereklamo (Respondent) *')}</span>
                    <Input
                      placeholder={copyText(locale, 'e.g. Pedro Santos', 'Hal. Pedro Santos')}
                      value={respondentName}
                      onChange={(e) => setRespondentName(e.target.value)}
                      required
                      className="bg-white text-xs h-9"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold text-[color:#123726]">
                    <span>{copyText(locale, 'Complainant Full Name (Nagrereklamo)', 'Pangalan ng Nagrereklamo (Complainant)')}</span>
                    <Input
                      placeholder={user?.fullName || copyText(locale, 'Resident Full Name', 'Buong Pangalan ng Residente')}
                      value={complainantName}
                      onChange={(e) => setComplainantName(e.target.value)}
                      className="bg-white text-xs h-9"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          

          <div className="col-span-full flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="residentOutline"
              onClick={() => {
                setProxyModalOpen(true);
                setFeedback(null);
              }}
            >
              {copyText(locale, 'Request for someone else', 'Mag-request para sa ibang tao')}
            </Button>
            {isRequestingForSomeone ? (
              <p className="text-xs text-[color:#456453]">
                {copyText(locale, 'On behalf mode is active.', 'Aktibo ang on behalf mode.')}
              </p>
            ) : null}
            <Button
              type="submit"
              variant="resident"
              disabled={isSubmitting}
              className="min-w-[220px] px-6 text-base"
            >
              {isSubmitting
                ? copyText(locale, 'Submitting', 'Ipinapadala')
                : copyText(locale, 'Submit Request', 'Ipadala ang Kahilingan')}
            </Button>
          </div>
        </form>
        <div className="mt-5">
          <InfoNotice
            title={copyText(locale, 'Cancellation and status rules', 'Mga panuntunan sa cancellation at status')}
            description={copyText(
              locale,
              'Pending requests can be cancelled. Once approved, cancellation is disabled while staff prepares your document and sends status updates.',
              'Ang pending request lang ang puwedeng kanselahin. Kapag approved na, disabled na ang cancellation habang inihahanda ng staff ang dokumento at nagpapadala ng update.'
            )}
          />
        </div>

        {feedback && !proxyModalOpen ? <FormFeedback tone={feedback.tone} text={feedback.text} /> : null}
      </ResidentSection>

      <ResidentSection
        title={copyText(locale, 'Request Status', 'Katayuan ng Kahilingan')}
        className="hidden"
        description={copyText(
          locale,
          'Active requests are listed from most recent to least recent.',
          'Nakaayos ang active requests mula pinakabago hanggang pinakaluma.'
        )}
      >
        <div
          className="mb-4 flex flex-wrap gap-2 rounded-[var(--resident-radius-md)] border border-[color:var(--resident-border-soft)] bg-[color:#f6faf7] p-2"
          role="tablist"
          aria-label={copyText(locale, 'Document request views', 'Mga view ng document request')}
        >
          {[
            { id: 'active' as const, label: copyText(locale, 'Active Requests', 'Active Requests'), count: activeRequests.length },
            { id: 'history' as const, label: copyText(locale, 'Request History', 'Kasaysayan'), count: sortedHistory.length },
        
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                role="tab"
                aria-selected={isActive}
                aria-pressed={isActive}
                variant={isActive ? 'residentOutline' : 'ghost'}
                onClick={() => setActiveTab(tab.id)}
                className="relative gap-2 rounded-lg"
              >
                <span>{tab.label}</span>
                <span className="rounded-full border border-current/40 px-2 py-0.5 text-[11px] leading-none">{tab.count}</span>
                {isActive ? (
                  <span className="absolute bottom-[-8px] left-1/2 h-1 w-7 -translate-x-1/2 rounded-full bg-[color:#1b6b46]" aria-hidden />
                ) : null}
              </Button>
            );
          })}
        </div>
        {activeTab === 'docs' && feedback ? (
          <div className="mb-4">
            <FormFeedback tone={feedback.tone} text={feedback.text} />
          </div>
        ) : null}

        {activeTab === 'active' ? (
          !activeRequests.length ? (
            <ResidentEmpty
              title={copyText(locale, 'No active requests', 'Walang active requests')}
              description={copyText(
                locale,
                'Pending, approved, and ready for pickup requests will appear here.',
                'Lalabas dito ang pending, approved, at ready for pickup na mga kahilingan.'
              )}
            />
          ) : (
            <div className="grid gap-3">
              {activeRequests.map((item) => (
                <Card key={item.id} className="rounded-xl border-[color:#d2e5da] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[color:#123726]">{item.referenceNumber}</p>
                      <p className="mt-1 text-xs text-[color:#4f7361]">{item.typeLabel}</p>
                    </div>
                    <StatusBadge tone={statusToneFromState(item.status)}>
                      {getRequestStatusLabel(item.status, locale)}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 grid gap-1 text-xs text-[color:#557968] sm:grid-cols-2">
                    <p>
                      {copyText(locale, 'Requested', 'Hiniling')}: {formatDateTime(item.createdAt, locale)}
                    </p>
                    <p>
                      {copyText(locale, 'Updated', 'Na-update')}: {formatDateTime(item.updatedAt, locale)}
                    </p>
                  </div>
                  <p className="mt-3 rounded-lg border border-[color:#d2e5da] bg-[color:#f6faf7] px-3 py-2 text-xs text-[color:#365747]">
                    {getRequestNextStep(item.status, locale)}
                  </p>
                  <Button className="mt-3" variant="residentOutline" type="button" onClick={() => setSummaryRequestId(item.id)}>
                    {copyText(locale, 'Open summary', 'Buksan ang buod')}
                  </Button>
                </Card>
              ))}
            </div>
          )
        ) : null}

        {activeTab === 'history' ? (
          !sortedHistory.length ? (
            <ResidentEmpty
              title={copyText(locale, 'No request history yet', 'Wala pang kasaysayan')}
              description={copyText(locale, 'Your request updates will appear here once you submit.', 'Lalabas dito ang updates kapag may naisumite ka nang kahilingan.')}
            />
          ) : (
            <div className="grid gap-3">
              {sortedHistory.map((item) => (
                <Card key={item.id} className="rounded-xl border-[color:#d2e5da] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[color:#123726]">{item.referenceNumber}</p>
                      <p className="text-xs text-[color:#4f7361]">{item.typeLabel}</p>
                    </div>
                    <StatusBadge tone={statusToneFromState(item.status)}>
                      {getRequestStatusLabel(item.status, locale)}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-xs text-[color:#557968]">
                    {copyText(locale, 'Updated', 'Na-update')}: {formatDateTime(item.updatedAt, locale)}
                  </p>
                  <p className="mt-3 rounded-lg border border-[color:#d2e5da] bg-[color:#f6faf7] px-3 py-2 text-xs text-[color:#365747]">
                    {getRequestNextStep(item.status, locale)}
                  </p>
                  <Button className="mt-3" variant="residentOutline" type="button" onClick={() => setSummaryRequestId(item.id)}>
                    {copyText(locale, 'Open summary', 'Buksan ang buod')}
                  </Button>
                </Card>
              ))}
            </div>
          )
        ) : null}

        {activeTab === 'docs' ? (
          !myDocs.length ? (
            <ResidentEmpty
              title={copyText(locale, 'No generated documents yet', 'Wala pang generated documents')}
              description={copyText(locale, 'Approved and generated files will appear here.', 'Lalabas dito ang approved at generated files.')}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="grid gap-3">
                {myDocs.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`rounded-2xl border p-4 text-left ${
                      selectedDoc?.id === doc.id ? 'border-[color:#8fbeaa] bg-[color:#f4faf7]' : 'border-[color:#d2e5da] bg-white'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[color:#123726]">{doc.id}</p>
                    <p className="mt-1 text-xs text-[color:#4f7361]">{doc.documentType}</p>
                    <p className="mt-1 text-xs text-[color:#4f7361]">{doc.dateIssued}</p>
                  </button>
                ))}
              </div>

              {selectedDoc ? (
                <Card className="rounded-2xl border-[color:#9ecbb5] bg-[linear-gradient(180deg,#ffffff_0%,#f6fbf8_100%)] p-5">
                  <p className="text-xs uppercase tracking-[0.1em] text-[color:#4f7361]">{copyText(locale, 'Your document is ready', 'Ready na ang dokumento mo')}</p>
                  <p className="mt-2 text-xl font-semibold text-[color:#123726]">{selectedDoc.documentType}</p>
                  <p className="mt-2 text-sm leading-6 text-[color:#365747]">
                    {copyText(
                      locale,
                      'You can print this document or save it as PDF from the portal.',
                      'Puwede mong i-print ang dokumentong ito o i-save bilang PDF mula sa portal.',
                    )}
                  </p>
                  <div className="mt-4 grid gap-1 text-sm text-[color:#456453]">
                    <p>{copyText(locale, 'Reference', 'Reference')}: {selectedDoc.referenceNumber ?? selectedDoc.id}</p>
                    <p>{copyText(locale, 'Resident', 'Resident')}: {selectedDoc.residentName}</p>
                    <p>{copyText(locale, 'Date issued', 'Date issued')}: {selectedDoc.dateIssued}</p>
                    <p>{copyText(locale, 'Processed by', 'Pinroseso ni')}: {selectedDoc.processedBy}</p>
                    <p>{copyText(locale, 'Verification status', 'Verification status')}: {selectedDoc.verificationStatus}</p>
                    <p>{copyText(locale, 'Digital seal', 'Digital seal')}: {selectedDoc.digitalSeal ? copyText(locale, 'Applied', 'Applied') : copyText(locale, 'Not applied', 'Not applied')}</p>
                    <p>{copyText(locale, 'Authorized e-signature', 'Authorized e-signature')}: {selectedDoc.eSignatureName || '-'}</p>
                  </div>
                  <div className="mt-4 rounded-xl border border-[color:#d2e5da] bg-white p-3 text-xs text-[color:#4f7361]">
                    {copyText(
                      locale,
                      'If you need an official physical copy, bring a valid ID to the barangay office during office hours.',
                      'Kung kailangan mo ng opisyal na physical copy, magdala ng valid ID sa barangay office sa oras ng opisina.',
                    )}
                  </div>
                  <Button
                    className="mt-4"
                    type="button"
                    disabled={printingDocId === selectedDoc.id}
                    onClick={async () => {
                      setFeedback(null);
                      setPrintingDocId(selectedDoc.id);
                      const printWindow = window.open('', '_blank', 'width=980,height=1200');
                      if (!printWindow) {
                        setFeedback({
                          tone: 'error',
                          text: copyText(
                            locale,
                            'Your browser blocked the print window. Please allow pop-ups for this site and try again.',
                            'Na-block ng browser ang print window. Payagan ang pop-ups para sa site na ito at subukan muli.',
                          ),
                        });
                        setPrintingDocId(null);
                        return;
                      }
                      try {
                        printWindow.document.open();
                        printWindow.document.write('<p style="font-family:system-ui,sans-serif;padding:24px">Preparing printable document...</p>');
                        printWindow.document.close();
                        const session = await getSupabaseSessionSafely(getSupabaseBrowserClient());
                        const token = session.data.session?.access_token;
                        const response = await fetch(`/api/v1/generated-documents/${selectedDoc.id}/printable`, {
                          headers: token ? { authorization: `Bearer ${token}` } : {},
                        });
                        const payload = (await response.json().catch(() => null)) as
                          | { success: boolean; data?: { html: string }; error?: { message?: string } }
                          | null;
                        if (!response.ok || !payload?.success || !payload.data?.html) {
                          printWindow.close();
                          setFeedback({
                            tone: 'error',
                            text: copyText(
                              locale,
                              payload?.error?.message || 'Unable to load printable document. Please try again or contact the barangay office.',
                              payload?.error?.message || 'Hindi ma-load ang printable document. Subukan muli o makipag-ugnayan sa barangay office.',
                            ),
                          });
                          return;
                        }
                        const html = payload.data.html;
                        printWindow.document.open();
                        printWindow.document.write(html);
                        printWindow.document.close();
                        printWindow.focus();
                        printWindow.print();
                      } finally {
                        setPrintingDocId(null);
                      }
                    }}
                  >
                    {printingDocId === selectedDoc.id
                      ? copyText(locale, 'Preparing document...', 'Inihahanda ang dokumento...')
                      : copyText(locale, 'Print or Save PDF', 'I-print o i-save bilang PDF')}
                  </Button>
                </Card>
              ) : null}
            </div>
          )
        ) : null}
      </ResidentSection>
      {confirmSubmitOpen && selected ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[color:rgba(10,24,18,0.55)] p-4 overflow-hidden">
          <Card className="w-full max-w-[560px] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[var(--resident-radius-lg)] border-[color:var(--resident-border-soft)] p-5">
            <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--resident-ink-500)]">
              {copyText(locale, 'Confirm Request', 'Kumpirmahin ang Kahilingan')}
            </p>
            <p className="mt-2 text-base font-semibold text-[color:var(--resident-ink-900)]">
              {copyText(locale, 'Review details before submit', 'Suriin muna bago isumite')}
            </p>
            <div className="mt-4 grid gap-2 text-sm text-[color:var(--resident-ink-800)]">
              <p><span className="font-semibold">{copyText(locale, 'Document Type', 'Uri ng Dokumento')}:</span> {selected.category}</p>
              <p><span className="font-semibold">{copyText(locale, 'Type', 'Uri')}:</span> {selected.type}</p>
              <p><span className="font-semibold">{copyText(locale, 'Amount', 'Halaga')}:</span> {selected.price === 0 ? copyText(locale, 'Free', 'Libre') : `P${selected.price}`}</p>
              <p><span className="font-semibold">{copyText(locale, 'Notes', 'Mga Tala')}:</span> {purpose.trim() || '-'}</p>
              {isRequestingForSomeone ? (
                <>
                  <p><span className="font-semibold">{copyText(locale, 'Requested for', 'Hinihiling para kay')}:</span> {proxyDetails.fullName}</p>
                  <p><span className="font-semibold">{copyText(locale, 'Birth date', 'Petsa ng kapanganakan')}:</span> {proxyDetails.birthDate}</p>
                  <p><span className="font-semibold">{copyText(locale, 'Address', 'Address')}:</span> {proxyDetails.address}</p>
                  <p><span className="font-semibold">{copyText(locale, 'Contact number', 'Contact number')}:</span> {proxyDetails.contactNumber}</p>
                  <p><span className="font-semibold">{copyText(locale, 'Relationship', 'Relasyon')}:</span> {proxyDetails.relationship}</p>
                </>
              ) : null}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="residentOutline" onClick={() => setConfirmSubmitOpen(false)} disabled={isSubmitting}>
                {copyText(locale, 'Cancel', 'Kanselahin')}
              </Button>
              <Button type="button" disabled={isSubmitting} onClick={() => void submitConfirmedRequest()}
                className="w-full border border-[color:#14543a] bg-[linear-gradient(180deg,#1d7a53_0%,#155f40_100%)] text-white shadow-[0_10px_24px_rgba(21,95,64,0.28)] hover:bg-[linear-gradient(180deg,#176745_0%,#114f36_100%)] md:w-auto">
                {isSubmitting ? copyText(locale, 'Submitting', 'Ipinapadala') : copyText(locale, 'Confirm and submit', 'Kumpirmahin at ipadala')}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
      {proxyModalOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[color:rgba(10,24,18,0.55)] p-4 overflow-hidden">
          <Card className="w-full max-w-[640px] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[var(--resident-radius-lg)] border-[color:var(--resident-border-soft)] p-5">
            <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--resident-ink-500)]">
              {copyText(locale, 'On Behalf Request', 'Kahilingang On Behalf')}
            </p>
            <p className="mt-2 text-base font-semibold text-[color:var(--resident-ink-900)]">
              {copyText(locale, 'Enter details of the person you are requesting for', 'Ilagay ang detalye ng taong ipinagri-request mo')}
            </p>
            <p className="mt-2 rounded-xl border border-[color:#cfe2d7] bg-[color:#f2faf5] px-4 py-3 text-sm font-semibold leading-6 text-[color:#234a35] shadow-[0_1px_0_rgba(21,115,71,0.04)]">
              {copyText(
                locale,
                'Reminder: If someone else will claim the document, they must bring an authorization letter when picking it up.',
                'Paalala: Kung ibang tao ang kukuha ng dokumento, kailangan nilang magdala ng authorization letter sa pagkuha.'
              )}
            </p>
            {feedback ? (
              <div className="mt-3">
                <FormFeedback tone={feedback.tone} text={feedback.text} />
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <label className="grid gap-2">
                <span>{copyText(locale, 'Full Name', 'Buong Pangalan')}</span>
                <input
                  value={proxyDetails.fullName}
                  onChange={(event) => setProxyDetails((prev) => ({ ...prev, fullName: event.target.value }))}
                  className="h-10 rounded-lg border border-[color:#cddfd3] px-3"
                />
              </label>
              <label className="grid gap-2">
                <span>{copyText(locale, 'Date of Birth', 'Petsa ng Kapanganakan')}</span>
                <input
                  type="date"
                  value={proxyDetails.birthDate}
                  onChange={(event) => setProxyDetails((prev) => ({ ...prev, birthDate: event.target.value }))}
                  className="h-10 rounded-lg border border-[color:#cddfd3] px-3"
                />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span>{copyText(locale, 'Address', 'Address')}</span>
                <input
                  value={proxyDetails.address}
                  onChange={(event) => setProxyDetails((prev) => ({ ...prev, address: event.target.value }))}
                  className="h-10 rounded-lg border border-[color:#cddfd3] px-3"
                />
              </label>
              <label className="grid gap-2">
                <span>{copyText(locale, 'Contact Number', 'Contact Number')}</span>
                <input
                  value={proxyDetails.contactNumber}
                  onChange={(event) => setProxyDetails((prev) => ({ ...prev, contactNumber: event.target.value }))}
                  className="h-10 rounded-lg border border-[color:#cddfd3] px-3"
                />
              </label>
              <label className="grid gap-2">
                <span>{copyText(locale, 'Relationship', 'Relasyon')}</span>
                <input
                  placeholder={copyText(locale, 'e.g. family, relative, neighbor', 'hal. pamilya, kamag-anak, kapitbahay')}
                  value={proxyDetails.relationship}
                  onChange={(event) => setProxyDetails((prev) => ({ ...prev, relationship: event.target.value }))}
                  className="h-10 rounded-lg border border-[color:#cddfd3] px-3"
                />
              </label>
            </div>
            <label className="mt-4 flex items-start gap-2 rounded-lg border border-[color:#dce9e2] bg-[color:#f7fbf9] p-3 text-sm text-[color:#365747]">
              <input
                type="checkbox"
                checked={proxyDetails.consentChecked}
                onChange={(event) => setProxyDetails((prev) => ({ ...prev, consentChecked: event.target.checked }))}
                className="mt-1"
              />
              <span>
                {copyText(
                  locale,
                  'I hereby confirm that I have consent from this person to request this document on their behalf and that details provided are accurate.',
                  'Kinukumpirma ko na may pahintulot ako mula sa taong ito upang mag-request ng dokumento para sa kanya at tama ang ibinigay na detalye.',
                )}
              </span>
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="residentOutline" onClick={() => {
                setProxyModalOpen(false);
                setFeedback(null);
              }}>
                {copyText(locale, 'Cancel', 'Kanselahin')}
              </Button>
              <Button
                type="button"
                variant="resident"
                onClick={() => {
                  const hasRequired =
                    proxyDetails.fullName.trim() &&
                    proxyDetails.birthDate &&
                    proxyDetails.address.trim() &&
                    proxyDetails.contactNumber.trim() &&
                    proxyDetails.relationship.trim();
                  if (!hasRequired) {
                    setFeedback({
                      tone: 'error',
                      text: copyText(locale, 'Please complete all fields first.', 'Pakikumpleto muna ang lahat ng field.'),
                    });
                    return;
                  }
                  setFeedback(null);
                  setIsRequestingForSomeone(true);
                  setProxyModalOpen(false);
                }}
              >
                {copyText(locale, 'Save and use this info', 'I-save at gamitin ang impormasyong ito')}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
      <DocumentRequestSummaryModal
        open={Boolean(summaryRequest)}
        requestItem={summaryRequest}
        locale={locale}
        onClose={() => setSummaryRequestId(null)}
        onCancel={handleCancelRequest}
        isCancelling={isCancelling}
      />
    </ResidentShell>
  );
                  <p className="rounded-xl border border-[color:#cfe2d7] bg-[color:#f2faf5] px-4 py-3 text-sm font-semibold leading-6 text-[color:#234a35] shadow-[0_1px_0_rgba(21,115,71,0.04)]">
                    {copyText(
                      locale,
                      'Reminder: the person claiming this document must present an authorization letter.',
                      'Paalala: ang taong kukuha ng dokumentong ito ay kailangang magpakita ng authorization letter.'
                    )}
                  </p>
}

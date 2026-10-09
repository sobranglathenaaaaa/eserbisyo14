'use client';

import { useMemo, useState } from 'react';
import { Eye, Printer, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { getRequestStatusLabel } from '@/lib/formatters';
import { extractAdditionalDetails, getRequestedPersonDetails } from '@/lib/documents/request-template-fields';
import { getBarangayOfficialSettings } from '@/lib/documents/barangay-settings';
import { stripPriceFromPurpose } from '@/lib/documents/official-template-builder';
import type { DocumentRequest, DocumentTemplate, User } from '@/lib/types/models';

function underlinePreviewValue(value: string, minWidth = 'auto') {
  const widthStyle = minWidth === 'auto' ? '' : `width:${minWidth};`;
  return `<span style="display:inline-block;${widthStyle}min-width:${minWidth === 'auto' ? '0' : '0'};box-sizing:border-box;text-align:center;font-weight:bold;border-bottom:1.5px solid #000;line-height:1.35;padding:0 8px 2px;text-decoration:none;vertical-align:middle;">${value || '&nbsp;'}</span>`;
}

function getBusinessClassification(requestedLabel: string, purpose: string) {
  const combined = `${requestedLabel} ${purpose}`.toLowerCase();
  if (combined.includes('renewal') || combined.includes('renew')) return 'FOR: BUSINESS CLEARANCE RENEWAL - EXISTING ENTERPRISE';
  if (combined.includes('large') || combined.includes('corporate')) return 'FOR: LARGE ENTERPRISE / CORPORATE BUSINESS';
  if (combined.includes('medium')) return 'FOR: MEDIUM ENTERPRISE';
  if (combined.includes('micro') || combined.includes('small')) return 'FOR: MICRO / SMALL ENTERPRISE';
  return 'FOR: BUSINESS ENTERPRISE';
}

function getBusinessOperationWording(requestedLabel: string, purpose: string) {
  const combined = `${requestedLabel} ${purpose}`.toLowerCase();
  if (combined.includes('large') || combined.includes('corporate')) {
    return 'This clearance specifically covers the operation of the large business enterprise.';
  }
  if (combined.includes('medium')) {
    return 'This clearance specifically covers the operation of the medium business enterprise.';
  }
  if (combined.includes('micro') || combined.includes('small')) {
    return 'This clearance specifically covers the operation of the micro or small business enterprise.';
  }
  return 'This clearance specifically covers the operation of the business enterprise.';
}

function getDocumentPurpose(request: DocumentRequest, fallbackPurpose: string) {
  const requestedLabel = (request.selectedTypeLabel || request.typeLabel || '').trim();
  const purposeFromType = requestedLabel
    .replace(/^barangay\s+(?:certification|clearance)\s*[-:]\s*/i, '')
    .trim();
  const genericLabels = new Set([
    'barangay certification',
    'barangay certification (general)',
    'barangay clearance',
    'barangay certification / clearance',
  ]);

  if (purposeFromType && !genericLabels.has(purposeFromType.toLowerCase())) {
    return stripPriceFromPurpose(purposeFromType);
  }

  return stripPriceFromPurpose(fallbackPurpose.split(/\n\s*\n|\[Additional Details\]/i)[0]) || 'Official legal requirements';
}

interface DocumentRequestPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: DocumentRequest | null;
  resident?: User | null;
  fieldDraft?: Record<string, string>;
  documentTemplates?: DocumentTemplate[];
  onMarkReadyForPickup?: () => Promise<void> | void;
  isMarkingReady?: boolean;
  locale?: 'en' | 'fil';
}

export default function DocumentRequestPreviewModal({
  open,
  onOpenChange,
  request,
  resident,
  fieldDraft = {},
  documentTemplates = [],
  onMarkReadyForPickup,
  isMarkingReady = false,
  locale = 'fil',
}: DocumentRequestPreviewModalProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  // Normalize document type key
  const docTypeKey = useMemo(() => {
    if (!request) return 'barangay_certification';
    const requestedLabel = (request.selectedTypeLabel || request.typeLabel || '').toLowerCase();
    const category = (request.category || '').toLowerCase();
    const purpose = (request.purpose || '').toLowerCase();
    const isGenericBarangayCertification =
      requestedLabel === 'barangay certification' ||
      requestedLabel === 'barangay certification (general)' ||
      requestedLabel === 'barangay clearance' ||
      requestedLabel === 'barangay certification / clearance';
    // The selected document type is authoritative. Only use the purpose to
    // resolve a subtype when the request itself is the generic certification.
    const combined = isGenericBarangayCertification
      ? `${requestedLabel} ${category} ${purpose}`
      : `${requestedLabel} ${category}`;

    // 2. Transient Employees & Worker Certification
    if (
      combined.includes('transient') ||
      combined.includes('worker') ||
      combined.includes('kasambahay') ||
      combined.includes('household') ||
      combined.includes('caretaker') ||
      combined.includes('company employee')
    ) {
      return 'transient_employees';
    }

    // 3. Lupon Summons / KP Form / CFA / Reconciliation Notice
    if (
      combined.includes('lupon') ||
      combined.includes('summons') ||
      combined.includes('patawag') ||
      combined.includes('tagapamayapa') ||
      combined.includes('certificate to file action') ||
      combined.includes('cfa') ||
      combined.includes('barangay case') ||
      combined.includes('reconciliation') ||
      combined.includes('hearing notice') ||
      combined.includes('notice of hearing') ||
      combined.includes('abiso')
    ) {
      if (
        combined.includes('cfa') ||
        combined.includes('certificate to file action') ||
        combined.includes('file action') ||
        combined.includes('makadulog') ||
        combined.includes('kp form #20') ||
        combined.includes('kp form 20')
      ) {
        return 'lupon_cfa';
      }
      if (
        combined.includes('reconciliation') ||
        combined.includes('hearing notice') ||
        combined.includes('notice of hearing') ||
        combined.includes('abiso') ||
        combined.includes('conciliation') ||
        combined.includes('kp form #8') ||
        combined.includes('kp form 8') ||
        combined.includes('kp form #10') ||
        combined.includes('kp form 10')
      ) {
        return 'lupon_notice';
      }
      return 'lupon_summons';
    }

    // 4. Business Clearance
    if (
      combined.includes('business') ||
      combined.includes('negosyo') ||
      combined.includes('micro business') ||
      combined.includes('small business')
    ) {
      return 'business_clearance';
    }

    // 5. Construction / Building / Renovation / Excavation / Demolition
    if (
      combined.includes('construction') ||
      combined.includes('building') ||
      combined.includes('occupancy') ||
      combined.includes('renovation') ||
      combined.includes('expansion') ||
      combined.includes('fencing') ||
      combined.includes('excavation') ||
      combined.includes('demolition') ||
      combined.includes('pagpapatayo')
    ) {
      return 'construction_clearances';
    }

    // 6. Delivery & Hauling Clearance
    if (
      combined.includes('hauling') ||
      combined.includes('debris') ||
      combined.includes('concrete mix') ||
      combined.includes('cement pouring') ||
      combined.includes('delivery of') ||
      combined.includes('panambak') ||
      combined.includes('filling materials')
    ) {
      return 'delivery_hauling_clearances';
    }

    // 7. Special & Commercial Permits
    if (
      combined.includes('special') ||
      combined.includes('commercial') ||
      combined.includes('shooting') ||
      combined.includes('movie') ||
      combined.includes('flyer') ||
      combined.includes('sampler') ||
      combined.includes('wire') ||
      combined.includes('cable')
    ) {
      return 'special_commercial_permits';
    }

    // 1. Indigency / Financial Assistance / Medical Assistance
    if (
      combined.includes('indigency') ||
      combined.includes('financial assistance') ||
      combined.includes('medical assistance') ||
      combined.includes('educational assistance') ||
      combined.includes('burial assistance')
    ) {
      return 'certificate_indigency';
    }

    // Certificate of Residency
    if (
      combined.includes('residency') ||
      combined.includes('paninirahan') ||
      combined.includes('tirahan') ||
      combined.includes('proof of address')
    ) {
      return 'certificate_residency';
    }

    // Good Moral Character
    if (
      combined.includes('good moral') ||
      combined.includes('mabuting asal') ||
      combined.includes('moral character')
    ) {
      return 'good_moral';
    }

    // 1. Default Barangay Certification
    return 'barangay_certification';
  }, [request]);

  // Extract resident values
  const requestedPerson = getRequestedPersonDetails(request?.purpose);
  const residentName =
    requestedPerson.fullName || fieldDraft.residentName || resident?.fullName || request?.residentName || 'N/A';
  const residentAddress =
    requestedPerson.address ||
    fieldDraft.address ||
    fieldDraft.residenceAddress ||
    resident?.address ||
    resident?.addressLine ||
    'Barangay Progreso, San Juan City';
  const addWhere =
    fieldDraft.add_where ||
    fieldDraft.addWhere ||
    fieldDraft.location ||
    fieldDraft.projectLocation ||
    fieldDraft.site_address ||
    fieldDraft.siteAddress ||
    (request as Record<string, unknown> | null)?.add_where as string ||
    (request as Record<string, unknown> | null)?.location as string ||
    (request as Record<string, unknown> | null)?.projectLocation as string ||
    residentAddress;
  const rawPurpose = fieldDraft.purpose || fieldDraft.reasonText || request?.purpose || request?.typeLabel || 'Official legal requirements';
  const purpose = request ? getDocumentPurpose(request, rawPurpose) : 'Official legal requirements';
  const additionalDetails = extractAdditionalDetails(request?.purpose);
  const businessName =
    fieldDraft.businessName ||
    fieldDraft.business_name ||
    additionalDetails.businessName ||
    '';
  const businessAddress =
    fieldDraft.businessAddress ||
    fieldDraft.business_address ||
    additionalDetails.businessAddress ||
    residentAddress;
  const dateIssued =
    fieldDraft.issuedDate ||
    fieldDraft.dateIssued ||
    new Date().toLocaleDateString(locale === 'fil' ? 'fil-PH' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  // Dynamic preview HTML
  const previewHtml = useMemo(() => {
    if (!request) return '';

    const settings = getBarangayOfficialSettings();

    const barangayLogoHtml = `<img src="${settings.barangayLogoUrl}" style="height:60px;width:60px;object-fit:contain;" alt="Barangay Seal" />`;
    const cityLogoHtml = `<img src="${settings.cityLogoUrl}" style="height:60px;width:60px;object-fit:contain;" alt="City Seal" />`;
    const countryLogoHtml = `<img src="${settings.countryLogoUrl}" style="height:55px;width:68px;object-fit:contain;" alt="Bagong Pilipinas Seal" />`;

    const kagawadListHtml = settings.kagawadList
      .map(
        (k) =>
          `<div style="margin-bottom:7px;"><p style="font-size:14px;font-weight:bold;margin:0;color:#000;line-height:1.25;">${k.name}</p>${k.committee ? `<p style="font-size:12px;font-style:italic;margin:2px 0 0 0;color:#333;line-height:1.2;">${k.committee}</p>` : ''}</div>`
      )
      .join('');

    const headerHtml = `
<div style="text-align:center;margin-bottom:8px;">
  <div style="display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:6px;">
    ${barangayLogoHtml}
    ${cityLogoHtml}
    ${countryLogoHtml}
  </div>
  <p style="font-family:Georgia,serif;font-size:13px;font-weight:bold;font-style:italic;text-transform:uppercase;color:#4f6e34;margin:0;letter-spacing:0.5px;">REPUBLIC OF THE PHILIPPINES</p>
  <p style="font-family:Georgia,serif;font-size:12px;font-style:italic;color:#4f6e34;margin:1px 0;">${settings.cityName}</p>
  <p style="font-family:Georgia,serif;font-size:14px;font-weight:bold;font-style:italic;text-transform:uppercase;color:#4f6e34;margin:0;">${settings.barangayName}</p>
  <p style="font-family:Georgia,serif;font-size:11px;font-weight:bold;font-style:italic;text-transform:uppercase;color:#4f6e34;margin:2px 0 0 0;">OFFICE OF THE PUNONG BARANGAY</p>
</div>
`;

    const dynamicWatermarkHtml = `<img src="${settings.watermarkLogoUrl || settings.barangayLogoUrl}" class="doc-watermark" style="position:absolute;left:50%;top:50%;width:560px;max-width:88%;transform:translate(-50%, -50%);opacity:0.12;filter:contrast(115%);pointer-events:none;z-index:1;user-select:none;-webkit-user-select:none;" alt="Barangay Seal Watermark" />`;

    const currentDocKey = docTypeKey as string;
    const isBusinessPreview = currentDocKey === 'business_clearance' || currentDocKey === 'business_permit';
    const isLuponType =
      currentDocKey === 'lupon_cfa' ||
      currentDocKey === 'lupon_notice' ||
      currentDocKey === 'lupon_summons' ||
      currentDocKey === 'lupon_tagapamayapa';

    const reqTypeLabelLower = (request.selectedTypeLabel || request.typeLabel || '').trim().toLowerCase();
    const purposeLower = purpose.toLowerCase();
    const businessClassification = getBusinessClassification(reqTypeLabelLower, purposeLower);
    const purposeFamilies = [
      ['indigency', 'financial assistance', 'medical assistance', 'educational assistance', 'burial assistance', 'tulong'],
      ['residency', 'proof of address', 'paninirahan', 'tirahan'],
      ['good moral', 'moral character', 'mabuting asal'],
      ['employment', 'employer', 'trabaho'],
      ['school', 'student', 'education'],
      ['business', 'negosyo', 'commercial'],
    ];
    const requestPurposeFamily = purposeFamilies.find((family) =>
      family.some((term) => purposeLower.includes(term)),
    );
    const matchingCustomTemplate = (documentTemplates || [])
      .slice()
      .sort((a, b) => {
        const score = (template: DocumentTemplate) => {
          const nameLower = (template.name || '').trim().toLowerCase();
          const docTypeLower = (template.documentType || '').trim().toLowerCase();
          const templateText = `${nameLower} ${template.body || ''} ${(template.htmlBody || '').toLowerCase()}`;
          const matchesPurposeFamily = requestPurposeFamily?.some((term) => templateText.includes(term)) ?? false;
          let result = 0;
          if (matchesPurposeFamily) result += 200;
          if (docTypeLower === currentDocKey) result += 100;
          if (template.id === request.typeId) result += 90;
          if (reqTypeLabelLower && nameLower === reqTypeLabelLower) result += 80;
          if (reqTypeLabelLower && (reqTypeLabelLower.includes(nameLower) || nameLower.includes(reqTypeLabelLower))) result += 40;
          return result;
        };
        return score(b) - score(a);
      })
      .find((t) => {
        const nameLower = (t.name || '').trim().toLowerCase();
        const docTypeLower = (t.documentType || '').trim().toLowerCase();

      // If it's a Lupon document request, make sure it matches the exact Lupon sub-type!
      if (isLuponType) {
        if (currentDocKey === 'lupon_cfa') {
          return (
            (t.id === request.typeId && (nameLower.includes('cfa') || nameLower.includes('file action') || docTypeLower.includes('cfa'))) ||
            nameLower.includes('cfa') ||
            nameLower.includes('certificate to file action') ||
            nameLower.includes('kp form #20') ||
            nameLower.includes('kp form 20') ||
            docTypeLower === 'lupon_cfa'
          );
        }
        if (currentDocKey === 'lupon_notice') {
          return (
            (t.id === request.typeId && (nameLower.includes('notice') || nameLower.includes('reconciliation') || nameLower.includes('abiso') || docTypeLower.includes('notice'))) ||
            nameLower.includes('reconciliation') ||
            nameLower.includes('notice of hearing') ||
            nameLower.includes('hearing notice') ||
            nameLower.includes('abiso') ||
            nameLower.includes('conciliation notice') ||
            nameLower.includes('kp form #8') ||
            nameLower.includes('kp form 8') ||
            docTypeLower === 'lupon_notice'
          );
        }
        if (currentDocKey === 'lupon_summons') {
          return (
            (t.id === request.typeId && (nameLower.includes('summons') || nameLower.includes('patawag') || docTypeLower.includes('summons'))) ||
            nameLower.includes('summons') ||
            nameLower.includes('patawag') ||
            nameLower.includes('kp form #9') ||
            nameLower.includes('kp form 9') ||
            docTypeLower === 'lupon_summons'
          );
        }
        return false;
      }

      if (t.documentType === currentDocKey) return true;
      if (reqTypeLabelLower && nameLower === reqTypeLabelLower) return true;
      const templateText = `${nameLower} ${t.body || ''} ${(t.htmlBody || '').toLowerCase()}`;
      if (requestPurposeFamily?.some((term) => templateText.includes(term))) return true;
      if (currentDocKey === 'certificate_indigency' && nameLower.includes('indigency')) return true;
      if (
        currentDocKey === 'barangay_certification' &&
        (nameLower === 'barangay certification (general)' || nameLower === 'barangay certification') &&
        !nameLower.includes('business') &&
        !nameLower.includes('indigency')
      ) return true;
      if (currentDocKey === 'transient_employees' && (nameLower.includes('transient') || nameLower.includes('worker'))) return true;
      if ((currentDocKey === 'business_clearance' || currentDocKey === 'business_permit') && (nameLower.includes('business') || nameLower.includes('negosyo'))) return true;
      if ((currentDocKey === 'construction_clearances' || currentDocKey === 'construction_permit') && (nameLower.includes('construction') || nameLower.includes('building') || nameLower.includes('renovation'))) return true;
      if (currentDocKey === 'delivery_hauling_clearances' && (nameLower.includes('delivery') || nameLower.includes('hauling') || nameLower.includes('debris'))) return true;
      if (currentDocKey === 'special_commercial_permits' && (nameLower.includes('special') || nameLower.includes('commercial') || nameLower.includes('shooting') || nameLower.includes('flyer'))) return true;
      if (currentDocKey === 'certificate_residency' && nameLower.includes('residency')) return true;
      if (currentDocKey === 'good_moral' && nameLower.includes('moral')) return true;
      return false;
      });

    if (matchingCustomTemplate && (matchingCustomTemplate.htmlBody || matchingCustomTemplate.body)) {
      let customHtml = matchingCustomTemplate.htmlBody || matchingCustomTemplate.body;
      const isLegacySidebar = customHtml.includes('doc-frame') || customHtml.includes('KAGAWAD:') || customHtml.includes('kagawad_list');
      // If this is a Lupon document, do NOT render the two-column kagawad sidebar layout even if an old template had it
      if (!isLuponType || !isLegacySidebar) {
        const metaMatch = customHtml.match(/<!-- TEMPLATE_META:([\s\S]*?) -->$/);
        if (metaMatch) {
          customHtml = customHtml.replace(/<!-- TEMPLATE_META:([\s\S]*?) -->$/, '').trim();
        }
        if (isBusinessPreview && isLegacySidebar) {
          let businessTitleSeen = false;
          customHtml = customHtml.replace(/BARANGAY BUSINESS CLEARANCE/gi, (match) => {
            if (businessTitleSeen) return '';
            businessTitleSeen = true;
            return match;
          });
          customHtml = `
<style>
  .doc-frame > div:last-child > div:first-child,
  .doc-frame > div:last-child > div:first-child p,
  .doc-frame > div:last-child > div:first-child h1,
  .doc-frame > div:last-child > div:first-child h2,
  .doc-frame > div:last-child > div:first-child h3 {
    text-align: center !important;
  }
</style>
${customHtml}`;
        }
        if (customHtml.includes('{{') || customHtml.includes('<div') || customHtml.includes('<p')) {
          let rendered = customHtml;
          rendered = rendered.replaceAll('{{resident_name}}', underlinePreviewValue(residentName));
          rendered = rendered.replaceAll('{{resident_address}}', underlinePreviewValue(residentAddress));
          rendered = rendered.replaceAll('{{business_name}}', underlinePreviewValue(businessName, '280px'));
          rendered = rendered.replaceAll('{{business_address}}', underlinePreviewValue(businessAddress, '360px'));
          rendered = rendered.replaceAll('{{business_classification}}', businessClassification);
          rendered = rendered.replaceAll('{{add_where}}', underlinePreviewValue(addWhere));
          rendered = rendered.replaceAll('{{addWhere}}', underlinePreviewValue(addWhere));
          rendered = rendered.replaceAll('{{location}}', underlinePreviewValue(addWhere));
          rendered = rendered.replaceAll('{{site_address}}', underlinePreviewValue(addWhere));
          rendered = rendered.replaceAll('{{project_location}}', underlinePreviewValue(addWhere));
          const d = fieldDraft.issuedDate || fieldDraft.dateIssued ? new Date(fieldDraft.issuedDate || fieldDraft.dateIssued) : new Date();
          const validD = isNaN(d.getTime()) ? new Date() : d;
          const dayN = validD.getDate();
          const daySuff = ['th', 'st', 'nd', 'rd'][(dayN % 10 > 3 || Math.floor((dayN % 100) / 10) === 1) ? 0 : dayN % 10];
          const fDay = `${dayN}${daySuff}`;
          const fMonth = validD.toLocaleString('en-US', { month: 'long' });
          const fYear = String(validD.getFullYear());
          const fDateIssued = `${fDay} day of ${fMonth}, ${fYear}`;

          rendered = rendered.replaceAll('{{purpose}}', underlinePreviewValue(purpose));
          rendered = rendered.replaceAll('{{date_issued}}', underlinePreviewValue(fDateIssued));
          rendered = rendered.replaceAll('{{day}}', underlinePreviewValue(fDay));
          rendered = rendered.replaceAll('{{month}}', underlinePreviewValue(fMonth));
          rendered = rendered.replaceAll('{{year}}', underlinePreviewValue(fYear));
          rendered = rendered.replaceAll('{{dateIssued}}', underlinePreviewValue(fDateIssued));
          rendered = rendered.replaceAll('{{issuedDate}}', underlinePreviewValue(fDateIssued));
          rendered = rendered.replaceAll('{{reference_number}}', underlinePreviewValue(request.referenceNumber || ''));
          rendered = rendered.replaceAll('{{punong_barangay}}', settings.punongBarangay);
          rendered = rendered.replaceAll('{{barangay_secretary}}', settings.barangaySecretary);
          rendered = rendered.replaceAll('{{barangay_treasurer}}', settings.barangayTreasurer);
          rendered = rendered.replaceAll('{{kagawad_list}}', kagawadListHtml);
          rendered = rendered.replaceAll('{{barangay_name}}', settings.barangayName);
          rendered = rendered.replaceAll('{{city}}', settings.cityName);
          rendered = rendered.replaceAll('{{country_seal}}', countryLogoHtml);
          rendered = rendered.replaceAll('{{city_seal}}', cityLogoHtml);
          rendered = rendered.replaceAll('{{barangay_seal}}', barangayLogoHtml);
          rendered = rendered.replaceAll('{{barangay_watermark}}', dynamicWatermarkHtml);
          rendered = rendered.replaceAll('{{barangay_address}}', settings.barangayAddress);
          rendered = rendered.replaceAll('{{barangay_email}}', settings.barangayEmail);
          rendered = rendered.replaceAll('{{barangay_phone}}', settings.barangayPhone);
          rendered = rendered.replaceAll('{{official_seal}}', '<div style="display:inline-block;border:2px solid #1e3a8a;color:#1e3a8a;padding:4px 10px;border-radius:9999px;font-weight:bold;font-size:10px;">[ OFFICIAL BARANGAY SEAL ]</div>');
          rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');
          if (isBusinessPreview) {
            rendered = rendered.replace(
              /(?:\(\s*)?FOR:\s*(?:BUSINESS\s+CLEARANCE\s*(?:-\s*)?(?:RENEWAL|LARGE|MEDIUM|MICRO|SMALL)(?:\s+ENTERPRISE)?(?:\s*\/\s*CORPORATE\s+BUSINESS)?|BUSINESS\s+ENTERPRISE|LARGE\s+ENTERPRISE\s*\/\s*CORPORATE\s+BUSINESS|MEDIUM\s+ENTERPRISE|MICRO\s*\/\s*SMALL\s+ENTERPRISE|BUSINESS\s+CLEARANCE\s+RENEWAL\s*-\s*EXISTING\s+ENTERPRISE)(?:\s*\))?/gi,
              '',
            );
            rendered = rendered.replace(
              /This\s+clearance\s+specifically\s+covers\s+the\s+operation\s+of\s+[^<.\n]*(?:\.[^<]*)?/gi,
              getBusinessOperationWording(reqTypeLabelLower, purposeLower),
            );
            if (!/This\s+clearance\s+specifically\s+covers/i.test(rendered)) {
              rendered = rendered.replace(
                /(<\/div>\s*<\/div>\s*<\/div>\s*)/i,
                `$1<p style="font-size:14.5px;line-height:2.1;margin:28px 0 24px;text-align:center;">${getBusinessOperationWording(reqTypeLabelLower, purposeLower)}</p>`,
              );
            }
            rendered = rendered.replace(
              /(<\/h2>)/i,
              `$1<p style="text-align:center;font-size:13px;font-weight:bold;letter-spacing:0.6px;margin:0 0 16px 0;">${businessClassification}</p>`,
            );
          }
          return rendered;
        }
      }
    }

    let docTitleUpper = 'BARANGAY CLEARANCE';
    let bodyWordingHtml = '';

    switch (docTypeKey as string) {
      case 'transient_employees':
        docTitleUpper = 'TRANSIENT WORKER CERTIFICATION';
        bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">${residentName}</u> is an authorized transient worker / employee engaged at <u style="font-weight:bold;">${addWhere}</u> within the jurisdiction of ${settings.barangayName}, ${settings.cityName}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  RECORD CHECK IN THIS OFFICE SHOWS THAT THE ABOVE-NAMED INDIVIDUAL HAS NO DEROGATORY RECORD IN THIS BARANGAY AS OF THIS DATE.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:28px;text-align:justify;color:#000;">
  This certification is issued upon the request of <u style="font-weight:bold;">${residentName}</u> for <u style="font-weight:bold;">${purpose}</u>.
</p>
<p style="font-size:14.5px;margin-top:28px;margin-bottom:36px;color:#000;">
  Issued this <u style="font-weight:bold;">${dateIssued}</u>.
</p>
`;
        break;

      case 'delivery_hauling_clearances':
        docTitleUpper = 'DELIVERY & HAULING CLEARANCE';
        bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Barangay clearance is hereby granted to <u style="font-weight:bold;">${residentName}</u> (residing at ${residentAddress}) for delivery / hauling operations at <u style="font-weight:bold;">${addWhere}</u>, ${settings.barangayName}, ${settings.cityName}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This clearance covers hauling/transportation of materials/equipment as specified: <u style="font-weight:bold;">${purpose}</u>.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:28px;text-align:justify;color:#000;">
  Subject to adherence to barangay traffic, road safety, and waste disposal guidelines.
</p>
<p style="font-size:14.5px;margin-top:28px;margin-bottom:36px;color:#000;">
  Issued this <u style="font-weight:bold;">${dateIssued}</u>.
</p>
`;
        break;

      case 'special_commercial_permits':
        docTitleUpper = 'SPECIAL & COMMERCIAL PERMIT';
        bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Special barangay clearance/permit is hereby granted to <u style="font-weight:bold;">${residentName}</u> (residing at ${residentAddress}) for activity/operations at <u style="font-weight:bold;">${addWhere}</u>, ${settings.barangayName}, ${settings.cityName}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This permit is valid for the specific purpose of: <u style="font-weight:bold;">${purpose}</u>.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:28px;text-align:justify;color:#000;">
  Subject to compliance with public safety, noise regulations, and barangay ordinances.
</p>
<p style="font-size:14.5px;margin-top:28px;margin-bottom:36px;color:#000;">
  Issued this <u style="font-weight:bold;">${dateIssued}</u>.
</p>
`;
        break;

      case 'certificate_residency':
        docTitleUpper = 'CERTIFICATE OF RESIDENCY';
        bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">${residentName}</u> whose residence at <u style="font-weight:bold;">${residentAddress}</u> is a verified permanent resident of ${settings.barangayName}, ${settings.cityName}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  The barangay also certifies that he/she is a law-abiding citizen of good standing in this community.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:28px;text-align:justify;color:#000;">
  This certification is being issued upon the request of <u style="font-weight:bold;">${residentName}</u> for <u style="font-weight:bold;">${purpose}</u>.
</p>
<p style="font-size:14.5px;margin-top:28px;margin-bottom:36px;color:#000;">
  Issued this <u style="font-weight:bold;">${dateIssued}</u>.
</p>
`;
        break;

      case 'good_moral':
        docTitleUpper = 'CERTIFICATE OF GOOD MORAL CHARACTER';
        bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">${residentName}</u> residing at <u style="font-weight:bold;">${residentAddress}</u> is personally known to the undersigned officials of ${settings.barangayName}, ${settings.cityName} as a person of good moral character.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  He/She has no record of involvement in any unlawful activities in this barangay.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:28px;text-align:justify;color:#000;">
  This certification is being issued upon request for <u style="font-weight:bold;">${purpose}</u>.
</p>
<p style="font-size:14.5px;margin-top:28px;margin-bottom:36px;color:#000;">
  Issued this <u style="font-weight:bold;">${dateIssued}</u>.
</p>
`;
        break;

      case 'business_clearance':
      case 'business_permit':
        docTitleUpper = 'BARANGAY BUSINESS CLEARANCE';
        const businessClassification = getBusinessClassification(
          request.selectedTypeLabel || request.typeLabel || '',
          purpose,
        );
        const businessOperationWording = getBusinessOperationWording(
          request.selectedTypeLabel || request.typeLabel || '',
          purpose,
        );
        bodyWordingHtml = `
<div style="text-align:center;color:#000;margin:8px auto 0;max-width:680px;">
  <p style="font-size:13px;font-weight:bold;letter-spacing:0.6px;margin:0 0 16px;">${businessClassification}</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 10px;">
    is issued to
  </p>
  <p style="font-size:21px;line-height:1.35;font-weight:bold;text-decoration:underline;text-underline-offset:3px;margin:0 auto 4px;min-height:29px;">
    <span style="display:inline-block;width:280px;min-width:280px;box-sizing:border-box;text-align:center;border-bottom:1.5px solid #000;line-height:1.35;padding:0 8px 2px;">${businessName || '&nbsp;'}</span>
  </p>
  <p style="font-size:18px;line-height:1.5;margin:0 0 18px;">
    Name of Establishment
  </p>
  <p style="font-size:16px;line-height:1.5;margin:0 0 8px;">
    of
  </p>
  <p style="font-size:21px;line-height:1.35;font-weight:bold;text-decoration:underline;text-underline-offset:3px;margin:0 auto 4px;">
    <span style="display:inline-block;width:240px;min-width:240px;box-sizing:border-box;text-align:center;border-bottom:1.5px solid #000;line-height:1.35;padding:0 8px 2px;">${residentName || '&nbsp;'}</span>
  </p>
  <p style="font-size:18px;line-height:1.5;margin:0 0 22px;">
    Name of Owner
  </p>
  <p style="font-size:17px;line-height:1.5;font-weight:bold;margin:0 0 8px;">
    With postal address at
  </p>
  <p style="font-size:20px;line-height:1.35;font-weight:bold;text-decoration:underline;text-underline-offset:3px;margin:0 auto;min-height:28px;">
    <span style="display:inline-block;width:360px;min-width:360px;box-sizing:border-box;text-align:center;border-bottom:1.5px solid #000;line-height:1.35;padding:0 8px 2px;">${businessAddress || '&nbsp;'}</span>
  </p>
  <p style="font-size:14.5px;line-height:2.1;margin:28px 0 24px;text-align:center;">
    ${businessOperationWording}
  </p>
</div>
`;
        break;

      case 'construction_clearances':
      case 'construction_permit':
        docTitleUpper = 'BARANGAY CONSTRUCTION CLEARANCE';
        bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Barangay construction clearance is hereby granted to <u style="font-weight:bold;">${residentName}</u> (residing at ${residentAddress}) with project/construction site at <u style="font-weight:bold;">${addWhere}</u>, ${settings.barangayName}, ${settings.cityName}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This clearance covers the proposed construction, renovation, or building activities specified for: <u style="font-weight:bold;">${purpose}</u>.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:28px;text-align:justify;color:#000;">
  Subject to strict compliance with the National Building Code of the Philippines, environmental safety standards, and all existing barangay and municipal ordinances.
</p>
<p style="font-size:14.5px;margin-top:28px;margin-bottom:36px;color:#000;">
  Issued this <u style="font-weight:bold;">${dateIssued}</u>.
</p>
`;
        break;

      case 'lupon_tagapamayapa':
      case 'lupon_summons':
      case 'lupon_cfa':
      case 'lupon_notice': {
        const combined = `${request?.typeLabel || ''} ${request?.purpose || ''} ${request?.category || ''} ${request?.selectedTypeLabel || ''}`.toLowerCase();
        const isCfa = docTypeKey === 'lupon_cfa' || combined.includes('cfa') || combined.includes('certificate to file action') || combined.includes('makadulog') || combined.includes('kp form #20') || combined.includes('kp form 20');
        const isHearingNotice = !isCfa && (docTypeKey === 'lupon_notice' || combined.includes('reconciliation') || combined.includes('hearing notice') || combined.includes('notice of hearing') || combined.includes('abiso') || combined.includes('kp form #8') || combined.includes('kp form 8'));

        const complainants = fieldDraft.complainants || fieldDraft.complainantNames || residentName || 'Juan Dela Cruz';
        const respondents = fieldDraft.respondents || fieldDraft.respondentNames || 'Pedro Santos';
        const caseNumber = fieldDraft.barangayCaseNumber || fieldDraft.caseNumber || request?.referenceNumber || '2026-001';
        const complaintFor = fieldDraft.complaintFor || purpose || 'Mediation / Settlement of Dispute';
        const dateFiled = fieldDraft.dateFiled || dateIssued;

        let titleText = '= S U M M O N S =';
        let subtitleText = '(KP FORM #9 - PATAWAG)';
        if (isCfa) {
          titleText = 'CERTIFICATE TO FILE ACTION';
          subtitleText = '(KP FORM #20 - KATIBAYAN UPANG MAKADULOG SA HUKUMAN)';
        } else if (isHearingNotice) {
          titleText = 'NOTICE OF HEARING / RECONCILIATION NOTICE';
          subtitleText = '(KP FORM #8 - ABISO NG PAGDINIG)';
        }

        return `
<div style="font-family:'Times New Roman',Georgia,serif;color:#000;width:100%;max-width:840px;min-height:272mm;margin:0 auto;background:#fff;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;padding:4mm 8mm;position:relative;">
  ${dynamicWatermarkHtml}

  <!-- TOP 3-SEAL HEADER -->
  <div style="position:relative;z-index:2;">
    ${headerHtml}
  </div>

  <!-- CASE CAPTION & DETAILS (STANDARD KP COURT LAYOUT) -->
  <div style="position:relative;z-index:2;margin-top:16px;display:grid;grid-template-columns:1.2fr 1fr;gap:24px;font-size:14px;color:#000;">
    <!-- LEFT: COMPLAINANT VS RESPONDENT -->
    <div>
      <div style="border-bottom:1.5px solid #000;min-height:22px;font-weight:bold;font-size:14px;padding-bottom:2px;">
        ${complainants}
      </div>
      <div style="font-size:11.5px;color:#444;text-align:center;margin-top:2px;">Complainant/s</div>

      <div style="text-align:center;font-weight:bold;margin:8px 0;font-size:13px;letter-spacing:1px;">
        -against-
      </div>

      <div style="border-bottom:1.5px solid #000;min-height:22px;font-weight:bold;font-size:14px;padding-bottom:2px;">
        ${respondents}
      </div>
      <div style="font-size:11.5px;color:#444;text-align:center;margin-top:2px;">Respondent/s</div>
    </div>

    <!-- RIGHT: CASE NO, DATE FILED, FOR -->
    <div style="display:flex;flex-direction:column;gap:8px;font-size:13.5px;padding-left:12px;">
      <div style="display:flex;align-items:flex-end;gap:6px;">
        <span style="font-weight:bold;white-space:nowrap;">Barangay Case No.:</span>
        <span style="border-bottom:1.5px solid #000;flex:1;font-weight:bold;padding-bottom:1px;">${caseNumber}</span>
      </div>
      <div style="display:flex;align-items:flex-end;gap:6px;">
        <span style="font-weight:bold;white-space:nowrap;">Date Filed:</span>
        <span style="border-bottom:1.5px solid #000;flex:1;font-weight:bold;padding-bottom:1px;">${dateFiled}</span>
      </div>
      <div style="display:flex;align-items:flex-end;gap:6px;">
        <span style="font-weight:bold;white-space:nowrap;">For:</span>
        <span style="border-bottom:1.5px solid #000;flex:1;font-weight:bold;padding-bottom:1px;">${complaintFor}</span>
      </div>
    </div>
  </div>

  <!-- TITLE -->
  <div style="position:relative;z-index:2;text-align:center;margin:28px 0 20px 0;">
    <h2 style="font-size:22px;font-weight:800;letter-spacing:3px;margin:0;color:#000;text-transform:uppercase;">
      ${titleText}
    </h2>
    <p style="font-size:12px;font-weight:bold;color:#475569;margin:4px 0 0 0;text-transform:uppercase;letter-spacing:1px;">
      ${subtitleText}
    </p>
  </div>

  <!-- BODY CONTENT -->
  <div style="position:relative;z-index:2;font-size:14.5px;line-height:2.1;color:#000;">
    ${
      isCfa
        ? `
    <p style="font-weight:bold;margin-bottom:16px;">This is to certify that:</p>
    <ol style="margin:0 0 20px 24px;padding:0;line-height:2.0;text-align:justify;">
      <li style="margin-bottom:8px;">There has been a personal confrontation between the parties before the Punong Barangay / Lupon Tagapamayapa;</li>
      <li style="margin-bottom:8px;">A mediation/conciliation was attempted in good faith, but <strong>NO SETTLEMENT / CONCILIATION</strong> was reached;</li>
      <li style="margin-bottom:8px;">Therefore, the corresponding complaint for the above-entitled case may now be formally filed in Court (MTC/RTC) or Prosecutor's Office.</li>
    </ol>
    `
        : isHearingNotice
          ? `
    <div style="margin-bottom:16px;">
      <span style="font-weight:bold;">TO: </span>
      <span style="font-weight:bold;border-bottom:1.5px solid #000;display:inline-block;min-width:320px;">${complainants} & ${respondents}</span>
      <div style="font-size:11.5px;color:#444;margin-left:36px;">(Parties / Complainant and Respondent)</div>
    </div>

    <p style="text-indent:42px;margin-bottom:18px;text-align:justify;">
      You are hereby required to appear before the undersigned at the Barangay Hall on 
      <u style="font-weight:bold;">${dateIssued}</u> for a conciliation and mediation hearing of the above-entitled case.
    </p>

    <p style="text-indent:42px;margin-bottom:16px;text-align:justify;">
      Please be present promptly on the scheduled date and time with all your relevant supporting records, agreements, or witnesses.
    </p>
    `
          : `
    <div style="margin-bottom:16px;">
      <span style="font-weight:bold;">TO: </span>
      <span style="font-weight:bold;border-bottom:1.5px solid #000;display:inline-block;min-width:240px;">${respondents}</span>
      <div style="font-size:11.5px;color:#444;margin-left:36px;">Respondent/s</div>
    </div>

    <p style="text-indent:42px;margin-bottom:18px;text-align:justify;">
      You are hereby summoned to appear before me personally, together with your witnesses on 
      <u style="font-weight:bold;">${dateIssued}</u> at the Barangay Hall, then and there to answer to a complaint made before me, copy of which is attached hereto, for mediation/conciliation of your dispute with complainant/s.
    </p>

    <p style="text-indent:42px;margin-bottom:16px;text-align:justify;">
      You are hereby warned that if you refuse or willfully fail to appear in obedience to this summons, you may be barred from filing any counterclaim arising from said complaint.
    </p>

    <p style="font-weight:bold;margin-bottom:24px;">
      FAIL NOT or else face punishment as for contempt of court.
    </p>
    `
    }

    <p style="margin-top:20px;margin-bottom:42px;">
      Issued this <u style="font-weight:bold;">${dateIssued}</u>.
    </p>
  </div>

  <!-- SIGNATURE -->
  <div style="position:relative;z-index:2;display:flex;justify-content:flex-end;margin-top:auto;padding-bottom:16px;">
    <div style="text-align:center;min-width:260px;">
      <p style="font-size:15px;font-weight:bold;text-decoration:underline;margin:0;color:#000;text-transform:uppercase;">
        ${settings.punongBarangay}
      </p>
      <p style="font-size:12.5px;font-weight:bold;margin:3px 0 0 0;color:#000;">
        Punong Barangay / Lupon Chairman
      </p>
    </div>
  </div>

  <!-- FOOTER ADDRESS & CONTACT -->
  <div style="position:relative;z-index:2;text-align:center;margin-top:auto;padding-top:12px;border-top:1px solid #cbd5e1;font-size:11.5px;font-style:italic;color:#4f6e34;font-weight:bold;line-height:1.4;font-family:Georgia,serif;">
    <p style="margin:0;">${settings.barangayAddress}</p>
    <p style="margin:2px 0 0 0;">
      Email Address: <span style="text-decoration:underline;">${settings.barangayEmail}</span> | Telephone Nos. ${settings.barangayPhone}
    </p>
  </div>
</div>
`.trim();
      }

      case 'certificate_indigency':
        docTitleUpper = 'CERTIFICATE OF INDIGENCY';
        bodyWordingHtml = `
<p style="font-size:15.5px;line-height:2.1;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">${residentName}</u> whose residence at <u style="font-weight:bold;">${residentAddress}</u> is within the jurisdiction of ${settings.barangayName}, ${settings.cityName} and belongs to the indigent families of this barangay. The barangay also certifies that their daily income is barely enough to meet their day-to-day needs.
</p>
<p style="font-size:15.5px;line-height:2.1;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is being issued upon the request of Mr./Mrs./Ms. <u style="font-weight:bold;">${residentName}</u> for <u style="font-weight:bold;">${purpose}</u>.
</p>
<p style="font-size:15.5px;margin-top:26px;margin-bottom:32px;color:#000;text-align:center;">
  Issued this <u style="font-weight:bold;">${dateIssued}</u>.
</p>
`;
        break;

      case 'construction_clearance':
      case 'construction_clearances':
      case 'construction':
      case 'building_permit':
      case 'excavation_permit':
      case 'demolition_permit':
      case 'fencing_permit':
      case 'occupancy_permit':
        docTitleUpper = 'BARANGAY CLEARANCE';
        bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.0;margin-bottom:14px;text-align:justify;color:#000;">
  This is to certify that the Sangguniang Barangay of Progreso, ${settings.cityName} interposes no objection to the issuance of:
</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin-bottom:18px;font-size:13px;padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;">
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Mayor's Business Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Building Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Occupancy Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Excavation Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Demolition Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Renovation / Repair Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">✓</span> Construction Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Hauling Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Signage / Billboards Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Others (Asphalt Overlay)</div>
</div>
<p style="font-size:14px;font-weight:bold;margin-bottom:6px;">IN FAVOR OF:</p>
<p style="font-size:14px;margin-bottom:4px;margin-left:20px;">Name of Owner: <u style="font-weight:bold;">${residentName}</u></p>
<p style="font-size:14px;margin-bottom:16px;margin-left:20px;">Address of Owner: <u style="font-weight:bold;">${residentAddress}</u></p>
<p style="font-size:14px;line-height:2.0;text-indent:42px;margin-bottom:20px;text-align:justify;color:#000;">
  This Certification is being issued upon the request of the above-named applicant for the aforementioned purpose (<u style="font-weight:bold;">${purpose}</u>).
</p>
<p style="font-size:14px;margin-top:20px;margin-bottom:28px;color:#000;">
  Given this <u style="font-weight:bold;">${dateIssued}</u> at ${settings.barangayName}, ${settings.cityName}, Metro Manila.
</p>
`;
        break;

      case 'barangay_certificate':
      case 'barangay_certification':
      default:
        docTitleUpper = 'BARANGAY CERTIFICATION';
        bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">${residentName}</u> whose residence at <u style="font-weight:bold;">${residentAddress}</u> is within the jurisdiction of ${settings.barangayName}, ${settings.cityName}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  RECORD CHECK IN THIS OFFICE SHOWS THAT THE ABOVE-NAMED INDIVIDUAL HAS NO DEROGATORY AND/OR PENDING CRIMINAL RECORD FILED AGAINST HIM/HER AS OF THIS DATE.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:28px;text-align:justify;color:#000;">
  This certification is being issued upon the request of <u style="font-weight:bold;">${residentName}</u> for <u style="font-weight:bold;">${purpose}</u>.
</p>
<p style="font-size:14.5px;margin-top:28px;margin-bottom:36px;color:#000;">
  Issued this <u style="font-weight:bold;">${dateIssued}</u>.
</p>
`;
        break;
    }

    return `
<div style="font-family:'Times New Roman',Georgia,serif;color:#000;width:100%;max-width:840px;min-height:272mm;margin:0 auto;background:#fff;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;padding:2mm 4mm;position:relative;">
  ${dynamicWatermarkHtml}

  <!-- TOP 3-SEAL HEADER -->
  <div style="position:relative;z-index:2;">
    ${headerHtml}
  </div>

  <!-- MAIN OUTER BLACK BORDER BOX CONTAINING 2 COLUMNS -->
  <div class="doc-frame" style="border:2px solid #000;display:flex;align-items:stretch;flex:1 1 auto;min-height:226mm;position:relative;margin:4px 0 6px 0;box-sizing:border-box;z-index:2;background:transparent;">
    
    <!-- LEFT SIDEBAR: BARANGAY OFFICIALS & KAGAWAD ROSTER (SIZED UP BY +2PX) -->
    <div style="width:235px;min-width:235px;border-right:2px solid #000;padding:12px 8px 8px 8px;text-align:center;font-size:13.5px;display:flex;flex-direction:column;justify-content:flex-start;background:transparent;box-sizing:border-box;">
      <div>
        <!-- PUNONG BARANGAY -->
        <div style="margin-bottom:10px;">
          <p style="font-size:15.5px;font-weight:bold;text-decoration:underline;margin:0;color:#000;text-transform:uppercase;">
            ${settings.punongBarangay}
          </p>
          <p style="font-size:14px;font-weight:bold;margin:2px 0 0 0;color:#000;">
            Punong Barangay
          </p>
        </div>

        <!-- KAGAWAD HEADER -->
        <p style="font-size:15px;font-weight:bold;text-transform:uppercase;margin:8px 0 4px 0;color:#000;letter-spacing:0.5px;">
          KAGAWAD:
        </p>

        <!-- DYNAMIC KAGAWAD ROSTER LIST -->
        <div>
          ${kagawadListHtml}
        </div>

        <!-- EXECUTIVE OFFICERS -->
        <div style="margin-top:20px;">
          <div style="margin-bottom:6px;">
            <p style="font-size:14.5px;font-weight:bold;margin:0;color:#000;">${settings.barangayTreasurer}</p>
            <p style="font-size:12.5px;font-style:italic;margin:1px 0 0 0;color:#333;">Barangay Treasurer</p>
          </div>
          <div>
            <p style="font-size:14.5px;font-weight:bold;margin:0;color:#000;">${settings.barangaySecretary}</p>
            <p style="font-size:12.5px;font-style:italic;margin:1px 0 0 0;color:#333;">Barangay Secretary</p>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT COLUMN: DOCUMENT TITLE, BODY & SIGNATURE -->
    <div style="flex:1;padding:26px 30px 18px 30px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;box-sizing:border-box;background:transparent;">
      <!-- MAIN CONTENT LAYER -->
      <div style="position:relative;z-index:2;">
        <h2 style="text-align:center;font-size:${docTypeKey === 'business_clearance' || docTypeKey === 'business_permit' ? '22px' : '23px'};font-weight:800;font-family:'Times New Roman',serif;letter-spacing:1.8px;color:#000;text-transform:uppercase;text-decoration:${docTypeKey === 'business_clearance' || docTypeKey === 'business_permit' ? 'underline' : 'none'};text-underline-offset:3px;margin:6px 0 28px 0;">
          ${docTitleUpper}
        </h2>

        ${
          docTypeKey === 'business_clearance' || docTypeKey === 'business_permit'
            ? ''
            : `<p style="font-size:14.5px;font-weight:bold;margin-bottom:24px;color:#000;">TO WHOM IT MAY CONCERN:</p>`
        }

        ${bodyWordingHtml}
      </div>

      <!-- BOTTOM SIGNATURE & OFFICIAL NOTICE SECTION -->
      <div style="position:relative;z-index:2;margin-top:auto;padding-top:32px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;">
          <div style="font-size:10.5px;font-weight:bold;font-style:italic;color:#333;line-height:1.25;">
            Not Valid Without<br />Official Seal
          </div>

          <div style="text-align:center;min-width:220px;">
            <p style="font-size:14.5px;font-weight:bold;margin:0;color:#000;">
              ${settings.punongBarangay}
            </p>
            <p style="font-size:12px;font-weight:bold;margin:3px 0 0 0;color:#000;">
              Punong Barangay
            </p>
          </div>
        </div>

        <!-- WARNING FOOTER BAR -->
        <div style="border-top:1px solid #000;padding-top:6px;text-align:center;">
          <p style="font-size:9.5px;font-weight:bold;color:#000;margin:0;text-transform:uppercase;letter-spacing:0.3px;">
            **ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- DYNAMIC FOOTER ADDRESS & CONTACT INFORMATION -->
  <div style="position:relative;z-index:2;text-align:center;margin-top:auto;padding-top:8px;font-size:11.5px;font-style:italic;color:#4f6e34;font-weight:bold;line-height:1.4;font-family:Georgia,serif;">
    <p style="margin:0;">${settings.barangayAddress}</p>
    <p style="margin:2px 0 0 0;">
      Email Address: <span style="text-decoration:underline;">${settings.barangayEmail}</span>
    </p>
    <p style="margin:2px 0 0 0;">Telephone Nos. ${settings.barangayPhone}</p>
  </div>
</div>
`.trim();
  }, [
    request,
    docTypeKey,
    residentName,
    residentAddress,
    purpose,
    dateIssued,
    locale,
    documentTemplates,
    fieldDraft,
    addWhere,
    businessName,
    businessAddress,
  ]);

  // Handle Isolated Printing
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      setFeedback(locale === 'fil' ? 'Na-block ng browser ang print window.' : 'Browser blocked the print window.');
      return;
    }

    printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${request?.typeLabel || 'Document'} - ${residentName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 4mm 6mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      font-family: "Times New Roman", Times, serif;
      color: #000;
      width: 100%;
      height: 100%;
    }
    .print-document-wrapper {
      width: 100%;
      max-width: 198mm;
      min-height: 275mm;
      height: 275mm;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #fff;
      box-sizing: border-box;
      padding: 2mm 0;
    }
    .print-document-wrapper > div {
      min-height: 275mm !important;
      height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
    }
    .print-document-wrapper .doc-frame {
      flex: 1 1 auto !important;
      min-height: 226mm !important;
      height: 226mm !important;
      display: flex !important;
    }
  </style>
</head>
<body>
  <div class="print-document-wrapper">
    ${previewHtml}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayClassName="z-[95]" className="z-[100] max-w-4xl max-h-[95vh] overflow-y-auto p-0 gap-0 border-0 bg-slate-900/40 backdrop-blur-md" hideCloseButton={true}>
        {/* TOP MODAL HEADER BAR */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-3.5 backdrop-blur-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-100 text-blue-700">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {locale === 'fil' ? 'Silipin ang Dokumento bago i-Release' : 'Preview Document Before Release'}
                </h3>
                <StatusBadge tone={statusToneFromState(request.status)}>
                  {getRequestStatusLabel(request.status, locale)}
                </StatusBadge>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {request.referenceNumber} • {residentName} ({request.typeLabel})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 border-2 border-[color:#1b6b46] bg-white text-xs text-[color:#144b32] shadow-[0_2px_10px_rgba(20,75,50,0.08)] hover:bg-[#f3faf6]"
            >
              <Printer className="h-3.5 w-3.5 text-[color:#1b6b46]" />
              {locale === 'fil' ? 'I-print / PDF' : 'Print / PDF'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
              aria-label={locale === 'fil' ? 'Isara' : 'Close'}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {feedback && (
          <div className="m-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{feedback}</span>
          </div>
        )}

        {/* AUTHENTIC PAPER CANVAS CONTAINER */}
        <div className="p-6 bg-slate-200/70 overflow-x-auto flex justify-center">
          <div
            id="printable-document-modal-canvas"
            className="w-full max-w-[820px] min-h-[680px] rounded-sm bg-white p-6 shadow-2xl text-slate-900 border border-slate-300"
          >
            <div
              className="w-full text-slate-900 leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>

        {/* BOTTOM FOOTER BAR */}
        <div className="sticky bottom-0 z-30 flex items-center justify-between border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur-xs">
          <p className="text-xs text-slate-500">
            {locale === 'fil'
              ? 'Maaaring i-verify ang mga detalye bago baguhin ang status papuntang Ready for Pickup.'
              : 'Verify all resident and clearance information before releasing to Ready for Pickup.'}
          </p>

          <div className="flex items-center gap-2">
            {request.status === 'approved' && onMarkReadyForPickup && (
              <Button
                type="button"
                size="sm"
                disabled={isMarkingReady}
                onClick={async () => {
                  if (onMarkReadyForPickup) {
                    await onMarkReadyForPickup();
                    onOpenChange(false);
                  }
                }}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isMarkingReady
                  ? locale === 'fil'
                    ? 'Inihahanda'
                    : 'Processing'
                  : locale === 'fil'
                  ? 'I-release bilang Ready for Pickup'
                  : 'Mark Ready for Pickup'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { Eye, Printer, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { getRequestStatusLabel } from '@/lib/formatters';
import { getRequestedPersonDetails } from '@/lib/documents/request-template-fields';
import type { DocumentRequest, DocumentTemplate, User } from '@/lib/types/models';

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
    const combined = `${request.typeLabel || ''} ${request.category || ''} ${request.purpose || ''}`.toLowerCase();

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

    // 3. Lupon Summons / KP Form / CFA
    if (
      combined.includes('lupon') ||
      combined.includes('summons') ||
      combined.includes('patawag') ||
      combined.includes('tagapamayapa') ||
      combined.includes('certificate to file action') ||
      combined.includes('cfa') ||
      combined.includes('barangay case')
    ) {
      return 'lupon_tagapamayapa';
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
  const purpose = fieldDraft.purpose || fieldDraft.reasonText || request?.purpose || request?.typeLabel || 'Official legal requirements';
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

    const barangayLogoHtml = `<img src="/images/indigency-template/barangay-progreso-seal.jpeg" style="height:60px;width:60px;object-fit:contain;" alt="Barangay Seal" />`;
    const cityLogoHtml = `<img src="/images/indigency-template/san-juan-seal.jpeg" style="height:60px;width:60px;object-fit:contain;" alt="City Seal" />`;
    const countryLogoHtml = `<img src="/images/indigency-template/bagong-pilipinas.png" style="height:55px;width:68px;object-fit:contain;" alt="Bagong Pilipinas Seal" />`;

    const kagawadListHtml = `
<div style="margin-bottom:7px;"><p style="font-size:14px;font-weight:bold;margin:0;color:#000;line-height:1.25;">Carmencita H. Sto. Domingo</p><p style="font-size:12px;font-style:italic;margin:2px 0 0 0;color:#333;line-height:1.2;">Peace and Order/BADAC</p></div>
<div style="margin-bottom:7px;"><p style="font-size:14px;font-weight:bold;margin:0;color:#000;line-height:1.25;">Mary Antoinette P. Salayon</p><p style="font-size:12px;font-style:italic;margin:2px 0 0 0;color:#333;line-height:1.2;">Disaster Management</p></div>
<div style="margin-bottom:7px;"><p style="font-size:14px;font-weight:bold;margin:0;color:#000;line-height:1.25;">Rodelio O. Santos</p><p style="font-size:12px;font-style:italic;margin:2px 0 0 0;color:#333;line-height:1.2;">Livelihood & Public Enterprise</p></div>
<div style="margin-bottom:7px;"><p style="font-size:14px;font-weight:bold;margin:0;color:#000;line-height:1.25;">Darryl S. Eustaquio</p><p style="font-size:12px;font-style:italic;margin:2px 0 0 0;color:#333;line-height:1.2;">Infrastructure & Public Works</p></div>
<div style="margin-bottom:7px;"><p style="font-size:14px;font-weight:bold;margin:0;color:#000;line-height:1.25;">Amafel T. Ingalla</p><p style="font-size:12px;font-style:italic;margin:2px 0 0 0;color:#333;line-height:1.2;">Health, Nutrition & Women</p></div>
<div style="margin-bottom:7px;"><p style="font-size:14px;font-weight:bold;margin:0;color:#000;line-height:1.25;">Renar M. Mendoza</p><p style="font-size:12px;font-style:italic;margin:2px 0 0 0;color:#333;line-height:1.2;">Ways & Means, Appropriations</p></div>
<div style="margin-bottom:7px;"><p style="font-size:14px;font-weight:bold;margin:0;color:#000;line-height:1.25;">Raymund Marcel B. Fontamillas</p><p style="font-size:12px;font-style:italic;margin:2px 0 0 0;color:#333;line-height:1.2;">Clean & Green Solid Waste</p></div>
<div style="margin-bottom:7px;"><p style="font-size:14px;font-weight:bold;margin:0;color:#000;line-height:1.25;">Anton Jose T. Cabrillas</p><p style="font-size:12px;font-style:italic;margin:2px 0 0 0;color:#333;line-height:1.2;">SK-Chairperson Sports Dev.</p></div>
`;

    const headerHtml = `
<div style="text-align:center;margin-bottom:8px;">
  <div style="display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:6px;">
    ${barangayLogoHtml}
    ${cityLogoHtml}
    ${countryLogoHtml}
  </div>
  <p style="font-family:Georgia,serif;font-size:13px;font-weight:bold;font-style:italic;text-transform:uppercase;color:#4f6e34;margin:0;letter-spacing:0.5px;">REPUBLIC OF THE PHILIPPINES</p>
  <p style="font-family:Georgia,serif;font-size:12px;font-style:italic;color:#4f6e34;margin:1px 0;">City Of San Juan</p>
  <p style="font-family:Georgia,serif;font-size:14px;font-weight:bold;font-style:italic;text-transform:uppercase;color:#4f6e34;margin:0;">BARANGAY PROGRESO</p>
  <p style="font-family:Georgia,serif;font-size:11px;font-weight:bold;font-style:italic;text-transform:uppercase;color:#4f6e34;margin:2px 0 0 0;">OFFICE OF THE PUNONG BARANGAY</p>
</div>
`;

    const dynamicWatermarkHtml = `<img src="/images/indigency-template/barangay-progreso-seal.jpeg" class="doc-watermark" style="position:absolute;left:50%;top:50%;width:560px;max-width:88%;transform:translate(-50%, -50%);opacity:0.12;filter:contrast(115%);pointer-events:none;z-index:1;user-select:none;-webkit-user-select:none;" alt="Barangay Seal Watermark" />`;

    const currentDocKey = docTypeKey as string;
    const reqTypeLabelLower = (request.selectedTypeLabel || request.typeLabel || '').trim().toLowerCase();
    const matchingCustomTemplate = (documentTemplates || []).find((t) => {
      const nameLower = (t.name || '').trim().toLowerCase();
      if (reqTypeLabelLower && (nameLower === reqTypeLabelLower || reqTypeLabelLower.includes(nameLower) || nameLower.includes(reqTypeLabelLower))) return true;
      if (t.id === request.typeId) return true;
      if (t.documentType === currentDocKey) return true;
      if ((currentDocKey === 'certificate_indigency' || currentDocKey === 'barangay_certification') && (nameLower.includes('indigency') || nameLower.includes('barangay') || nameLower.includes('clearance') || nameLower.includes('certification'))) return true;
      if (currentDocKey === 'transient_employees' && (nameLower.includes('transient') || nameLower.includes('worker'))) return true;
      if ((currentDocKey === 'lupon_tagapamayapa' || currentDocKey === 'lupon_summons') && (nameLower.includes('lupon') || nameLower.includes('summons') || nameLower.includes('cfa'))) return true;
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
      const metaMatch = customHtml.match(/<!-- TEMPLATE_META:([\s\S]*?) -->$/);
      if (metaMatch) {
        customHtml = customHtml.replace(/<!-- TEMPLATE_META:([\s\S]*?) -->$/, '').trim();
      }
      if (customHtml.includes('{{') || customHtml.includes('<div') || customHtml.includes('<p')) {
        let rendered = customHtml;
        rendered = rendered.replaceAll('{{resident_name}}', residentName);
        rendered = rendered.replaceAll('{{resident_address}}', residentAddress);
        rendered = rendered.replaceAll('{{purpose}}', purpose);
        rendered = rendered.replaceAll('{{date_issued}}', dateIssued);
        rendered = rendered.replaceAll('{{reference_number}}', request.referenceNumber || '');
        rendered = rendered.replaceAll('{{punong_barangay}}', 'CESAR JR. H. STO. DOMINGO');
        rendered = rendered.replaceAll('{{barangay_secretary}}', 'Ma. Theresa R. Dela Cruz');
        rendered = rendered.replaceAll('{{barangay_treasurer}}', 'Saturnina C. Mirata');
        rendered = rendered.replaceAll('{{kagawad_list}}', kagawadListHtml);
        rendered = rendered.replaceAll('{{barangay_name}}', 'BARANGAY PROGRESO');
        rendered = rendered.replaceAll('{{city}}', 'City Of San Juan');
        rendered = rendered.replaceAll('{{country_seal}}', countryLogoHtml);
        rendered = rendered.replaceAll('{{city_seal}}', cityLogoHtml);
        rendered = rendered.replaceAll('{{barangay_seal}}', barangayLogoHtml);
        rendered = rendered.replaceAll('{{barangay_watermark}}', dynamicWatermarkHtml);
        rendered = rendered.replaceAll('{{barangay_address}}', '#15 M. Cruz Street Barangay Progreso, San Juan City');
        rendered = rendered.replaceAll('{{barangay_email}}', 'barangayprogreso@yahoo.com');
        rendered = rendered.replaceAll('{{barangay_phone}}', '(02)8727-5635 / (02)76258731');
        rendered = rendered.replaceAll('{{official_seal}}', '<div style="display:inline-block;border:2px solid #1e3a8a;color:#1e3a8a;padding:4px 10px;border-radius:9999px;font-weight:bold;font-size:10px;">[ OFFICIAL BARANGAY SEAL ]</div>');
        return rendered;
      }
    }

    let docTitleUpper = 'BARANGAY CLEARANCE';
    let bodyWordingHtml = '';

    switch (docTypeKey as string) {
      case 'transient_employees':
        docTitleUpper = 'TRANSIENT WORKER CERTIFICATION';
        bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">${residentName}</u> is an authorized transient worker / employee engaged at <u style="font-weight:bold;">${residentAddress}</u> within the jurisdiction of BARANGAY PROGRESO, City Of San Juan.
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
  Barangay clearance is hereby granted to <u style="font-weight:bold;">${residentName}</u> for delivery / hauling operations at <u style="font-weight:bold;">${residentAddress}</u>, BARANGAY PROGRESO, City Of San Juan.
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
  Special barangay clearance/permit is hereby granted to <u style="font-weight:bold;">${residentName}</u> for activity/operations at <u style="font-weight:bold;">${residentAddress}</u>, BARANGAY PROGRESO, City Of San Juan.
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
  This is to certify that <u style="font-weight:bold;">${residentName}</u> whose residence at <u style="font-weight:bold;">${residentAddress}</u> is a verified permanent resident of BARANGAY PROGRESO, City Of San Juan.
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
  This is to certify that <u style="font-weight:bold;">${residentName}</u> residing at <u style="font-weight:bold;">${residentAddress}</u> is personally known to the undersigned officials as a person of good moral character.
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
        bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Barangay clearance is hereby granted to <u style="font-weight:bold;">${residentName}</u> to operate business located at <u style="font-weight:bold;">${residentAddress}</u>, BARANGAY PROGRESO, City Of San Juan.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:28px;text-align:justify;color:#000;">
  Subject to compliance with all existing barangay ordinances and municipal health laws.
</p>
<p style="font-size:14.5px;margin-top:28px;margin-bottom:36px;color:#000;">
  Issued this <u style="font-weight:bold;">${dateIssued}</u> for <u style="font-weight:bold;">${purpose}</u>.
</p>
`;
        break;

      case 'construction_clearances':
      case 'construction_permit':
        docTitleUpper = 'BARANGAY CONSTRUCTION CLEARANCE';
        bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Barangay construction clearance is hereby granted to <u style="font-weight:bold;">${residentName}</u> with project address at <u style="font-weight:bold;">${residentAddress}</u>, BARANGAY PROGRESO, City Of San Juan.
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
        docTitleUpper = 'PATAWAG / SUMMONS (KP FORM #9)';
        bodyWordingHtml = `
<p style="font-size:14px;font-weight:bold;margin-bottom:16px;color:#000;">TO RESPONDENT: <u style="font-weight:bold;">${residentName}</u></p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  You are hereby summoned to appear before me personally at the Barangay Hall on <u style="font-weight:bold;">${dateIssued}</u> for a mediation/conciliation hearing regarding complaint filed against you for: <u style="font-weight:bold;">${purpose}</u>.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:28px;text-align:justify;color:#000;">
  Fail not, or else face prejudice and legal action in court according to law.
</p>
`;
        break;

      case 'certificate_indigency':
        docTitleUpper = 'CERTIFICATE OF INDIGENCY';
        bodyWordingHtml = `
<p style="font-size:15.5px;line-height:2.1;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">${residentName}</u> whose residence at <u style="font-weight:bold;">${residentAddress}</u> is within the jurisdiction of BARANGAY PROGRESO, City Of San Juan and belongs to the indigent families of this barangay. The barangay also certifies that their daily income is barely enough to meet their day-to-day needs.
</p>
<p style="font-size:15.5px;line-height:2.1;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is being issued upon the request of Mr./Mrs./Ms. <u style="font-weight:bold;">${residentName}</u> for whatever legal purpose it may serve him/her.
</p>
<p style="font-size:15.5px;margin-top:26px;margin-bottom:32px;color:#000;text-align:center;">
  Issued this <u style="font-weight:bold;">${dateIssued}</u>.
</p>
`;
        break;

      case 'barangay_certificate':
      case 'barangay_certification':
      default:
        docTitleUpper = 'BARANGAY CLEARANCE';
        bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">${residentName}</u> whose residence at <u style="font-weight:bold;">${residentAddress}</u> is within the jurisdiction of BARANGAY PROGRESO, City Of San Juan.
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
            CESAR JR. H. STO. DOMINGO
          </p>
          <p style="font-size:14px;font-weight:bold;margin:2px 0 0 0;color:#000;">
            Punong Barangay
          </p>
          <p style="font-size:12.5px;font-style:italic;margin:2px 0 0 0;color:#333;">
            Senior Citizen & PWD's Committee
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
            <p style="font-size:14.5px;font-weight:bold;margin:0;color:#000;">Saturnina C. Mirata</p>
            <p style="font-size:12.5px;font-style:italic;margin:1px 0 0 0;color:#333;">Barangay Treasurer</p>
          </div>
          <div>
            <p style="font-size:14.5px;font-weight:bold;margin:0;color:#000;">Ma. Theresa R. Dela Cruz</p>
            <p style="font-size:12.5px;font-style:italic;margin:1px 0 0 0;color:#333;">Barangay Secretary</p>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT COLUMN: DOCUMENT TITLE, BODY & SIGNATURE -->
    <div style="flex:1;padding:26px 30px 18px 30px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;box-sizing:border-box;background:transparent;">
      <!-- MAIN CONTENT LAYER -->
      <div style="position:relative;z-index:2;">
        <h2 style="text-align:center;font-size:23px;font-weight:800;font-family:'Times New Roman',serif;letter-spacing:1.8px;color:#000;text-transform:uppercase;margin:6px 0 28px 0;">
          ${docTitleUpper}
        </h2>

        <p style="font-size:14.5px;font-weight:bold;margin-bottom:24px;color:#000;">
          TO WHOM IT MAY CONCERN:
        </p>

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
              CESAR JR. H. STO. DOMINGO
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
    <p style="margin:0;">#15 M. Cruz Street Barangay Progreso, San Juan City</p>
    <p style="margin:2px 0 0 0;">
      Email Address: <span style="text-decoration:underline;">barangayprogreso@yahoo.com</span>
    </p>
    <p style="margin:2px 0 0 0;">Telephone Nos. (02)8727-5635 / (02)76258731</p>
  </div>
</div>
`.trim();
  }, [request, docTypeKey, residentName, residentAddress, purpose, dateIssued, locale]);

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
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              {locale === 'fil' ? 'I-print / PDF' : 'Print / PDF'}
            </Button>

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

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              {locale === 'fil' ? 'Isara' : 'Close'}
            </Button>

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

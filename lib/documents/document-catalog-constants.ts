export type DocumentTypeDefinition = {
  id: string;
  labelEn: string;
  labelFil: string;
  descriptionEn?: string;
  descriptionFil?: string;
};

export type DocumentCategoryDefinition = DocumentTypeDefinition;

export type DefaultTemplateDefinition = {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  pricingNote?: string;
  description?: string;
};


// 7 Official Document Types of the Barangay
export const OFFICIAL_DOCUMENT_TYPES: DocumentTypeDefinition[] = [
  {
    id: 'barangay_certification',
    labelEn: 'Barangay Certification',
    labelFil: 'Barangay Certification',
    descriptionEn: 'Official clearances, indigency, residency, and certificates of good standing',
    descriptionFil: 'Mga opisyal na clearance, indigency, residency, at katibayan ng magandang asal',
  },
  {
    id: 'transient_employees',
    labelEn: 'Transient Employees & Worker Certification',
    labelFil: 'Transient Employees & Worker Certification',
    descriptionEn: 'Certifications for transient employees, kasambahay, and company personnel',
    descriptionFil: 'Sertipikasyon para sa mga transient worker, kasambahay, at empleyado ng kumpanya',
  },
  {
    id: 'lupon_tagapamayapa',
    labelEn: 'Lupon ng mga Tagapamayapa',
    labelFil: 'Lupon ng mga Tagapamayapa',
    descriptionEn: 'Summons (Patawag), CFA (Certificate to File Action), and hearing conciliation notices',
    descriptionFil: 'Patawag, Certificate to File Action (CFA), at mga abiso sa pagdinig ng Lupon',
  },
  {
    id: 'business_clearance',
    labelEn: 'Business Clearance',
    labelFil: 'Business Clearance',
    descriptionEn: 'Barangay clearance for new and renewal commercial & micro-businesses',
    descriptionFil: 'Barangay clearance para sa bago at renewal na negosyo o commercial establishment',
  },
  {
    id: 'construction_clearances',
    labelEn: 'Construction Clearances',
    labelFil: 'Construction Clearances',
    descriptionEn: 'Clearances for building construction, renovation, excavation, fencing, and demolition',
    descriptionFil: 'Clearance para sa pagpapatayo, renobasyon, paghuhukay, bakod, at demolisyon',
  },
  {
    id: 'delivery_hauling_clearances',
    labelEn: 'Delivery & Hauling Clearances',
    labelFil: 'Delivery & Hauling Clearances',
    descriptionEn: 'Permits for delivery of concrete, cement, and construction debris hauling',
    descriptionFil: 'Permit para sa delivery ng semento, graba, at paghahakot ng construction debris',
  },
  {
    id: 'special_commercial_permits',
    labelEn: 'Special & Commercial Permits',
    labelFil: 'Special & Commercial Permits',
    descriptionEn: 'Permits for film shooting, promotional flyers, product samplers, and cable installation',
    descriptionFil: 'Espesyal na permit para sa shooting, pamimigay ng flyer, sampling, at pagkakabit ng kable',
  },
];

export const OFFICIAL_DOCUMENT_CATEGORIES = OFFICIAL_DOCUMENT_TYPES;


export type OfficialWordTemplateDefinition = {
  id: string;
  name: string;
  fileName: string;
  categoryId: string;
  documentType: string;
  description: string;
  dynamicFields: string[];
};

export const OFFICIAL_WORD_TEMPLATES: OfficialWordTemplateDefinition[] = [
  {
    id: 'tpl_brgy_clearance',
    name: 'Barangay Certification (General)',
    fileName: 'BLANK-BARANGAY-CERT-NEW-LOGO-doc.docx',
    categoryId: 'barangay_certification',
    documentType: 'barangay_certification',
    description: 'Official Barangay Certification for residency, school, employment, and general legal requirements (3 months validity)',
    dynamicFields: ['resident_name', 'resident_address', 'purpose', 'date_issued', 'punong_barangay', 'barangay_name', 'city'],
  },
  {
    id: 'tpl_cert_indigency',
    name: 'Certificate of Indigency',
    fileName: 'BLANK-INDIGENCY-WITH-NEW-LOGO-KIM.docx',
    categoryId: 'barangay_certification',
    documentType: 'certificate_indigency',
    description: 'Official Certificate of Indigency for medical, financial, funeral, and educational assistance',
    dynamicFields: ['resident_name', 'resident_address', 'purpose', 'date_issued', 'punong_barangay', 'barangay_name', 'city'],
  },
  {
    id: 'tpl_lupon_summons',
    name: 'Summons / Patawag (KP Form #9)',
    fileName: 'BLANK-LUPON-SUMMONS-KP2026.docx',
    categoryId: 'lupon_tagapamayapa',
    documentType: 'lupon_summons',
    description: 'Official Katarungang Pambarangay Summons / Patawag for conciliation and mediation hearings',
    dynamicFields: ['resident_name', 'complainant_name', 'case_number', 'date_filed', 'purpose', 'date_issued', 'punong_barangay', 'barangay_name', 'city'],
  },
  {
    id: 'tpl_lupon_cfa',
    name: 'Certificate to File Action (CFA - KP Form #20)',
    fileName: 'BLANK-LUPON-SUMMONS-KP2026.docx',
    categoryId: 'lupon_tagapamayapa',
    documentType: 'lupon_cfa',
    description: 'Official Katarungang Pambarangay Certificate to File Action (CFA) after failed conciliation',
    dynamicFields: ['resident_name', 'complainant_name', 'case_number', 'date_filed', 'purpose', 'date_issued', 'punong_barangay', 'barangay_name', 'city'],
  },
  {
    id: 'tpl_lupon_notice',
    name: 'Notice of Hearing / Reconciliation Notice (KP Form #8)',
    fileName: 'BLANK-LUPON-SUMMONS-KP2026.docx',
    categoryId: 'lupon_tagapamayapa',
    documentType: 'lupon_notice',
    description: 'Official Katarungang Pambarangay Notice of Hearing / Abiso ng Pagdinig',
    dynamicFields: ['resident_name', 'complainant_name', 'case_number', 'date_filed', 'purpose', 'date_issued', 'punong_barangay', 'barangay_name', 'city'],
  },
  {
    id: 'tpl_transient_workers',
    name: 'Transient Employees & Worker Certification',
    fileName: 'TRANSIENT-WORKERS-CERT.docx',
    categoryId: 'transient_employees',
    documentType: 'transient_employees',
    description: 'Official Certification for transient workers, kasambahay, company employees, and construction personnel',
    dynamicFields: ['resident_name', 'resident_address', 'add_where', 'purpose', 'date_issued', 'punong_barangay', 'barangay_name', 'city'],
  },
  {
    id: 'tpl_business_clearance',
    name: 'Barangay Business Clearance',
    fileName: 'BUSINESS-PERMIT.docx',
    categoryId: 'business_clearance',
    documentType: 'business_clearance',
    description: 'Official Barangay Business Clearance for commercial operations and trade compliance',
    dynamicFields: ['business_name', 'resident_name', 'resident_address', 'purpose', 'date_issued', 'punong_barangay', 'barangay_name', 'city'],
  },
  {
    id: 'tpl_construction_permit',
    name: 'Barangay Clearance - Construction & Multi-Permit',
    fileName: 'CONSTRUCTION-PERMIT.docx',
    categoryId: 'construction_clearances',
    documentType: 'construction_clearances',
    description: 'Official Multi-Permit Clearance (Building, Occupancy, Excavation, Demolition, Renovation, Hauling, Signage)',
    dynamicFields: ['resident_name', 'resident_address', 'add_where', 'permit_type', 'purpose', 'date_issued', 'punong_barangay', 'barangay_name', 'city'],
  },
  {
    id: 'tpl_delivery_hauling',
    name: 'Delivery & Hauling Clearance',
    fileName: 'DELIVERY-HAULING-CLEARANCE.docx',
    categoryId: 'delivery_hauling_clearances',
    documentType: 'delivery_hauling_clearances',
    description: 'Entry and transport permit for ready-mix concrete, debris hauling, and heavy construction equipment',
    dynamicFields: ['resident_name', 'resident_address', 'add_where', 'purpose', 'date_issued', 'punong_barangay', 'barangay_name', 'city'],
  },
  {
    id: 'tpl_special_permits',
    name: 'Special & Commercial Permits',
    fileName: 'SPECIAL-COMMERCIAL-PERMIT.docx',
    categoryId: 'special_commercial_permits',
    documentType: 'special_commercial_permits',
    description: 'Special permit for commercial shooting, promotional flyers, cable installation, and special activities',
    dynamicFields: ['resident_name', 'resident_address', 'add_where', 'purpose', 'date_issued', 'punong_barangay', 'barangay_name', 'city'],
  },
];

// Official Primary Document Types of the Barangay
export const DEFAULT_OFFICIAL_TEMPLATES: DefaultTemplateDefinition[] = [
  {
    id: 'barangay_certification',
    name: 'Barangay Certification',
    categoryId: 'barangay_certification',
    price: 0,
    pricingNote: 'Free for assistance / ₱100.00 - ₱200.00 for clearances',
    description: 'Official Barangay Certification and Clearances for residency, identification, indigency, employment, and legal requirements.',
  },
  {
    id: 'transient_employees',
    name: 'Transient Employees & Worker Certification',
    categoryId: 'transient_employees',
    price: 100,
    pricingNote: '₱100.00 per certification',
    description: 'Certifications for transient workers, kasambahay, agency workers, and construction personnel.',
  },
  {
    id: 'lupon_tagapamayapa',
    name: 'Lupon ng mga Tagapamayapa',
    categoryId: 'lupon_tagapamayapa',
    price: 100,
    pricingNote: '₱100.00 Filing Fee / ₱300.00 CFA',
    description: 'Official Katarungang Pambarangay documents (Summons / Patawag, Certificate to File Action, Notice of Hearing).',
  },
  {
    id: 'business_clearance',
    name: 'Business Clearance',
    categoryId: 'business_clearance',
    price: 500,
    pricingNote: '₱500.00 - ₱1,500.00 based on business capital',
    description: 'Barangay clearance for new and renewal commercial, micro, small, medium, and large business operations.',
  },
  {
    id: 'construction_clearances',
    name: 'Construction Clearances',
    categoryId: 'construction_clearances',
    price: 1000,
    pricingNote: '₱1,000.00 base or ₱10.00/sqm whichever is higher (see specific sub-clearance fee schedule)',
    description: 'Clearances for building construction, occupancy, renovation, fencing, demolition, utilities, and excavation.',
  },
  {
    id: 'delivery_hauling_clearances',
    name: 'Delivery & Hauling Clearances',
    categoryId: 'delivery_hauling_clearances',
    price: 300,
    pricingNote: '₱300.00 per trip / ₱1,000.00 - ₱2,000.00 per day',
    description: 'Entry and transport permits for ready-mix concrete, debris hauling, sand, gravel, and heavy equipment.',
  },
  {
    id: 'special_commercial_permits',
    name: 'Special & Commercial Permits',
    categoryId: 'special_commercial_permits',
    price: 1000,
    pricingNote: '₱1,000.00 - ₱4,000.00 per activity/day',
    description: 'Permits for commercial shooting, promotional materials / flyers, cable installation, and special activities.',
  },
];

export const DOCUMENT_PURPOSES_STORAGE_KEY = 'eserbisyo.document-purposes';

export function getCategoryForDocType(docType?: string | null, name?: string | null): string {
  const combined = `${docType || ''} ${name || ''}`.toLowerCase();
  if (
    combined.includes('transient') ||
    combined.includes('worker') ||
    combined.includes('kasambahay') ||
    combined.includes('household') ||
    combined.includes('company employee') ||
    combined.includes('agency worker')
  ) {
    return 'transient_employees';
  }
  if (
    combined.includes('lupon') ||
    combined.includes('summons') ||
    combined.includes('cfa') ||
    combined.includes('file action') ||
    combined.includes('tagapamayapa') ||
    combined.includes('patawag')
  ) {
    return 'lupon_tagapamayapa';
  }
  if (
    combined.includes('no operation') ||
    combined.includes('not in operation') ||
    combined.includes('ceased operations')
  ) {
    return 'barangay_certification';
  }
  if (
    combined.includes('business') ||
    combined.includes('negosyo') ||
    combined.includes('trade') ||
    combined.includes('micro') ||
    combined.includes('medium enterprise') ||
    combined.includes('large enterprise') ||
    combined.includes('small business')
  ) {
    return 'business_clearance';
  }
  if (
    combined.includes('construction') ||
    combined.includes('occupancy') ||
    combined.includes('renovation') ||
    combined.includes('expansion') ||
    combined.includes('fencing') ||
    combined.includes('excavation') ||
    combined.includes('demolition') ||
    combined.includes('pagpapatayo') ||
    combined.includes('building') ||
    combined.includes('electric post') ||
    combined.includes('utilities')
  ) {
    return 'construction_clearances';
  }
  if (
    combined.includes('delivery') ||
    combined.includes('hauling') ||
    combined.includes('concrete') ||
    combined.includes('cement') ||
    combined.includes('debris') ||
    combined.includes('sand') ||
    combined.includes('gravel') ||
    combined.includes('filling materials') ||
    combined.includes('equipment')
  ) {
    return 'delivery_hauling_clearances';
  }
  if (
    combined.includes('special') ||
    combined.includes('commercial') ||
    combined.includes('shooting') ||
    combined.includes('flyer') ||
    combined.includes('promotional') ||
    combined.includes('sampler') ||
    combined.includes('wire') ||
    combined.includes('cable') ||
    combined.includes('activity')
  ) {
    return 'special_commercial_permits';
  }
  return 'barangay_certification';
}

export function getCategoryLabel(categoryId?: string | null): string {
  if (!categoryId) return 'Barangay Certification';
  const cat = OFFICIAL_DOCUMENT_CATEGORIES.find((c) => c.id === categoryId);
  return cat ? cat.labelEn : 'Barangay Certification';
}

export type DocumentTypeCatalogItem = {
  id: string;
  name: string;
  categoryId: string;
  categoryLabel?: string;
  price?: number;
  pricingNote?: string;
  description?: string;
  purposes?: string[];
  isActive?: boolean;
  isCustom?: boolean;
};

export const DOCUMENT_TYPES_CATALOG_STORAGE_KEY = 'eserbisyo.document-types-catalog';

export function getDefaultDocumentTypesCatalog(): DocumentTypeCatalogItem[] {
  return [
    {
      id: 'barangay_certification',
      name: 'Barangay Certification',
      categoryId: 'barangay_certification',
      categoryLabel: 'Barangay Certification',
      price: 0,
      description: 'Official Barangay Certification and Clearances for residency, identification, indigency, employment, and legal requirements.',
      purposes: [
        'School Requirement (Free)',
        'Indigency, Financial, Medical, or Educational Assistance (Free)',
        'PWD or Senior Citizen Application (Free)',
        'Health Card Application (Free)',
        'Death Certification (Free)',
        'Employment (₱100.00)',
        'Police, NBI, or Court Clearance Application (₱100.00)',
        'Passport, Postal ID, or Visa Application (₱100.00)',
        'Visa Extension or Overseas Employment (₱100.00)',
        'Certificate of No Business Operation (₱200.00)',
        'Other Purposes Not Mentioned Above (₱200.00)',
      ],
      isActive: true,
      isCustom: false,
    },
    {
      id: 'transient_employees',
      name: 'Transient Employees & Worker Certification',
      categoryId: 'transient_employees',
      categoryLabel: 'Transient Employees & Worker Certification',
      price: 100,
      description: 'Certifications for transient workers, kasambahay, agency workers, and construction personnel.',
      purposes: [
        'Household Employees (Kasambahay, Driver, Caretaker, etc.) (₱100.00)',
        'Company Employees (₱100.00)',
        'Construction Workers (₱100.00)',
        'Other Transient Workers (₱100.00)',
      ],
      isActive: true,
      isCustom: false,
    },
    {
      id: 'lupon_tagapamayapa',
      name: 'Lupon ng mga Tagapamayapa',
      categoryId: 'lupon_tagapamayapa',
      categoryLabel: 'Lupon ng mga Tagapamayapa',
      price: 100,
      description: 'Official Katarungang Pambarangay documents (Summons / Patawag, Certificate to File Action, Notice of Hearing).',
      purposes: [
        'Lupon Filing Fee (₱100.00)',
        'Certificate to File Action (₱300.00)',
        'Summons / Patawag (KP Form #9)',
        'Notice of Hearing / Reconciliation Notice (KP Form #8)',
      ],
      isActive: true,
      isCustom: false,
    },
    {
      id: 'business_clearance',
      name: 'Business Clearance',
      categoryId: 'business_clearance',
      categoryLabel: 'Business Clearance',
      price: 500,
      pricingNote: 'Based on business capital (₱500.00 - ₱1,500.00)',
      description: 'Barangay clearance for new and renewal commercial, micro, small, medium, and large business operations.',
      purposes: [
        'Capital not exceeding ₱20,000.00 (₱500.00)',
        'Capital more than ₱20,000.00 but not exceeding ₱200,000.00 (₱1,000.00)',
        'Capital more than ₱200,000.00 (₱1,500.00)',
        'New Business Clearance',
        'Business Clearance Renewal',
      ],
      isActive: true,
      isCustom: false,
    },
    {
      id: 'construction_clearances',
      name: 'Construction Clearances',
      categoryId: 'construction_clearances',
      categoryLabel: 'Construction Clearances',
      price: 1000,
      pricingNote: '₱1,000.00 base or ₱10.00/sqm whichever is higher (see specific clearance fee schedule)',
      description: 'Clearances for building construction, occupancy, renovation, fencing, demolition, utilities, and excavation.',
      purposes: [
        'Construction of a New Structure (Based on Total Accumulated Floor Area)',
        'Occupancy - Single-Detached House (₱1,000.00)',
        'Occupancy - Apartment (₱1,000.00/unit)',
        'Occupancy - Townhouse (₱1,200.00/unit)',
        'Occupancy - Condominium (₱1,500.00/unit)',
        'Renovation Without Expansion - Single-Detached House (₱1,000.00)',
        'Renovation Without Expansion - Apartment (₱1,000.00/unit)',
        'Renovation Without Expansion - Townhouse (₱1,200.00/unit)',
        'Renovation Without Expansion - Condominium (₱1,500.00/unit)',
        'Expansion Based on Total Accumulated Floor Area',
        'Renovation With Expansion',
        'Fencing Clearance (₱1,000.00)',
        'Installation of Electric or Communication Posts (₱1,000.00/post)',
        'Manila Water Excavation (₱1,000.00/point)',
        'Drainage Works (Per Street, One Side) (₱1,000.00)',
        'Drainage Works (Per Street, Both Sides) (₱2,000.00)',
        'Other Excavation Works Not Mentioned Above (₱1,000.00/point)',
        'Demolition - Single-Detached House (₱1,000.00)',
        'Demolition - Apartment (₱1,000.00/unit)',
        'Demolition - Townhouse (₱1,200.00/unit)',
        'Demolition - Condominium (₱1,500.00/unit)',
      ],
      isActive: true,
      isCustom: false,
    },
    {
      id: 'delivery_hauling_clearances',
      name: 'Delivery & Hauling Clearances',
      categoryId: 'delivery_hauling_clearances',
      categoryLabel: 'Delivery & Hauling Clearances',
      price: 300,
      pricingNote: '₱300.00 per trip / ₱1,000.00 - ₱2,000.00 per truck per day',
      description: 'Entry and transport permits for ready-mix concrete, debris hauling, sand, gravel, and heavy equipment.',
      purposes: [
        'Concrete Pouring Using a Concrete Mixer (₱300.00/trip)',
        'Hauling of Debris Using a 10-Wheeler Truck or Larger (₱1,000.00/day)',
        'Delivery of Filling Materials Using a 10-Wheeler Truck or Larger (₱1,000.00/day)',
        'Delivery of Equipment, Materials, and Fixtures Using a 10-Wheeler Truck or Larger (₱2,000.00/day)',
        'Hauling of Equipment and Materials Using a 10-Wheeler Truck or Larger (₱2,000.00/day)',
      ],
      isActive: true,
      isCustom: false,
    },
    {
      id: 'special_commercial_permits',
      name: 'Special & Commercial Permits',
      categoryId: 'special_commercial_permits',
      categoryLabel: 'Special & Commercial Permits',
      price: 1000,
      pricingNote: '₱1,000.00 - ₱4,000.00 per activity/day',
      description: 'Permits for commercial shooting, promotional materials / flyers, cable installation, and special activities.',
      purposes: [
        'Installation of Wires and Cables (₱1,000.00/street)',
        'Movie, Television, or Commercial Shooting (₱4,000.00/day)',
        'Distribution of Business Flyers and Product Samples (₱1,000.00/day)',
        'Other Purposes Not Mentioned Above (₱2,000.00)',
      ],
      isActive: true,
      isCustom: false,
    },
  ];
}

export function loadDocumentTypesCatalog(): DocumentTypeCatalogItem[] {
  if (typeof window === 'undefined') {
    return getDefaultDocumentTypesCatalog();
  }
  try {
    const raw = localStorage.getItem(DOCUMENT_TYPES_CATALOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return getDefaultDocumentTypesCatalog();
}

export function saveDocumentTypesCatalog(items: DocumentTypeCatalogItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DOCUMENT_TYPES_CATALOG_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('eserbisyo:document-types-catalog-updated'));
  } catch {
    // ignore
  }
}

export function getPurposesForDocumentType(
  docTypeNameOrId?: string | null,
  category?: string | null
): string[] {
  if (!docTypeNameOrId) return [];
  const catalog = loadDocumentTypesCatalog();
  const lower = docTypeNameOrId.toLowerCase().trim();
  const catLower = category ? category.toLowerCase().trim() : '';

  const match = catalog.find((c) => {
    const matchesName = c.id.toLowerCase() === lower || c.name.toLowerCase() === lower;
    if (!matchesName) return false;
    if (catLower) {
      return (
        c.categoryId.toLowerCase() === catLower ||
        (c.categoryLabel && c.categoryLabel.toLowerCase() === catLower)
      );
    }
    return true;
  }) || catalog.find((c) => c.id.toLowerCase() === lower || c.name.toLowerCase() === lower);

  return match?.purposes || [];
}


export type DocumentCategoryDefinition = {
  id: string;
  labelEn: string;
  labelFil: string;
  descriptionEn?: string;
  descriptionFil?: string;
};

export type DefaultTemplateDefinition = {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  pricingNote?: string;
  description?: string;
};

// 7 Official Document Categories Catalog matching Admin and Resident
export const OFFICIAL_DOCUMENT_CATEGORIES: DocumentCategoryDefinition[] = [
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
    labelEn: 'Lupon ng mga Tagapamayapa (Summons / CFA)',
    labelFil: 'Lupon ng mga Tagapamayapa (Summons / CFA)',
    descriptionEn: 'Summons (Patawag), CFA (Certificate to File Action), and hearing conciliation notices',
    descriptionFil: 'Patawag, Certificate to File Action (CFA), at mga abiso sa pagdinig ng Lupon',
  },
  {
    id: 'business_clearance',
    labelEn: 'Business Clearance (New & Renewal)',
    labelFil: 'Business Clearance (New & Renewal)',
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

// Official Default Templates across each of the 7 Categories
export const DEFAULT_OFFICIAL_TEMPLATES: DefaultTemplateDefinition[] = [
  // 1. Barangay Certification
  {
    id: 'tpl_brgy_school_req',
    name: 'Barangay Certification - School Requirement',
    categoryId: 'barangay_certification',
    price: 0,
    description: 'Barangay certification for school enrollment, scholarship, and student requirements',
  },
  {
    id: 'tpl_cert_indigency',
    name: 'Certificate of Indigency (Financial, Medical, Educational)',
    categoryId: 'barangay_certification',
    price: 0,
    description: 'For indigency, financial assistance, medical aid, burial assistance, or educational subsidy',
  },
  {
    id: 'tpl_brgy_pwd_senior',
    name: 'Barangay Certification - PWD / Senior Citizen Application',
    categoryId: 'barangay_certification',
    price: 0,
    description: 'For Persons with Disability (PWD) or Senior Citizen ID and benefits registration',
  },
  {
    id: 'tpl_brgy_health_card',
    name: 'Barangay Certification - Health Card Application',
    categoryId: 'barangay_certification',
    price: 0,
    description: 'For securing municipal health card, medical clearance, and clinic processing',
  },
  {
    id: 'tpl_brgy_death_cert',
    name: 'Barangay Death Certification',
    categoryId: 'barangay_certification',
    price: 0,
    description: 'Barangay certification confirming residency and death within the jurisdiction',
  },
  {
    id: 'tpl_brgy_employment',
    name: 'Barangay Certification - Employment',
    categoryId: 'barangay_certification',
    price: 0,
    description: 'Certification for local job application, employment onboarding, and pre-employment requirements',
  },
  {
    id: 'tpl_brgy_clearance_police_nbi',
    name: 'Barangay Clearance - Police / NBI / Court Clearance',
    categoryId: 'barangay_certification',
    price: 0,
    description: 'Clearance required for securing Police, NBI, or Court clearance',
  },
  {
    id: 'tpl_brgy_passport_visa',
    name: 'Barangay Certification - Passport, Postal & Visa Applications',
    categoryId: 'barangay_certification',
    price: 0,
    description: 'For passport application/renewal, postal ID, and foreign embassy visa applications',
  },
  {
    id: 'tpl_brgy_overseas_visa',
    name: 'Barangay Certification - Visa Extension / Overseas Employment',
    categoryId: 'barangay_certification',
    price: 0,
    description: 'For OFW requirements, overseas job placement, and visa extension',
  },
  {
    id: 'tpl_brgy_no_operation',
    name: 'Certificate of No Operation of Business',
    categoryId: 'barangay_certification',
    price: 0,
    description: 'Certification declaring business cessation or non-operation within the barangay',
  },
  {
    id: 'tpl_brgy_other_purposes',
    name: 'Barangay Certification - Other Purposes',
    categoryId: 'barangay_certification',
    price: 0,
    description: 'Official barangay certification for other legal and personal purposes',
  },
  {
    id: 'tpl_cert_residency',
    name: 'Certificate of Residency',
    categoryId: 'barangay_certification',
    price: 0,
    description: 'Official proof of bona fide residence in the barangay',
  },
  {
    id: 'tpl_good_moral',
    name: 'Certificate of Good Moral Character',
    categoryId: 'barangay_certification',
    price: 0,
    description: 'Attestation of good moral standing and lack of derogatory record',
  },
  {
    id: 'tpl_brgy_clearance',
    name: 'Barangay Clearance (General)',
    categoryId: 'barangay_certification',
    price: 0,
    description: 'General multipurpose barangay clearance',
  },

  // 2. Transient Employees & Worker Certification
  {
    id: 'tpl_transient_household',
    name: 'Kasambahay & Household Worker Certification',
    categoryId: 'transient_employees',
    price: 0,
    description: 'For domestic helpers, housemaids, family drivers, and household staff',
  },
  {
    id: 'tpl_transient_company',
    name: 'Company & Agency Worker Certification',
    categoryId: 'transient_employees',
    price: 0,
    description: 'For transient company employees, security guards, agency workers, and staff',
  },
  {
    id: 'tpl_transient_construction',
    name: 'Construction Project Worker Certification',
    categoryId: 'transient_employees',
    price: 0,
    description: 'For construction laborers, foremen, and temporary project workers',
  },
  {
    id: 'tpl_transient_other',
    name: 'Transient Worker Certification (Other)',
    categoryId: 'transient_employees',
    price: 0,
    description: 'Certification for other transient and temporary workers',
  },

  // 3. Lupon ng mga Tagapamayapa (Summons / CFA)
  {
    id: 'tpl_lupon_summons',
    name: 'Notice of Hearing / Summons (Patawag - KP Form #9)',
    categoryId: 'lupon_tagapamayapa',
    price: 0,
    description: 'Summons notice issued to respondents for Katarungang Pambarangay conciliation',
  },
  {
    id: 'tpl_lupon_cfa',
    name: 'Certificate to File Action (CFA - KP Form #20)',
    categoryId: 'lupon_tagapamayapa',
    price: 0,
    description: 'Certification authorizing the filing of action in regular court after failed conciliation',
  },
  {
    id: 'tpl_lupon_notice',
    name: 'Lupon Conciliation Notice',
    categoryId: 'lupon_tagapamayapa',
    price: 0,
    description: 'General notice of mediation and hearing schedule before the Lupon',
  },

  // 4. Business Clearance (New & Renewal)
  {
    id: 'tpl_business_micro_small',
    name: 'Business Clearance - Micro / Small Enterprise',
    categoryId: 'business_clearance',
    price: 0,
    description: 'Barangay clearance for sari-sari stores, kiosks, micro and small businesses',
  },
  {
    id: 'tpl_business_medium',
    name: 'Business Clearance - Medium Enterprise',
    categoryId: 'business_clearance',
    price: 0,
    description: 'Barangay business clearance for medium-sized commercial enterprises',
  },
  {
    id: 'tpl_business_large',
    name: 'Business Clearance - Large Enterprise',
    categoryId: 'business_clearance',
    price: 0,
    description: 'Barangay business clearance for large commercial establishments and corporations',
  },
  {
    id: 'tpl_business_renewal',
    name: 'Business Clearance Renewal',
    categoryId: 'business_clearance',
    price: 0,
    description: 'Annual barangay business clearance renewal for existing enterprises',
  },

  // 5. Construction Clearances
  {
    id: 'tpl_construction_new',
    name: 'New Structure Construction Permit',
    categoryId: 'construction_clearances',
    price: 0,
    description: 'Barangay permit for newly constructed residential or commercial buildings',
  },
  {
    id: 'tpl_construction_occupancy',
    name: 'Certificate of Occupancy Clearance',
    categoryId: 'construction_clearances',
    price: 0,
    description: 'Clearance required prior to obtaining city/municipal certificate of occupancy',
  },
  {
    id: 'tpl_construction_renovation',
    name: 'Renovation / Repair Clearance',
    categoryId: 'construction_clearances',
    price: 0,
    description: 'Clearance for interior/exterior remodeling, repairs, and minor improvements',
  },
  {
    id: 'tpl_construction_expansion',
    name: 'Building Expansion Permit',
    categoryId: 'construction_clearances',
    price: 0,
    description: 'Clearance for building extensions, additional storeys, or structural expansion',
  },
  {
    id: 'tpl_construction_fencing',
    name: 'Fencing Clearance',
    categoryId: 'construction_clearances',
    price: 0,
    description: 'Clearance for perimeter fence, gate, and perimeter boundary construction',
  },
  {
    id: 'tpl_construction_utilities',
    name: 'Installation of Electric Post / Utilities Clearance',
    categoryId: 'construction_clearances',
    price: 0,
    description: 'Permit for utility post erection, power line tapping, water, and telecom works',
  },
  {
    id: 'tpl_construction_excavation',
    name: 'Excavation Clearance',
    categoryId: 'construction_clearances',
    price: 0,
    description: 'Permit for earth-moving, digging, drainage, and ground excavation works',
  },
  {
    id: 'tpl_construction_demolition',
    name: 'Demolition Clearance',
    categoryId: 'construction_clearances',
    price: 0,
    description: 'Barangay clearance for demolition or dismantling of structures',
  },

  // 6. Delivery & Hauling Clearances
  {
    id: 'tpl_delivery_mixer',
    name: 'Concrete Mixer Delivery Entry Clearance',
    categoryId: 'delivery_hauling_clearances',
    price: 0,
    description: 'Entry and unloading permit for ready-mix concrete trucks and transit mixers',
  },
  {
    id: 'tpl_hauling_debris',
    name: 'Hauling of Debris / Waste Materials Clearance',
    categoryId: 'delivery_hauling_clearances',
    price: 0,
    description: 'Permit for hauling away construction rubble, demolition debris, and waste materials',
  },
  {
    id: 'tpl_delivery_sand_gravel',
    name: 'Delivery of Sand, Gravel & Filling Materials Clearance',
    categoryId: 'delivery_hauling_clearances',
    price: 0,
    description: 'Entry permit for trucks carrying sand, gravel, soil, and aggregate materials',
  },
  {
    id: 'tpl_delivery_heavy_equipment',
    name: 'Heavy Equipment / Construction Materials Delivery Clearance',
    categoryId: 'delivery_hauling_clearances',
    price: 0,
    description: 'Permit for heavy equipment delivery (cranes, backhoes, bulldozers, steel)',
  },

  // 7. Special & Commercial Permits
  {
    id: 'tpl_special_shooting',
    name: 'Commercial Shooting / Photography Permit',
    categoryId: 'special_commercial_permits',
    price: 0,
    description: 'Permit for film, TV, commercial photography, vlog, or advertisement shoot',
  },
  {
    id: 'tpl_special_cables',
    name: 'Installation of Cables & Wires Clearance',
    categoryId: 'special_commercial_permits',
    price: 0,
    description: 'Permit for telco, fiber optic, internet, and electrical cable laying or maintenance',
  },
  {
    id: 'tpl_special_flyers',
    name: 'Distribution of Promotional Materials / Flyers Permit',
    categoryId: 'special_commercial_permits',
    price: 0,
    description: 'Permit for room-to-room, street-level flyers, leaflet distribution, or sampling',
  },
  {
    id: 'tpl_special_activities',
    name: 'Other Special Activities Permit',
    categoryId: 'special_commercial_permits',
    price: 0,
    description: 'Permit for motorcades, exhibits, community events, and other special operations',
  },
];

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

export function getCategoryLabel(categoryId: string): string {
  const cat = OFFICIAL_DOCUMENT_CATEGORIES.find((c) => c.id === categoryId);
  return cat ? cat.labelEn : 'Barangay Certification';
}

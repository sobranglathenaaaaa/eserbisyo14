import type { DocumentCatalogItem } from '../types/models';

export const documentCatalog: DocumentCatalogItem[] = [
  { id: 'cert-school', category: 'Barangay Certification', type: 'School Requirement', price: 0 },
  { id: 'cert-assistance', category: 'Barangay Certification', type: 'Indigency / Financial / Medical / Educational Assistance', price: 0 },
  { id: 'cert-pwd-senior', category: 'Barangay Certification', type: 'PWD / Senior Citizen Application', price: 0 },
  { id: 'cert-health-card', category: 'Barangay Certification', type: 'Health Card Application', price: 0 },
  { id: 'cert-death', category: 'Barangay Certification', type: 'Death Certification', price: 0 },
  { id: 'cert-employment', category: 'Barangay Certification', type: 'Employment', price: 100 },
  { id: 'cert-clearance', category: 'Barangay Certification', type: 'Police / NBI / Court Clearance', price: 100 },
  { id: 'cert-passport', category: 'Barangay Certification', type: 'Passport / Postal / Visa Application', price: 100 },
  { id: 'cert-visa-ext', category: 'Barangay Certification', type: 'Visa Extension / Overseas Employment', price: 100 },
  { id: 'cert-no-business', category: 'Barangay Certification', type: 'No Operation of Business', price: 200 },
  { id: 'cert-other', category: 'Barangay Certification', type: 'Other purposes', price: 200 },

  { id: 'transient-household', category: 'Transient Employee/Worker', type: 'Household Employees', price: 100 },
  { id: 'transient-company', category: 'Transient Employee/Worker', type: 'Company Employees', price: 100 },
  { id: 'transient-construction', category: 'Transient Employee/Worker', type: 'Construction Workers', price: 100 },
  { id: 'transient-other', category: 'Transient Employee/Worker', type: 'Other Transient Workers', price: 100 },

  { id: 'lupon-summons', category: 'Lupon ng mga Tagapamayapa', type: 'Summons / Patawag (KP Form #9)', price: 100 },
  { id: 'lupon-notice', category: 'Lupon ng mga Tagapamayapa', type: 'Notice of Hearing / Reconciliation Notice (KP Form #8)', price: 100 },
  { id: 'lupon-action', category: 'Lupon ng mga Tagapamayapa', type: 'Certificate to File Action (CFA - KP Form #20)', price: 300 },
  { id: 'lupon-filing', category: 'Lupon ng mga Tagapamayapa', type: 'Lupon Filing Fee', price: 100 },

  { id: 'business-20k', category: 'Business Clearances', type: 'Capital up to 20,000', price: 500 },
  { id: 'business-200k', category: 'Business Clearances', type: 'Capital above 20,000 up to 200,000', price: 1000 },
  { id: 'business-over-200k', category: 'Business Clearances', type: 'Capital above 200,000', price: 1500 },

  { id: 'construct-new', category: 'Construction Clearances', type: 'Construction of New Structure', price: 1000, pricingNote: 'or 10/sq meter whichever is higher' },
  { id: 'occupancy-single', category: 'Construction Clearances', type: 'Occupancy - Single Detach', price: 1000 },
  { id: 'occupancy-apartment', category: 'Construction Clearances', type: 'Occupancy - Apartment per unit', price: 1000 },
  { id: 'occupancy-townhouse', category: 'Construction Clearances', type: 'Occupancy - Townhouse per unit', price: 1200 },
  { id: 'occupancy-condo', category: 'Construction Clearances', type: 'Occupancy - Condominium per unit', price: 1500 },
  { id: 'construction-fencing', category: 'Construction Clearances', type: 'Fencing', price: 1000 },
  { id: 'construction-electric-post', category: 'Construction Clearances', type: 'Installation of Electric or Communication Post', price: 1000 },
  { id: 'construction-water-excavation', category: 'Construction Clearances', type: 'Manila Water Excavation Point', price: 1000 },
  { id: 'construction-drainage-one-side', category: 'Construction Clearances', type: 'Drainage Works - 1 side', price: 1000 },
  { id: 'construction-drainage-two-side', category: 'Construction Clearances', type: 'Drainage Works - 2 sides', price: 2000 },
  { id: 'demolition-single', category: 'Construction Clearances', type: 'Demolition - Single Detach', price: 1000 },

  { id: 'delivery-concrete', category: 'Delivery and Hauling Clearance', type: 'Concrete Mixer per Trip', price: 300 },
  { id: 'delivery-debris', category: 'Delivery and Hauling Clearance', type: 'Hauling debris 10-wheeler and up per day', price: 1000 },
  { id: 'delivery-filling', category: 'Delivery and Hauling Clearance', type: 'Delivery of filling materials per day', price: 1000 },
  { id: 'delivery-equipment', category: 'Delivery and Hauling Clearance', type: 'Delivery of equipment/materials/fixtures per day', price: 2000 },
  { id: 'delivery-hauling-equipment', category: 'Delivery and Hauling Clearance', type: 'Hauling of equipment/materials per day', price: 2000 },

  { id: 'install-wires', category: 'Other Clearances', type: 'Installation of wires and cables per street', price: 1000 },
  { id: 'movie-shoot', category: 'Other Clearances', type: 'Movie/TV/Commercial shooting per day', price: 4000 },
  { id: 'flyers-distribution', category: 'Other Clearances', type: 'Business Fliers and Sampler Distribution per day', price: 1000 },
  { id: 'other-not-mentioned', category: 'Other Clearances', type: 'Purposes not mentioned above', price: 2000 },
];

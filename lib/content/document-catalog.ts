import type { DocumentCatalogItem } from '../types/models';

export const documentCatalog: DocumentCatalogItem[] = [
  // 1. Barangay Certification
  { id: 'cert-school', category: 'Barangay Certification', type: 'School Requirement', price: 0 },
  { id: 'cert-assistance', category: 'Barangay Certification', type: 'Indigency, Financial, Medical, or Educational Assistance', price: 0 },
  { id: 'cert-pwd-senior', category: 'Barangay Certification', type: 'PWD or Senior Citizen Application', price: 0 },
  { id: 'cert-health-card', category: 'Barangay Certification', type: 'Health Card Application', price: 0 },
  { id: 'cert-death', category: 'Barangay Certification', type: 'Death Certification', price: 0 },
  { id: 'cert-employment', category: 'Barangay Certification', type: 'Employment', price: 100 },
  { id: 'cert-clearance', category: 'Barangay Certification', type: 'Police, NBI, or Court Clearance Application', price: 100 },
  { id: 'cert-passport', category: 'Barangay Certification', type: 'Passport, Postal ID, or Visa Application', price: 100 },
  { id: 'cert-visa-ext', category: 'Barangay Certification', type: 'Visa Extension or Overseas Employment', price: 100 },
  { id: 'cert-no-business', category: 'Barangay Certification', type: 'Certificate of No Business Operation', price: 200 },
  { id: 'cert-other', category: 'Barangay Certification', type: 'Other Purposes Not Mentioned Above', price: 200 },

  // 2. Transient Employee/Worker Certification
  { id: 'transient-household', category: 'Transient Employee/Worker', type: 'Household Employees (Kasambahay, Driver, Caretaker, etc.)', price: 100 },
  { id: 'transient-company', category: 'Transient Employee/Worker', type: 'Company Employees', price: 100 },
  { id: 'transient-construction', category: 'Transient Employee/Worker', type: 'Construction Workers', price: 100 },
  { id: 'transient-other', category: 'Transient Employee/Worker', type: 'Other Transient Workers', price: 100 },

  // 3. Lupon ng mga Tagapamayapa Fees
  { id: 'lupon-filing', category: 'Lupon ng mga Tagapamayapa', type: 'Lupon Filing Fee', price: 100 },
  { id: 'lupon-action', category: 'Lupon ng mga Tagapamayapa', type: 'Certificate to File Action', price: 300 },

  // 4. Business Clearances (New and Renewal)
  { id: 'business-20k', category: 'Business Clearances', type: 'Not exceeding ₱20,000.00', price: 500 },
  { id: 'business-200k', category: 'Business Clearances', type: 'More than ₱20,000.00 but not exceeding ₱200,000.00', price: 1000 },
  { id: 'business-over-200k', category: 'Business Clearances', type: 'More than ₱200,000.00', price: 1500 },

  // 5. Construction Clearances
  { id: 'construct-new', category: 'Construction Clearances', type: 'Construction of a New Structure (Based on Total Accumulated Floor Area)', price: 1000, pricingNote: '₱1,000.00 or ₱10.00 per sq. m., whichever is higher' },
  { id: 'occupancy-single', category: 'Construction Clearances', type: 'Single-Detached House (Occupancy)', price: 1000 },
  { id: 'occupancy-apartment', category: 'Construction Clearances', type: 'Apartment (Per Unit - Occupancy)', price: 1000, pricingNote: 'Per Unit' },
  { id: 'occupancy-townhouse', category: 'Construction Clearances', type: 'Townhouse (Per Unit - Occupancy)', price: 1200, pricingNote: 'Per Unit' },
  { id: 'occupancy-condo', category: 'Construction Clearances', type: 'Condominium (Per Unit - Occupancy)', price: 1500, pricingNote: 'Per Unit' },
  { id: 'renovation-single', category: 'Construction Clearances', type: 'Single-Detached House (Renovation Without Expansion)', price: 1000 },
  { id: 'renovation-apartment', category: 'Construction Clearances', type: 'Apartment (Per Unit - Renovation Without Expansion)', price: 1000, pricingNote: 'Per Unit' },
  { id: 'renovation-townhouse', category: 'Construction Clearances', type: 'Townhouse (Per Unit - Renovation Without Expansion)', price: 1200, pricingNote: 'Per Unit' },
  { id: 'renovation-condo', category: 'Construction Clearances', type: 'Condominium (Per Unit - Renovation Without Expansion)', price: 1500, pricingNote: 'Per Unit' },
  { id: 'construct-expansion', category: 'Construction Clearances', type: 'Expansion Based on Total Accumulated Floor Area', price: 1000, pricingNote: '₱1,000.00 or ₱10.00 per sq. m., whichever is higher' },
  { id: 'renovation-with-expansion', category: 'Construction Clearances', type: 'Renovation With Expansion', price: 1000, pricingNote: 'Sum of Sec 5.3 (Renovation Without Expansion) + Sec 5.4 (Expansion Only)' },
  { id: 'construction-fencing', category: 'Construction Clearances', type: 'Fencing Clearance', price: 1000 },
  { id: 'construction-electric-post', category: 'Construction Clearances', type: 'Installation of Electric or Communication Posts (Per Post)', price: 1000, pricingNote: 'Per Post' },
  { id: 'construction-water-excavation', category: 'Construction Clearances', type: 'Manila Water Excavation (Per Excavation Point)', price: 1000, pricingNote: 'Per Excavation Point' },
  { id: 'construction-drainage-one-side', category: 'Construction Clearances', type: 'Drainage Works (Per Street, One Side)', price: 1000, pricingNote: 'Per Street, One Side' },
  { id: 'construction-drainage-two-side', category: 'Construction Clearances', type: 'Drainage Works (Per Street, Both Sides)', price: 2000, pricingNote: 'Per Street, Both Sides' },
  { id: 'construction-other-excavation', category: 'Construction Clearances', type: 'Other Excavation Works Not Mentioned Above (Per Excavation Point)', price: 1000, pricingNote: 'Per Excavation Point' },
  { id: 'demolition-single', category: 'Construction Clearances', type: 'Single-Detached House (Demolition)', price: 1000 },
  { id: 'demolition-apartment', category: 'Construction Clearances', type: 'Apartment (Per Unit - Demolition)', price: 1000, pricingNote: 'Per Unit' },
  { id: 'demolition-townhouse', category: 'Construction Clearances', type: 'Townhouse (Per Unit - Demolition)', price: 1200, pricingNote: 'Per Unit' },
  { id: 'demolition-condo', category: 'Construction Clearances', type: 'Condominium (Per Unit - Demolition)', price: 1500, pricingNote: 'Per Unit' },

  // 6. Delivery and Hauling Clearance
  { id: 'delivery-concrete', category: 'Delivery and Hauling Clearance', type: 'Concrete Pouring Using a Concrete Mixer (Per Trip)', price: 300, pricingNote: 'Per Trip' },
  { id: 'delivery-debris', category: 'Delivery and Hauling Clearance', type: 'Hauling of Debris Using a 10-Wheeler Truck or Larger (Per Truck, Per Day)', price: 1000, pricingNote: 'Per Truck, Per Day' },
  { id: 'delivery-filling', category: 'Delivery and Hauling Clearance', type: 'Delivery of Filling Materials Using a 10-Wheeler Truck or Larger (Per Truck, Per Day)', price: 1000, pricingNote: 'Per Truck, Per Day' },
  { id: 'delivery-equipment', category: 'Delivery and Hauling Clearance', type: 'Delivery of Equipment, Materials, and Fixtures Using a 10-Wheeler Truck or Larger (Per Truck, Per Day)', price: 2000, pricingNote: 'Per Truck, Per Day' },
  { id: 'delivery-hauling-equipment', category: 'Delivery and Hauling Clearance', type: 'Hauling of Equipment and Materials Using a 10-Wheeler Truck or Larger (Per Truck, Per Day)', price: 2000, pricingNote: 'Per Truck, Per Day' },

  // 7. Special & Commercial Permits
  { id: 'install-wires', category: 'Special & Commercial Permits', type: 'Installation of Wires and Cables (Per Street)', price: 1000, pricingNote: 'Per Street' },
  { id: 'movie-shoot', category: 'Special & Commercial Permits', type: 'Movie, Television, or Commercial Shooting (Per Day)', price: 4000, pricingNote: 'Per Day' },
  { id: 'flyers-distribution', category: 'Special & Commercial Permits', type: 'Distribution of Business Flyers and Product Samples (Per Day)', price: 1000, pricingNote: 'Per Day' },
  { id: 'other-not-mentioned', category: 'Special & Commercial Permits', type: 'Other Purposes Not Mentioned Above', price: 2000 },
];

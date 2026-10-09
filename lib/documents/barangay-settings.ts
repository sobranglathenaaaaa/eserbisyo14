export type KagawadItem = {
  id: string;
  name: string;
  committee: string;
};

export type BarangayOfficialSettings = {
  barangayName: string;
  cityName: string;
  barangayAddress: string;
  barangayEmail: string;
  barangayPhone: string;
  punongBarangay: string;
  barangaySecretary: string;
  barangayTreasurer: string;
  kagawadList: KagawadItem[];
  countryLogoUrl: string;
  cityLogoUrl: string;
  barangayLogoUrl: string;
  watermarkLogoUrl: string;
};

export const BARANGAY_OFFICIAL_SETTINGS_KEY = 'eserbisyo_barangay_official_settings_v1';

export const DEFAULT_BARANGAY_OFFICIAL_SETTINGS: BarangayOfficialSettings = {
  barangayName: 'BARANGAY PROGRESO',
  cityName: 'City Of San Juan',
  barangayAddress: '#15 M. Cruz Street Barangay Progreso, San Juan City',
  barangayEmail: 'barangayprogreso@yahoo.com',
  barangayPhone: '(02)8727-5635 / (02)76258731',
  punongBarangay: 'CESAR JR. H. STO. DOMINGO',
  barangaySecretary: 'Ma. Theresa R. Dela Cruz',
  barangayTreasurer: 'Saturnina C. Mirata',
  kagawadList: [
    { id: 'k1', name: 'Carmencita H. Sto. Domingo', committee: 'Peace and Order/BADAC Traffic and Parking Management Committee' },
    { id: 'k2', name: 'Mary Antoinette P. Salayon', committee: 'Disaster Management and RedCross 143/Barangay Volunteers Citizen Program Committee' },
    { id: 'k3', name: 'Rodelio O. Santos', committee: 'Livelihood, Entrepreneurship & Public Enterprise Committee' },
    { id: 'k4', name: 'Darryl S. Eustaquio', committee: 'Infrastructure and Public Works Committee' },
    { id: 'k5', name: 'Amafel T. Ingalla', committee: 'Health, Nutrition and Women and Children\'s Welfare Committee' },
    { id: 'k6', name: 'Renar M. Mendoza', committee: 'Ways & Means, Appropriations, Education, Public Information, Cultural Affairs Committee' },
    { id: 'k7', name: 'Raymund Marcel B. Fontamillas', committee: 'Clean & Green and Solid Waste Management Committee' },
    { id: 'k8', name: 'Anton Jose T. Cabrillas', committee: 'SK-Chairperson Youth Sports Development' },
  ],
  countryLogoUrl: '/images/indigency-template/bagong-pilipinas.png',
  cityLogoUrl: '/images/indigency-template/san-juan-seal.jpeg',
  barangayLogoUrl: '/images/indigency-template/barangay-progreso-seal.jpeg',
  watermarkLogoUrl: '/images/indigency-template/barangay-progreso-seal.jpeg',
};

export function getBarangayOfficialSettings(): BarangayOfficialSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_BARANGAY_OFFICIAL_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(BARANGAY_OFFICIAL_SETTINGS_KEY);
    if (!raw) return DEFAULT_BARANGAY_OFFICIAL_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BARANGAY_OFFICIAL_SETTINGS,
      ...parsed,
      kagawadList: Array.isArray(parsed.kagawadList) && parsed.kagawadList.length > 0
        ? parsed.kagawadList
        : DEFAULT_BARANGAY_OFFICIAL_SETTINGS.kagawadList,
    };
  } catch (err) {
    console.warn('Failed to load barangay official settings from localStorage:', err);
    return DEFAULT_BARANGAY_OFFICIAL_SETTINGS;
  }
}

export function saveBarangayOfficialSettings(settings: Partial<BarangayOfficialSettings>): BarangayOfficialSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_BARANGAY_OFFICIAL_SETTINGS;
  }
  try {
    const current = getBarangayOfficialSettings();
    const updated: BarangayOfficialSettings = {
      ...current,
      ...settings,
    };
    localStorage.setItem(BARANGAY_OFFICIAL_SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('barangay-official-settings-updated', { detail: updated }));
    return updated;
  } catch (err) {
    console.error('Failed to save barangay official settings:', err);
    return DEFAULT_BARANGAY_OFFICIAL_SETTINGS;
  }
}

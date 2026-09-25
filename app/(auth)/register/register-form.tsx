'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from '../auth.module.css';
import LegalModal from '@/components/legal-modal';
import { registerResident } from '../../../lib/frontend-data/store';

const MAX_ID_UPLOAD_BYTES = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const REGISTRATION_DRAFT_KEY = 'eserbisyo.registration-draft.v1';
const citizenshipSuggestions = [
  'Filipino',
  'American',
  'Australian',
  'British',
  'Canadian',
  'Chinese',
  'Indian',
  'Japanese',
  'Korean',
];

interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  sex: string;
  civilStatus: string;
  citizenship: string;
  birthdate: string;
  addressLine: string;
  province: string;
  city: string;
  barangay: string;
  contactNumber: string;
  email: string;
  idType: string;
  idNumber: string;
  idImageFileFront: File | null;
  idImageFileBack: File | null;
  password: string;
  confirmPassword: string;
  terms: boolean;
  dataPrivacy: boolean;
}

const initialState: FormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  sex: '',
  civilStatus: '',
  citizenship: 'Filipino',
  birthdate: '',
  addressLine: '',
  province: 'Metro Manila',
  city: 'San Juan',
  barangay: 'Progreso',
  contactNumber: '',
  email: '',
  idType: '',
  idNumber: '',
  idImageFileFront: null,
  idImageFileBack: null,
  password: '',
  confirmPassword: '',
  terms: false,
  dataPrivacy: false,
};

async function clearRegistrationDraft() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(REGISTRATION_DRAFT_KEY);
  }
}

function focusFieldById(fieldId: string) {
  if (typeof document === 'undefined') return;
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (field instanceof HTMLElement) {
    field.focus();
  }
}

function getFirstMissingRequiredField(form: FormState): { fieldId: string; message: string } | null {
  const requiredTextFields: Array<{ fieldId: string; value: string; message: string }> = [
    { fieldId: 'first-name', value: form.firstName, message: 'Please enter your first name.' },
    { fieldId: 'last-name', value: form.lastName, message: 'Please enter your last name.' },
    { fieldId: 'sex', value: form.sex, message: 'Please select your sex.' },
    { fieldId: 'civil-status', value: form.civilStatus, message: 'Please select your civil status.' },
    { fieldId: 'birthdate', value: form.birthdate, message: 'Please select your birthdate.' },
    { fieldId: 'address-line', value: form.addressLine, message: 'Please enter your street address.' },
    { fieldId: 'province', value: form.province, message: 'Please enter your province.' },
    { fieldId: 'barangay', value: form.barangay, message: 'Please enter your barangay.' },
    { fieldId: 'contact-number', value: form.contactNumber, message: 'Please enter your contact number.' },
    { fieldId: 'register-email', value: form.email, message: 'Please enter your email address.' },
    { fieldId: 'id-type', value: form.idType, message: 'Please select your ID type.' },
    { fieldId: 'id-number', value: form.idNumber, message: 'Please enter your ID number.' },
    { fieldId: 'register-password', value: form.password, message: 'Please enter a password.' },
    { fieldId: 'confirm-password', value: form.confirmPassword, message: 'Please confirm your password.' },
  ];

  for (const field of requiredTextFields) {
    if (!field.value.trim()) {
      return { fieldId: field.fieldId, message: field.message };
    }
  }

  return null;
}

async function compressImage(file: File): Promise<File> {
  if (typeof window === 'undefined') return file;

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Unable to process the selected image.'));
      img.src = imageUrl;
    });

    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to prepare image compression.');
    }
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const qualitySteps = [0.82, 0.72, 0.62, 0.52];
    let blob: Blob | null = null;

    for (const quality of qualitySteps) {
      // Keep trying lower quality until we hit upload size limits.
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, quality));
      if (blob && blob.size <= MAX_ID_UPLOAD_BYTES) {
        break;
      }
    }

    if (!blob) {
      throw new Error('Unable to compress image.');
    }

    return new File([blob], file.name, {
      type: outputType,
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function RegisterForm({ initialLegalDocuments }: { initialLegalDocuments?: any[] } = {}) {
  const [isMounted, setIsMounted] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [draftWasRestored, setDraftWasRestored] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const restoreDraft = async () => {
      try {
        const rawDraft = window.localStorage.getItem(REGISTRATION_DRAFT_KEY);
        const storedDraft = rawDraft ? (JSON.parse(rawDraft) as Partial<FormState>) : null;

        if (cancelled) return;

        if (storedDraft) {
          setForm((previous) => ({
            ...previous,
            ...storedDraft,
            password: '',
            confirmPassword: '',
            idImageFileFront: null,
            idImageFileBack: null,
          }));
          setDraftWasRestored(true);
        }
      } catch {
        window.localStorage.removeItem(REGISTRATION_DRAFT_KEY);
      } finally {
        if (!cancelled) {
          setIsDraftReady(true);
          setIsMounted(true);
        }
      }
    };

    void restoreDraft();
    return () => {
      cancelled = true;
    };
  }, []);

  const [form, setForm] = useState<FormState>(initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [legalModalSlug, setLegalModalSlug] = useState<'terms-and-conditions' | 'data-privacy' | null>(null);
  const [initialLegalDocs] = useState(initialLegalDocuments ?? null);

  useEffect(() => {
    if (!isDraftReady) return;

    const timeout = window.setTimeout(() => {
      const {
        idImageFileFront: _front,
        idImageFileBack: _back,
        password: _password,
        confirmPassword: _confirmPassword,
        ...draft
      } = form;
      try {
        window.localStorage.setItem(
          REGISTRATION_DRAFT_KEY,
          JSON.stringify({ ...draft, savedAt: new Date().toISOString() })
        );
      } catch {
        // Keep the form usable when browser storage is unavailable or full.
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [form, isDraftReady]);

  function maskBirthdateDisplay(raw: string) {
    const digits = (raw || '').replace(/\D/g, '');
    const placeholders = ['y', 'y', 'y', 'y', '/', 'm', 'm', '/', 'd', 'd'];
    const out: string[] = [];
    let di = 0;
    for (let i = 0; i < placeholders.length; i++) {
      const ph = placeholders[i];
      if (ph === '/') {
        out.push('/');
        continue;
      }
      if (di < digits.length) {
        out.push(digits[di]);
        di += 1;
      } else {
        out.push(ph);
      }
    }
    return out.join('');
  }

  function renderMaskedHtml(raw: string) {
    const display = maskBirthdateDisplay(raw);
    // build HTML with spans for digits/placeholders/slashes
    let out = '';
    for (const ch of display) {
      if (/[0-9]/.test(ch)) {
        out += `<span class="${styles.digit}">${ch}</span>`;
      } else if (ch === '/') {
        out += `<span class="${styles.slash}">${ch}</span>`;
      } else {
        out += `<span class="${styles.placeholder}">${ch}</span>`;
      }
    }
    return out;
  }

  useEffect(() => {
    // We only want to auto-revoke when the preview URLs are REPLACED, 
    // but not strictly on every unmount because the summary modal needs them.
    // React strict mode + unmount can sometimes prematurely revoke.
    return () => {
      // Intentionally empty to keep Blob URLs alive for the session/modal
    };
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const missingField = getFirstMissingRequiredField(form);
    if (missingField) {
      setError(missingField.message);
      focusFieldById(missingField.fieldId);
      return;
    }

    if (!form.terms) {
      setError('Please agree to the Terms and Conditions.');
      focusFieldById('terms-consent');
      return;
    }

    // Validate contact number is exactly 11 digits
    if (!/^\d{11}$/.test(form.contactNumber)) {
      setError('Contact number must be 11 digits.');
      focusFieldById('contact-number');
      return;
    }

    if (!form.dataPrivacy) {
      setError('Please accept the Data Privacy Policy.');
      focusFieldById('privacy-consent');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Comprehensive birthdate validation (accepts yyyy/mm/dd or yyyy-mm-dd)
    if (form.birthdate) {
      const parts = form.birthdate.replace(/-/g, '/').split('/');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);

      const selected = new Date(year, month - 1, day);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // 1. Basic format / range check (Month 1-12)
      if (month < 1 || month > 12) {
        setError('Invalid month in birthdate (must be 01-12).');
        focusFieldById('birthdate');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 2. Validate day of month (catches Feb 30, etc.)
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day < 1 || day > daysInMonth) {
        setError(`Invalid day for the selected month (max ${daysInMonth}).`);
        focusFieldById('birthdate');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 3. Prevent future dates
      if (selected > now) {
        setError('Birthdate cannot be in the future.');
        focusFieldById('birthdate');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 4. Sanity check for extremely old dates (e.g., year 1000)
      if (year < 1900) {
        setError('Please enter a valid birth year (1900 or later).');
        focusFieldById('birthdate');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    if (!(form.idImageFileFront instanceof File)) {
      setError('Upload front picture of ID is required.');
      focusFieldById('id-image-front-file');
      return;
    }

    if (!(form.idImageFileBack instanceof File)) {
      setError('Upload back picture of ID is required.');
      focusFieldById('id-image-back-file');
      return;
    }

    if (!allowedMimeTypes.has(form.idImageFileFront.type) || !allowedMimeTypes.has(form.idImageFileBack.type)) {
      setError('Only JPG, PNG, or WEBP files are allowed for ID upload.');
      return;
    }

    // All validations passed, show summary modal
    setShowSummaryModal(true);
    // Scroll the entire page to the center so the modal appears focused and centered
    if (typeof window !== 'undefined') {
      window.scrollTo({ 
        top: document.body.scrollHeight / 2 - window.innerHeight / 2, 
        behavior: 'smooth' 
      });
    }
  };

  const handleConfirmRegistration = async () => {
    setIsSubmitting(true);
    let uploadFront = form.idImageFileFront as File;
    let uploadBack = form.idImageFileBack as File;
    try {
      uploadFront = await compressImage(form.idImageFileFront as File);
      uploadBack = await compressImage(form.idImageFileBack as File);
    } catch (compressionError) {
      setIsSubmitting(false);
      setShowSummaryModal(false);
      setError(compressionError instanceof Error ? compressionError.message : 'Unable to prepare ID upload.');
      return;
    }

    if (uploadFront.size > MAX_ID_UPLOAD_BYTES || uploadBack.size > MAX_ID_UPLOAD_BYTES) {
      setIsSubmitting(false);
      setShowSummaryModal(false);
      setError('Compressed ID images must be 5MB or smaller.');
      return;
    }

    const result = await registerResident({
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim() || undefined,
      lastName: form.lastName.trim(),
      suffix: form.suffix.trim() || undefined,
      sex: form.sex,
      civilStatus: form.civilStatus,
      citizenship: form.citizenship.trim(),
      // normalize display yyyy/mm/dd to backend-friendly yyyy-mm-dd
      birthdate: form.birthdate ? form.birthdate.replace(/\//g, '-') : form.birthdate,
      addressLine: form.addressLine.trim(),
      province: 'Metro Manila',
      city: 'San Juan',
      barangay: 'Progreso',
      contactNumber: form.contactNumber.trim(),
      email: form.email.trim(),
      idType: form.idType,
      idNumber: form.idNumber.trim(),
      idImageFileFront: uploadFront,
      idImageFileBack: uploadBack,
      password: form.password,
      termsAccepted: form.terms,
      privacyAccepted: form.dataPrivacy,
    });

    setIsSubmitting(false);
    setShowSummaryModal(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    await clearRegistrationDraft();
    const nextEmail = encodeURIComponent(result.data.email);
    const warningParam = result.data.warning ? `&warning=${encodeURIComponent(result.data.warning)}` : '';
    if (result.data.verificationRequired) {
      router.push(`/verify-email?registered=1&email=${nextEmail}${warningParam}`);
      return;
    }
    router.push(`/login?registered=1&email=${nextEmail}${warningParam}`);
  };

  if (!isMounted) return null;

  return (
    <>
      <header>
        <h1 className={styles.pageHeading}>Resident registration</h1>
        <p className={styles.pageIntro}>
          Create your profile to submit requests, track status updates, and receive barangay service notifications.
        </p>
        {draftWasRestored ? (
          <p className={styles.helperText} role="status">
            Your previous registration details were restored. Please enter your password again to continue.
          </p>
        ) : null}
      </header>

      <form className={styles.authForm} onSubmit={onSubmit} noValidate>
        {error ? (
          <p className={styles.errorBanner} role="alert" aria-live="assertive">
            {error}
          </p>
        ) : null}

        <section className={styles.formSection}>
          <h2 className={styles.sectionHeading}>User Information</h2>

          <div className={styles.formGridFour}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="first-name">
                First Name
              </label>
              <input
                className={styles.input}
                id="first-name"
                type="text"
                placeholder="Juan"
                required
                value={form.firstName}
                onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="middle-name">
                Middle Name
              </label>
              <input
                className={styles.input}
                id="middle-name"
                type="text"
                placeholder="Dela"
                value={form.middleName}
                onChange={(event) => setForm((prev) => ({ ...prev, middleName: event.target.value }))}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="last-name">
                Last Name
              </label>
              <input
                className={styles.input}
                id="last-name"
                type="text"
                placeholder="Cruz"
                required
                value={form.lastName}
                onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="suffix">
                Suffix
              </label>
              <input
                className={styles.input}
                id="suffix"
                type="text"
                placeholder="Jr., Sr., III"
                value={form.suffix}
                onChange={(event) => setForm((prev) => ({ ...prev, suffix: event.target.value }))}
              />
            </div>
          </div>

          <div className={styles.formGridFour}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="sex">
                Sex
              </label>
              <select
                className={styles.select}
                id="sex"
                required
                value={form.sex}
                onChange={(event) => setForm((prev) => ({ ...prev, sex: event.target.value }))}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="civil-status">
                Civil Status
              </label>
              <select
                className={styles.select}
                id="civil-status"
                required
                value={form.civilStatus}
                onChange={(event) => setForm((prev) => ({ ...prev, civilStatus: event.target.value }))}
              >
                <option value="">Select</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Separated">Separated</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="citizenship">
                Citizenship
              </label>
              <input
                className={styles.input}
                id="citizenship"
                type="text"
                autoComplete="country-name"
                placeholder="Filipino"
                value={form.citizenship}
                onChange={(event) => setForm((prev) => ({ ...prev, citizenship: event.target.value }))}
                required
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="birthdate">
                Birthdate
              </label>
              <div className={styles.maskWrap}>
                <input
                  className={`${styles.input} ${styles.maskInput}`}
                  id="birthdate"
                  type="text"
                  required
                  placeholder="yyyy/mm/dd"
                  pattern="\\d{4}\/\\d{2}\/\\d{2}"
                  title="Enter birthdate in yyyy/mm/dd format"
                  inputMode="numeric"
                  value={form.birthdate}
                  onChange={(event) => {
                    const raw = event.target.value;
                    // Keep digits only, then format as yyyy/mm/dd while typing
                    const digits = raw.replace(/\D/g, '');
                    const y = digits.slice(0, 4);
                    const m = digits.slice(4, 6);
                    const d = digits.slice(6, 8);
                    let formatted = y;
                    if (m) formatted += `/${m}`;
                    if (d) formatted += `/${d}`;
                    // enforce max length yyyy/mm/dd
                    formatted = formatted.slice(0, 10);
                    setForm((prev) => ({ ...prev, birthdate: formatted }));
                  }}
                />
                <div className={styles.maskOverlay} dangerouslySetInnerHTML={{ __html: renderMaskedHtml(form.birthdate) }} />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.formSection}>
          <h2 className={styles.sectionHeading}>Contact Information</h2>

          <div className={styles.formField}>
            <label className={styles.fieldLabel} htmlFor="address-line">
              House/Unit/Building/Village/Street
            </label>
            <input
              className={styles.input}
              id="address-line"
              type="text"
              placeholder="123 Main St"
              required
              value={form.addressLine}
              onChange={(event) => setForm((prev) => ({ ...prev, addressLine: event.target.value }))}
            />
          </div>

          <div className={styles.formGridFour}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="province">
                Province
              </label>
              <input
                className={styles.input}
                id="province"
                type="text"
                placeholder="Metro Manila"
                required
                readOnly
                value={form.province}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="city">
                City
              </label>
              <input
                className={styles.input}
                id="city"
                type="text"
                placeholder="San Juan"
                readOnly
                value={form.city}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="barangay">
                Barangay
              </label>
              <input
                className={styles.input}
                id="barangay"
                type="text"
                placeholder="Progreso"
                required
                readOnly
                value={form.barangay}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="contact-number">
                Contact
              </label>
              <input
                className={styles.input}
                id="contact-number"
                type="tel"
                placeholder="09123456789"
                required
                inputMode="numeric"
                pattern="\d{11}"
                value={form.contactNumber}
                onChange={(event) => {
                  // allow only digits and limit to 11
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
                  setForm((prev) => ({ ...prev, contactNumber: digits }));
                }}
              />
            </div>
          </div>
        </section>

        <section className={styles.formSection}>
          <h2 className={styles.sectionHeading}>Account Credentials</h2>

          <div className={styles.formGridTwo}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="register-email">
                Email
              </label>
              <input
                className={styles.input}
                id="register-email"
                type="email"
                placeholder="john@example.com"
                required
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="register-password">
                Password
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  className={`${styles.input} ${styles.inputWithToggle}`}
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  required
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                />
                <button
                  type="button"
                  className={styles.passwordToggleBtn}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className={styles.eyeIcon} /> : <Eye className={styles.eyeIcon} />}
                </button>
              </div>
            </div>
          </div>

          <div className={styles.formGridTwo}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="id-type">
                ID Type
              </label>
              <select
                className={styles.select}
                id="id-type"
                required
                value={form.idType}
                onChange={(event) => setForm((prev) => ({ ...prev, idType: event.target.value }))}
              >
                <option value="">Select government ID</option>
                <option value="Passport">Passport</option>
                <option value="Driver's License">Driver's License</option>
                <option value="UMID">UMID</option>
                <option value="PhilSys ID">PhilSys ID</option>
                <option value="PRC ID">PRC ID</option>
                <option value="Postal ID">Postal ID</option>
                <option value="School ID">School ID</option>
                <option value="Voter's ID">Voter's ID</option>
                <option value="Senior Citizen ID">Senior Citizen ID</option>
                <option value="PWD ID">PWD ID</option>
                <option value="Other Government ID">Other Government ID</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="confirm-password">
                Confirm Password
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  className={`${styles.input} ${styles.inputWithToggle}`}
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="********"
                  required
                  value={form.confirmPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                />
                <button
                  type="button"
                  className={styles.passwordToggleBtn}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className={styles.eyeIcon} /> : <Eye className={styles.eyeIcon} />}
                </button>
              </div>
            </div>
          </div>

          <div className={styles.formGridTwo}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="id-number">
                ID Number
              </label>
              <input
                className={styles.input}
                id="id-number"
                type="text"
                placeholder="Any valid ID number"
                required
                value={form.idNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, idNumber: event.target.value }))}
              />
            </div>
            <div className={styles.formField} />
          </div>

          <div className={styles.formGridTwo}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="id-image-front-file">
                Upload Picture of ID (Front)
              </label>
              <div className={styles.fileInputWrap}>
              <input
                className={styles.input}
                id="id-image-front-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={async (event) => {
                  const selectedFile = event.target.files?.[0] ?? null;
                  // quick check: if filenames+size+lastModified equal, treat as same
                  const other = form.idImageFileBack;
                  if (selectedFile && other) {
                    const sameQuick =
                      selectedFile.name === other.name &&
                      selectedFile.size === other.size &&
                      selectedFile.lastModified === other.lastModified;
                    if (!sameQuick) {
                      try {
                        const [h1, h2] = await Promise.all([computeFileHash(selectedFile), computeFileHash(other)]);
                        if (h1 === h2) {
                          setError('Front and back images cannot be the same file.');
                          // clear the newly selected front file
                          (event.target as HTMLInputElement).value = '';
                          return;
                        }
                      } catch (e) {
                        // hashing failed; fall back to quick check
                      }
                    } else {
                      setError('Front and back images cannot be the same file.');
                      (event.target as HTMLInputElement).value = '';
                      return;
                    }
                  }

                  setForm((prev) => ({ ...prev, idImageFileFront: selectedFile }));
                  if (selectedFile) {
                    const prev = frontPreviewUrl;
                    try {
                      const url = URL.createObjectURL(selectedFile);
                      setFrontPreviewUrl(url);
                      if (prev) URL.revokeObjectURL(prev);
                    } catch (e) {
                      // ignore
                    }
                  } else {
                    if (frontPreviewUrl) {
                      URL.revokeObjectURL(frontPreviewUrl);
                      setFrontPreviewUrl(null);
                    }
                  }
                }}
              />
              {frontPreviewUrl && form.idImageFileFront && (
                <button
                  type="button"
                  className={styles.filePreviewLink}
                  onClick={() => {
                    const file = form.idImageFileFront;
                    if (!file) return;

                    const blobUrl = URL.createObjectURL(file);
                    window.open(blobUrl, '_blank');
                    // We don't revoke immediately because the new tab needs it to load
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                  }}
                >
                  Open full image
                </button>
              )}
              </div>
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="id-image-back-file">
                Upload Picture of ID (Back)
              </label>
              <div className={styles.fileInputWrap}>
              <input
                className={styles.input}
                id="id-image-back-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={async (event) => {
                  const selectedFile = event.target.files?.[0] ?? null;
                  const other = form.idImageFileFront;
                  if (selectedFile && other) {
                    const sameQuick =
                      selectedFile.name === other.name &&
                      selectedFile.size === other.size &&
                      selectedFile.lastModified === other.lastModified;
                    if (!sameQuick) {
                      try {
                        const [h1, h2] = await Promise.all([computeFileHash(selectedFile), computeFileHash(other)]);
                        if (h1 === h2) {
                          setError('Front and back images cannot be the same file.');
                          (event.target as HTMLInputElement).value = '';
                          return;
                        }
                      } catch (e) {
                        // hashing failed; fall back to quick check
                      }
                    } else {
                      setError('Front and back images cannot be the same file.');
                      (event.target as HTMLInputElement).value = '';
                      return;
                    }
                  }

                  setForm((prev) => ({ ...prev, idImageFileBack: selectedFile }));
                  if (selectedFile) {
                    const prev = backPreviewUrl;
                    const url = URL.createObjectURL(selectedFile);
                    setBackPreviewUrl(url);
                    if (prev) {
                      try {
                        URL.revokeObjectURL(prev);
                      } catch (e) { /* ignore */ }
                    }
                  } else {
                    if (backPreviewUrl) {
                      try {
                        URL.revokeObjectURL(backPreviewUrl);
                      } catch (e) { /* ignore */ }
                      setBackPreviewUrl(null);
                    }
                  }
                }}
              />
              {backPreviewUrl && form.idImageFileBack && (
                <button
                  type="button"
                  className={styles.filePreviewLink}
                  onClick={() => {
                    const file = form.idImageFileBack;
                    if (!file) return;

                    const blobUrl = URL.createObjectURL(file);
                    window.open(blobUrl, '_blank');
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                  }}
                >
                  Open full image
                </button>
              )}
              </div>
            </div>
          </div>
          <p className={styles.helperText}>Accepted formats: JPG, PNG, WEBP. Max size after compression: 5MB.</p>
        </section>

        <div className={styles.checkControl}>
          <input
            id="terms-consent"
            type="checkbox"
            checked={form.terms}
            onChange={(event) => setForm((prev) => ({ ...prev, terms: event.target.checked }))}
          />
          <label htmlFor="terms-consent">
            I agree to the{' '}
            <button type="button" className={styles.linkText} onClick={() => setLegalModalSlug('terms-and-conditions')}>
              Terms and Conditions
            </button>
          </label>
        </div>

        <div className={styles.checkControl}>
          <input
            id="privacy-consent"
            type="checkbox"
            checked={form.dataPrivacy}
            onChange={(event) => setForm((prev) => ({ ...prev, dataPrivacy: event.target.checked }))}
          />
          <label htmlFor="privacy-consent">
            I accept the{' '}
            <button type="button" className={styles.linkText} onClick={() => setLegalModalSlug('data-privacy')}>
              Data Privacy Policy
            </button>
          </label>
        </div>

        <button className={styles.primaryBtn} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create resident account'}
        </button>
      </form>

      {/* Terms and Data Privacy links temporarily disabled in registration */}
      {showSummaryModal && (
        <SummaryModal
          form={form}
          frontPreviewUrl={frontPreviewUrl}
          backPreviewUrl={backPreviewUrl}
          onConfirm={handleConfirmRegistration}
          onCancel={() => setShowSummaryModal(false)}
          isSubmitting={isSubmitting}
        />
      )}

      <LegalModal
        slug={legalModalSlug}
        open={Boolean(legalModalSlug)}
        onClose={() => setLegalModalSlug(null)}
        onAgree={() => {
          if (legalModalSlug === 'terms-and-conditions') {
            setForm((prev) => ({ ...prev, terms: true }));
          }
          if (legalModalSlug === 'data-privacy') {
            setForm((prev) => ({ ...prev, dataPrivacy: true }));
          }
          setLegalModalSlug(null);
        }}
        initialDocuments={initialLegalDocs}
      />

    </>
  );
}

function SummaryModal({
  form,
  frontPreviewUrl,
  backPreviewUrl,
  onConfirm,
  onCancel,
  isSubmitting,
}: {
  form: FormState;
  frontPreviewUrl: string | null;
  backPreviewUrl: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" style={{ backdropFilter: 'blur(4px)' }}>
      <div className={styles.modalContent} style={{ background: '#f0fdf4' }}>
        <div className={styles.modalHeader} style={{ background: '#1a6b4f', color: '#fff', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontWeight: 'bold', flex: 1, textAlign: 'center', fontSize: '1.25rem' }}>Confirm Your Information</h3>
          <button className={styles.modalClose} onClick={onCancel} aria-label="Close" style={{ color: '#fff' }}>
            ✕
          </button>
        </div>

        <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', fontSize: '1rem', overflowY: 'auto' }}>
          {/* Column 1: Review Details */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h4 style={{ margin: 0, color: 'var(--text-900)', fontWeight: 600, borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.25rem' }}>
              Review Your Details
            </h4>
            <div style={{ border: '2px solid #1a6b4f', borderRadius: '1rem', padding: '0.75rem', background: '#fff', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <h5 style={{ margin: '0 0 0.25rem 0', color: '#1a6b4f', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>User Information</h5>
                <div style={{ display: 'grid', gap: '0.25rem', paddingLeft: '0.5rem', borderLeft: '2px solid #f0fdf4' }}>
                  <p style={{ margin: 0, fontSize: '1rem' }}><span style={{ color: 'var(--text-600)' }}>Full Name:</span> <strong style={{ fontSize: '1.02rem' }}>{`${form.firstName} ${form.middleName ? form.middleName + ' ' : ''}${form.lastName}${form.suffix ? ' ' + form.suffix : ''}`.toUpperCase()}</strong></p>
                  <p style={{ margin: 0, fontSize: '0.98rem' }}><span style={{ color: 'var(--text-600)' }}>Sex:</span> <strong>{form.sex.toUpperCase()}</strong></p>
                  <p style={{ margin: 0, fontSize: '0.98rem' }}><span style={{ color: 'var(--text-600)' }}>Civil Status:</span> <strong>{form.civilStatus.toUpperCase()}</strong></p>
                  <p style={{ margin: 0, fontSize: '0.98rem' }}><span style={{ color: 'var(--text-600)' }}>Citizenship:</span> <strong>{form.citizenship.toUpperCase()}</strong></p>
                  <p style={{ margin: 0, fontSize: '0.98rem' }}><span style={{ color: 'var(--text-600)' }}>Birthdate:</span> <strong>{form.birthdate.toUpperCase()}</strong></p>
                </div>
              </div>

              <div>
                <h5 style={{ margin: '0 0 0.25rem 0', color: '#1a6b4f', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Contact Information</h5>
                <div style={{ display: 'grid', gap: '0.25rem', paddingLeft: '0.5rem', borderLeft: '2px solid #f0fdf4' }}>
                  <p style={{ margin: 0, fontSize: '0.98rem' }}><span style={{ color: 'var(--text-600)' }}>Address:</span> <strong>{form.addressLine.toUpperCase()}</strong></p>
                  <p style={{ margin: 0, fontSize: '0.98rem' }}><span style={{ color: 'var(--text-600)' }}>Province:</span> <strong>{form.province.toUpperCase()}</strong></p>
                  <p style={{ margin: 0, fontSize: '0.98rem' }}><span style={{ color: 'var(--text-600)' }}>City:</span> <strong>{(form.city || 'N/A').toUpperCase()}</strong></p>
                  <p style={{ margin: 0, fontSize: '0.98rem' }}><span style={{ color: 'var(--text-600)' }}>Barangay:</span> <strong>{form.barangay.toUpperCase()}</strong></p>
                  <p style={{ margin: 0, fontSize: '0.98rem' }}><span style={{ color: 'var(--text-600)' }}>Contact Number:</span> <strong>{form.contactNumber.toUpperCase()}</strong></p>
                </div>
              </div>

              <div>
                <h5 style={{ margin: '0 0 0.25rem 0', color: '#1a6b4f', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Account Credentials</h5>
                <div style={{ display: 'grid', gap: '0.25rem', paddingLeft: '0.5rem', borderLeft: '2px solid #f0fdf4' }}>
                  <p style={{ margin: 0, fontSize: '0.98rem' }}><span style={{ color: 'var(--text-600)' }}>Email:</span> <strong>{form.email}</strong></p>
                  <p style={{ margin: 0, fontSize: '0.98rem' }}><span style={{ color: 'var(--text-600)' }}>ID Type:</span> <strong>{form.idType.toUpperCase()}</strong></p>
                  <p style={{ margin: 0, fontSize: '0.98rem' }}><span style={{ color: 'var(--text-600)' }}>ID Number:</span> <strong>{form.idNumber.toUpperCase()}</strong></p>
                </div>
              </div>
            </div>
          </section>

          {/* Column 2: ID Preview */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h4 style={{ margin: 0, color: 'var(--text-900)', fontWeight: 600, borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.25rem' }}>
              ID Verification
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <p style={{ margin: '0 0 0.2rem 0', color: 'var(--text-600)', fontSize: '0.9rem' }}>Front View</p>
                {frontPreviewUrl && (
                  <img
                    src={frontPreviewUrl}
                    alt="Front"
                    style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '0.75rem', border: '2px solid #1a6b4f', cursor: 'pointer' }}
                    onClick={() => window.open(frontPreviewUrl, '_blank')}
                  />
                )}
              </div>
              <div>
                <p style={{ margin: '0 0 0.2rem 0', color: 'var(--text-600)', fontSize: '0.9rem' }}>Back View</p>
                {backPreviewUrl && (
                  <img
                    src={backPreviewUrl}
                    alt="Back"
                    style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '0.75rem', border: '2px solid #1a6b4f', cursor: 'pointer' }}
                    onClick={() => window.open(backPreviewUrl, '_blank')}
                  />
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-500)', textAlign: 'center', fontStyle: 'italic' }}>
                Tap images to zoom
              </p>

              {/* Action Buttons - Moved inside this column to be closer to IDs */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  justifyContent: 'stretch',
                }}
              >
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0',
                    border: '1px solid rgba(0,0,0,0.15)',
                    borderRadius: '0.5rem',
                    background: '#fff',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.6 : 1,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isSubmitting}
                  style={{
                    flex: 2,
                    padding: '0.5rem 0',
                    border: 'none',
                    borderRadius: '0.5rem',
                    background: '#1a6b4f',
                    color: '#fff',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.6 : 1,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  {isSubmitting ? 'Creating...' : 'Confirm Account'}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Removed redundant bottom button section */}
      </div>
    </div>
  );
}

// Modal component removed — links temporarily disabled above

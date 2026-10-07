'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState, useEffect, useMemo } from 'react';
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

const FIELD_DOM_IDS: Record<string, string> = {
  firstName: 'first-name',
  middleName: 'middle-name',
  lastName: 'last-name',
  suffix: 'suffix',
  sex: 'sex',
  civilStatus: 'civil-status',
  citizenship: 'citizenship',
  birthdate: 'birthdate',
  addressLine: 'address-line',
  province: 'province',
  city: 'city',
  barangay: 'barangay',
  contactNumber: 'contact-number',
  email: 'register-email',
  password: 'register-password',
  confirmPassword: 'confirm-password',
  idType: 'id-type',
  idNumber: 'id-number',
  idImageFileFront: 'id-image-front-file',
  idImageFileBack: 'id-image-back-file',
  terms: 'terms-consent',
  dataPrivacy: 'privacy-consent',
};

function getFieldErrors(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.firstName.trim()) {
    errors.firstName = 'Please enter your first name.';
  }

  if (!form.lastName.trim()) {
    errors.lastName = 'Please enter your last name.';
  }

  if (!form.sex) {
    errors.sex = 'Please select your sex.';
  }

  if (!form.civilStatus) {
    errors.civilStatus = 'Please select your civil status.';
  }

  if (!form.citizenship.trim()) {
    errors.citizenship = 'Please enter your citizenship.';
  }

  if (!form.birthdate.trim()) {
    errors.birthdate = 'Please enter your birthdate.';
  } else {
    const cleanDate = form.birthdate.replace(/-/g, '/');
    const parts = cleanDate.split('/');
    if (parts.length !== 3 || parts[0].length !== 4 || parts[1].length !== 2 || parts[2].length !== 2) {
      errors.birthdate = 'Please enter birthdate in yyyy/mm/dd format.';
    } else {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const selected = new Date(year, month - 1, day);

      if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12) {
        errors.birthdate = 'Invalid month in birthdate (must be 01-12).';
      } else {
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day < 1 || day > daysInMonth) {
          errors.birthdate = `Invalid day for the selected month (max ${daysInMonth}).`;
        } else if (year < 1900) {
          errors.birthdate = 'Please enter a valid birth year (1900 or later).';
        } else if (selected > now) {
          errors.birthdate = 'Birthdate cannot be in the future.';
        }
      }
    }
  }

  if (!form.addressLine.trim()) {
    errors.addressLine = 'Please enter your street address.';
  }

  if (!form.contactNumber.trim()) {
    errors.contactNumber = 'Please enter your contact number.';
  } else if (!/^\d{11}$/.test(form.contactNumber.trim())) {
    errors.contactNumber = 'Contact number must be 11 digits (e.g. 09123456789).';
  }

  if (!form.email.trim()) {
    errors.email = 'Please enter your email address.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Please enter a valid email address (e.g. name@example.com).';
  }

  if (!form.password) {
    errors.password = 'Please enter a password.';
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (form.password && form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!form.idType) {
    errors.idType = 'Please select your ID type.';
  }

  if (!form.idNumber.trim()) {
    errors.idNumber = 'Please enter your ID number.';
  }

  if (!form.idImageFileFront) {
    errors.idImageFileFront = 'Upload front picture of ID is required.';
  } else if (!allowedMimeTypes.has(form.idImageFileFront.type)) {
    errors.idImageFileFront = 'Only JPG, PNG, or WEBP files are allowed.';
  }

  if (!form.idImageFileBack) {
    errors.idImageFileBack = 'Upload back picture of ID is required.';
  } else if (!allowedMimeTypes.has(form.idImageFileBack.type)) {
    errors.idImageFileBack = 'Only JPG, PNG, or WEBP files are allowed.';
  }

  if (!form.terms) {
    errors.terms = 'Please agree to the Terms and Conditions.';
  }

  if (!form.dataPrivacy) {
    errors.dataPrivacy = 'Please accept the Data Privacy Policy.';
  }

  return errors;
}

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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const fieldErrors = useMemo(() => getFieldErrors(form), [form]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [legalModalSlug, setLegalModalSlug] = useState<'terms-and-conditions' | 'data-privacy' | null>(null);
  const [initialLegalDocs] = useState(initialLegalDocuments ?? null);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleFieldChange = (field: keyof FormState, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // If not in submit mode, clear touched status on active edit to avoid jumpy UI while typing
    if (!submitAttempted && touched[field]) {
      setTouched((prev) => ({ ...prev, [field]: false }));
    }
  };

  const getVisibleError = (field: string): string | null => {
    const err = fieldErrors[field];
    if (!err) return null;

    // If user attempted to submit, reveal all errors
    if (submitAttempted) return err;

    // Before submit, only reveal error if touched AND the field has an invalid value entered (not empty)
    if (!touched[field]) return null;

    switch (field) {
      case 'email':
        return form.email.trim().length > 0 ? err : null;
      case 'contactNumber':
        return form.contactNumber.trim().length > 0 ? err : null;
      case 'password':
        return form.password.length > 0 ? err : null;
      case 'confirmPassword':
        return form.confirmPassword.length > 0 ? err : null;
      case 'birthdate':
        return form.birthdate.trim().length > 0 ? err : null;
      default:
        return null;
    }
  };

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

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitAttempted(true);

    const currentErrors = getFieldErrors(form);
    const firstErrorKey = Object.keys(currentErrors)[0];
    if (firstErrorKey) {
      const domId = FIELD_DOM_IDS[firstErrorKey];
      if (domId) {
        focusFieldById(domId);
      }
      return;
    }

    if (form.idImageFileFront && form.idImageFileBack) {
      const sameQuick =
        form.idImageFileFront.name === form.idImageFileBack.name &&
        form.idImageFileFront.size === form.idImageFileBack.size &&
        form.idImageFileFront.lastModified === form.idImageFileBack.lastModified;
      if (sameQuick) {
        focusFieldById('id-image-back-file');
        return;
      }
    }

    // All validations passed, show summary modal
    setShowSummaryModal(true);
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

        <section className={styles.formSection}>
          <h2 className={styles.sectionHeading}>User Information</h2>

          <div className={styles.formGridFour}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="first-name">
                First Name
              </label>
              <input
                className={`${styles.input} ${getVisibleError('firstName') ? styles.inputError : ''}`}
                id="first-name"
                type="text"
                placeholder="Juan"
                required
                value={form.firstName}
                onBlur={() => handleBlur('firstName')}
                onChange={(event) => {
                  const noNumbers = event.target.value.replace(/\d/g, '');
                  handleFieldChange('firstName', noNumbers);
                }}
              />
              {getVisibleError('firstName') && (
                <span className={styles.fieldError} role="alert">{getVisibleError('firstName')}</span>
              )}
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
                onChange={(event) => {
                  const noNumbers = event.target.value.replace(/\d/g, '');
                  handleFieldChange('middleName', noNumbers);
                }}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="last-name">
                Last Name
              </label>
              <input
                className={`${styles.input} ${getVisibleError('lastName') ? styles.inputError : ''}`}
                id="last-name"
                type="text"
                placeholder="Cruz"
                required
                value={form.lastName}
                onBlur={() => handleBlur('lastName')}
                onChange={(event) => {
                  const noNumbers = event.target.value.replace(/\d/g, '');
                  handleFieldChange('lastName', noNumbers);
                }}
              />
              {getVisibleError('lastName') && (
                <span className={styles.fieldError} role="alert">{getVisibleError('lastName')}</span>
              )}
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
                onChange={(event) => {
                  const noNumbers = event.target.value.replace(/\d/g, '');
                  handleFieldChange('suffix', noNumbers);
                }}
              />
            </div>
          </div>

          <div className={styles.formGridFour}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="sex">
                Sex
              </label>
              <select
                className={`${styles.select} ${getVisibleError('sex') ? styles.inputError : ''}`}
                id="sex"
                required
                value={form.sex}
                onBlur={() => handleBlur('sex')}
                onChange={(event) => handleFieldChange('sex', event.target.value)}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {getVisibleError('sex') && (
                <span className={styles.fieldError} role="alert">{getVisibleError('sex')}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="civil-status">
                Civil Status
              </label>
              <select
                className={`${styles.select} ${getVisibleError('civilStatus') ? styles.inputError : ''}`}
                id="civil-status"
                required
                value={form.civilStatus}
                onBlur={() => handleBlur('civilStatus')}
                onChange={(event) => handleFieldChange('civilStatus', event.target.value)}
              >
                <option value="">Select</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Separated">Separated</option>
                <option value="Widowed">Widowed</option>
              </select>
              {getVisibleError('civilStatus') && (
                <span className={styles.fieldError} role="alert">{getVisibleError('civilStatus')}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="citizenship">
                Citizenship
              </label>
              <input
                className={`${styles.input} ${getVisibleError('citizenship') ? styles.inputError : ''}`}
                id="citizenship"
                type="text"
                autoComplete="country-name"
                placeholder="Filipino"
                value={form.citizenship}
                onBlur={() => handleBlur('citizenship')}
                onChange={(event) => {
                  const noNumbers = event.target.value.replace(/\d/g, '');
                  handleFieldChange('citizenship', noNumbers);
                }}
                required
              />
              {getVisibleError('citizenship') && (
                <span className={styles.fieldError} role="alert">{getVisibleError('citizenship')}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="birthdate">
                Birthdate
              </label>
              <div className={styles.maskWrap}>
                <input
                  className={`${styles.input} ${styles.maskInput} ${getVisibleError('birthdate') ? styles.inputError : ''}`}
                  id="birthdate"
                  type="text"
                  required
                  placeholder="yyyy/mm/dd"
                  pattern="\d{4}/\d{2}/\d{2}"
                  title="Enter birthdate in yyyy/mm/dd format"
                  inputMode="numeric"
                  value={form.birthdate}
                  onBlur={() => handleBlur('birthdate')}
                  onChange={(event) => {
                    const raw = event.target.value;
                    const digits = raw.replace(/\D/g, '');
                    const y = digits.slice(0, 4);
                    const m = digits.slice(4, 6);
                    const d = digits.slice(6, 8);
                    let formatted = y;
                    if (m) formatted += `/${m}`;
                    if (d) formatted += `/${d}`;
                    formatted = formatted.slice(0, 10);
                    handleFieldChange('birthdate', formatted);
                  }}
                />
                <div className={styles.maskOverlay} dangerouslySetInnerHTML={{ __html: renderMaskedHtml(form.birthdate) }} />
              </div>
              {getVisibleError('birthdate') && (
                <span className={styles.fieldError} role="alert">{getVisibleError('birthdate')}</span>
              )}
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
              className={`${styles.input} ${getVisibleError('addressLine') ? styles.inputError : ''}`}
              id="address-line"
              type="text"
              placeholder="123 Main St"
              required
              value={form.addressLine}
              onBlur={() => handleBlur('addressLine')}
              onChange={(event) => handleFieldChange('addressLine', event.target.value)}
            />
            {getVisibleError('addressLine') && (
              <span className={styles.fieldError} role="alert">{getVisibleError('addressLine')}</span>
            )}
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
                Contact Number
              </label>
              <input
                className={`${styles.input} ${getVisibleError('contactNumber') ? styles.inputError : ''}`}
                id="contact-number"
                type="tel"
                placeholder="09123456789"
                required
                inputMode="numeric"
                pattern="\d{11}"
                value={form.contactNumber}
                onBlur={() => handleBlur('contactNumber')}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
                  handleFieldChange('contactNumber', digits);
                }}
              />
              {getVisibleError('contactNumber') && (
                <span className={styles.fieldError} role="alert">{getVisibleError('contactNumber')}</span>
              )}
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
                className={`${styles.input} ${getVisibleError('email') ? styles.inputError : ''}`}
                id="register-email"
                type="email"
                placeholder="john@example.com"
                required
                value={form.email}
                onBlur={() => handleBlur('email')}
                onChange={(event) => handleFieldChange('email', event.target.value)}
              />
              {getVisibleError('email') && (
                <span className={styles.fieldError} role="alert">{getVisibleError('email')}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="register-password">
                Password
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  className={`${styles.input} ${styles.inputWithToggle} ${getVisibleError('password') ? styles.inputError : ''}`}
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  required
                  value={form.password}
                  onBlur={() => handleBlur('password')}
                  onChange={(event) => handleFieldChange('password', event.target.value)}
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
              {getVisibleError('password') && (
                <span className={styles.fieldError} role="alert">{getVisibleError('password')}</span>
              )}
            </div>
          </div>

          <div className={styles.formGridTwo}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="id-type">
                ID Type
              </label>
              <select
                className={`${styles.select} ${getVisibleError('idType') ? styles.inputError : ''}`}
                id="id-type"
                required
                value={form.idType}
                onBlur={() => handleBlur('idType')}
                onChange={(event) => handleFieldChange('idType', event.target.value)}
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
              {getVisibleError('idType') && (
                <span className={styles.fieldError} role="alert">{getVisibleError('idType')}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="confirm-password">
                Confirm Password
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  className={`${styles.input} ${styles.inputWithToggle} ${getVisibleError('confirmPassword') ? styles.inputError : ''}`}
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  required
                  value={form.confirmPassword}
                  onBlur={() => handleBlur('confirmPassword')}
                  onChange={(event) => handleFieldChange('confirmPassword', event.target.value)}
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
              {getVisibleError('confirmPassword') && (
                <span className={styles.fieldError} role="alert">{getVisibleError('confirmPassword')}</span>
              )}
            </div>
          </div>

          <div className={styles.formGridTwo}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="id-number">
                ID Number
              </label>
              <input
                className={`${styles.input} ${getVisibleError('idNumber') ? styles.inputError : ''}`}
                id="id-number"
                type="text"
                placeholder="Any valid ID number"
                required
                value={form.idNumber}
                onBlur={() => handleBlur('idNumber')}
                onChange={(event) => handleFieldChange('idNumber', event.target.value)}
              />
              {getVisibleError('idNumber') && (
                <span className={styles.fieldError} role="alert">{getVisibleError('idNumber')}</span>
              )}
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
                  className={`${styles.input} ${getVisibleError('idImageFileFront') ? styles.inputError : ''}`}
                  id="id-image-front-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={async (event) => {
                    const selectedFile = event.target.files?.[0] ?? null;
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
                      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                    }}
                  >
                    Open full image
                  </button>
                )}
              </div>
              {getVisibleError('idImageFileFront') && (
                <span className={styles.fieldError} role="alert">{getVisibleError('idImageFileFront')}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="id-image-back-file">
                Upload Picture of ID (Back)
              </label>
              <div className={styles.fileInputWrap}>
                <input
                  className={`${styles.input} ${getVisibleError('idImageFileBack') ? styles.inputError : ''}`}
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
              {getVisibleError('idImageFileBack') && (
                <span className={styles.fieldError} role="alert">{getVisibleError('idImageFileBack')}</span>
              )}
            </div>
          </div>
          <p className={styles.helperText}>Accepted formats: JPG, PNG, WEBP. Max size after compression: 5MB.</p>
        </section>

        <div className={styles.formField}>
          <div className={styles.checkControl}>
            <input
              id="terms-consent"
              type="checkbox"
              checked={form.terms}
              onChange={(event) => handleFieldChange('terms', event.target.checked)}
            />
            <label htmlFor="terms-consent">
              I agree to the{' '}
              <button type="button" className={styles.linkText} onClick={() => setLegalModalSlug('terms-and-conditions')}>
                Terms and Conditions
              </button>
            </label>
          </div>
          {getVisibleError('terms') && (
            <span className={styles.fieldError} role="alert">{getVisibleError('terms')}</span>
          )}
        </div>

        <div className={styles.formField}>
          <div className={styles.checkControl}>
            <input
              id="privacy-consent"
              type="checkbox"
              checked={form.dataPrivacy}
              onChange={(event) => handleFieldChange('dataPrivacy', event.target.checked)}
            />
            <label htmlFor="privacy-consent">
              I accept the{' '}
              <button type="button" className={styles.linkText} onClick={() => setLegalModalSlug('data-privacy')}>
                Data Privacy Policy
              </button>
            </label>
          </div>
          {getVisibleError('dataPrivacy') && (
            <span className={styles.fieldError} role="alert">{getVisibleError('dataPrivacy')}</span>
          )}
        </div>

        <button className={styles.primaryBtn} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create resident account'}
        </button>
      </form>

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

              {/* Action Buttons */}
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
      </div>
    </div>
  );
}

import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';
import {
  issueEmailVerificationOtp,
  sendEmailVerificationMessage,
} from '@/lib/auth/email-verification';
import { isRegistrationEmailVerificationRequired } from '@/lib/auth/email-verification-toggle';

type RegisterPayload = {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  sex: string;
  civilStatus: string;
  citizenship: string;
  birthDate: string;
  contactNumber: string;
  addressLine: string;
  province: string;
  city?: string;
  barangay: string;
  idType: string;
  idNumber: string;
  idImageFile?: File;
  idImageFileBack?: File;
  termsAccepted: boolean;
  privacyAccepted: boolean;
};

const MAX_ID_UPLOAD_BYTES = 5 * 1024 * 1024;
const RESIDENT_ID_UPLOADS_BUCKET = 'resident-id-uploads';
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function isPresent(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeBoolean(value: FormDataEntryValue | null): boolean {
  return value === 'true';
}

function inferFileExtension(file: File): string {
  const byType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  if (byType[file.type]) {
    return byType[file.type];
  }

  const filename = file.name || '';
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex > -1 && dotIndex < filename.length - 1) {
    return filename.slice(dotIndex + 1).toLowerCase();
  }
  return 'jpg';
}

async function uploadResidentIdImage(admin: ReturnType<typeof getSupabaseAdminClient>, path: string, file: File) {
  const attemptUpload = async () =>
    admin.storage
      .from(RESIDENT_ID_UPLOADS_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

  let { error } = await attemptUpload();
  if (!error) {
    return null;
  }

  const message = error.message.toLowerCase();
  if (message.includes('bucket') && message.includes('not')) {
    await admin.storage.createBucket(RESIDENT_ID_UPLOADS_BUCKET, {
      public: false,
      fileSizeLimit: MAX_ID_UPLOAD_BYTES,
      allowedMimeTypes: Array.from(allowedImageTypes),
    });
    ({ error } = await attemptUpload());
  }

  return error;
}

async function parseRegisterBody(request: NextRequest): Promise<RegisterPayload | null> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData().catch(() => null);
    if (!formData) return null;
    const uploadValueFront = formData.get('idImageFileFront');
    const uploadValueBack = formData.get('idImageFileBack');
    const idImageFileFront = uploadValueFront instanceof File ? uploadValueFront : undefined;
    const idImageFileBack = uploadValueBack instanceof File ? uploadValueBack : undefined;

    return {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      firstName: String(formData.get('firstName') ?? ''),
      middleName: String(formData.get('middleName') ?? ''),
      lastName: String(formData.get('lastName') ?? ''),
      suffix: String(formData.get('suffix') ?? ''),
      sex: String(formData.get('sex') ?? ''),
      civilStatus: String(formData.get('civilStatus') ?? ''),
      citizenship: String(formData.get('citizenship') ?? ''),
      birthDate: String(formData.get('birthDate') ?? ''),
      contactNumber: String(formData.get('contactNumber') ?? ''),
      addressLine: String(formData.get('addressLine') ?? ''),
      province: String(formData.get('province') ?? ''),
      city: String(formData.get('city') ?? ''),
      barangay: String(formData.get('barangay') ?? ''),
      idType: String(formData.get('idType') ?? ''),
      idNumber: String(formData.get('idNumber') ?? ''),
      idImageFile: idImageFileFront,
      // include back image if present for future processing
      idImageFileBack,
      termsAccepted: normalizeBoolean(formData.get('termsAccepted')),
      privacyAccepted: normalizeBoolean(formData.get('privacyAccepted')),
    };
  }

  return (await request.json().catch(() => null)) as RegisterPayload | null;
}

export async function POST(request: NextRequest) {
  const body = await parseRegisterBody(request);
  if (
    !body
    || !isPresent(body.email)
    || !isPresent(body.password)
    || !isPresent(body.firstName)
    || !isPresent(body.lastName)
    || !isPresent(body.sex)
    || !isPresent(body.civilStatus)
    || !isPresent(body.citizenship)
    || !isPresent(body.birthDate)
    || !isPresent(body.contactNumber)
    || !isPresent(body.addressLine)
    || !isPresent(body.province)
    || !isPresent(body.barangay)
    || !isPresent(body.idType)
    || !isPresent(body.idNumber)
  ) {
    return fail('VALIDATION_ERROR', 'Missing required fields', 400);
  }

  if (!(body.idImageFile instanceof File) || body.idImageFile.size === 0) {
    return fail('VALIDATION_ERROR', 'Upload front picture of ID is required.', 400);
  }

  if (!(body.idImageFileBack instanceof File) || body.idImageFileBack.size === 0) {
    return fail('VALIDATION_ERROR', 'Upload back picture of ID is required.', 400);
  }

  if (!allowedImageTypes.has(body.idImageFile.type) || !allowedImageTypes.has(body.idImageFileBack.type)) {
    return fail('VALIDATION_ERROR', 'Only JPG, PNG, or WEBP images are allowed for ID upload.', 400);
  }

  if (body.idImageFile.size > MAX_ID_UPLOAD_BYTES || body.idImageFileBack.size > MAX_ID_UPLOAD_BYTES) {
    return fail('VALIDATION_ERROR', 'ID upload must be 5MB or smaller.', 400);
  }

  if (body.password.length < 8) {
    return fail('VALIDATION_ERROR', 'Password must be at least 8 characters.', 400);
  }

  if (!body.termsAccepted) {
    return fail('VALIDATION_ERROR', 'Please accept the Terms and Conditions.', 400);
  }

  if (!body.privacyAccepted) {
    return fail('VALIDATION_ERROR', 'Please accept the Data Privacy Policy.', 400);
  }

  const admin = getSupabaseAdminClient();
  let verificationRequired = true;
  try {
    verificationRequired = isRegistrationEmailVerificationRequired();
  } catch (error) {
    console.error('[auth.register] Invalid EMAIL_VERIFICATION_ENABLED configuration:', error);
    return fail(
      'INTERNAL_ERROR',
      'Registration is temporarily unavailable due to invalid EMAIL_VERIFICATION_ENABLED configuration.',
      500
    );
  }

  const email = body.email.trim().toLowerCase();
  const firstName = body.firstName.trim();
  const middleName = body.middleName?.trim() || null;
  const lastName = body.lastName.trim();
  const suffix = body.suffix?.trim() || null;
  const city = body.city?.trim() || null;
  const province = body.province.trim();
  const fullName = [firstName, middleName, lastName, suffix].filter(Boolean).join(' ');
  const address = [body.addressLine.trim(), body.barangay.trim(), city, province].filter(Boolean).join(', ');
  const acceptedAt = new Date().toISOString();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
  });
  if (createError || !created.user?.id) {
    return fail('RESOURCE_CONFLICT', createError?.message ?? 'Unable to register user', 409);
  }

  const idUploadExtensionFront = inferFileExtension(body.idImageFile);
  const idObjectPathFront = `${created.user.id}/${Date.now()}-${crypto.randomUUID()}.${idUploadExtensionFront}`;
  const uploadErrorFront = await uploadResidentIdImage(admin, idObjectPathFront, body.idImageFile);
  if (uploadErrorFront) {
    await admin.auth.admin.deleteUser(created.user.id);
    return fail('INTERNAL_ERROR', 'Unable to upload front ID image.', 500);
  }

  const idUploadExtensionBack = inferFileExtension(body.idImageFileBack);
  const idObjectPathBack = `${created.user.id}/${Date.now()}-${crypto.randomUUID()}.${idUploadExtensionBack}`;
  const uploadErrorBack = await uploadResidentIdImage(admin, idObjectPathBack, body.idImageFileBack);
  if (uploadErrorBack) {
    await admin.storage.from(RESIDENT_ID_UPLOADS_BUCKET).remove([idObjectPathFront]);
    await admin.auth.admin.deleteUser(created.user.id);
    return fail('INTERNAL_ERROR', 'Unable to upload back ID image.', 500);
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    full_name: fullName,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    suffix,
    sex: body.sex.trim(),
    civil_status: body.civilStatus.trim(),
    citizenship: body.citizenship.trim(),
    birthdate: body.birthDate,
    address,
    address_line: body.addressLine.trim(),
    city,
    barangay: body.barangay.trim(),
    email,
    phone: body.contactNumber.trim(),
    id_type: body.idType.trim(),
    id_number: body.idNumber.trim(),
    id_file_name: idObjectPathFront,
    id_file_path: idObjectPathFront,
    id_file_name_back: idObjectPathBack,
    id_file_path_back: idObjectPathBack,
    terms_accepted_at: acceptedAt,
    privacy_accepted_at: acceptedAt,
    role: 'resident',
    locale: 'en',
    is_deleted: false,
    is_verified: !verificationRequired,
    approval_status: 'pending_staff_review',
  });

  if (profileError) {
    await admin.storage.from(RESIDENT_ID_UPLOADS_BUCKET).remove([idObjectPathFront, idObjectPathBack]);
    await admin.auth.admin.deleteUser(created.user.id);
    return fail('INTERNAL_ERROR', profileError.message, 500);
  }

  const { data: profile } = await admin.from('profiles').select('tenant_id').eq('id', created.user.id).single();

  let verificationEmailSent = false;
  let verificationWarning: string | undefined;
  if (verificationRequired) {
    try {
      const otpData = await issueEmailVerificationOtp({
        userId: created.user.id,
        email,
        tenantId: profile?.tenant_id ?? '',
      });
      await sendEmailVerificationMessage({
        toEmail: email,
        fullName,
        otpCode: otpData.otp,
      });
      verificationEmailSent = true;

      await admin.from('email_logs').insert({
        tenant_id: profile?.tenant_id ?? null,
        to_user_id: created.user.id,
        to_email: email,
        subject: 'Verify your eSerbisyo account (OTP)',
        body: 'Verification OTP sent (redacted). Expires in 10 minutes.',
      });
    } catch (error) {
      // Registration still succeeds; user can request resend verification code.
      verificationWarning =
        'Account created, but we could not send your verification code yet. Please request a new code on the verification page.';
      console.error('[auth.register] Verification code send failed:', error);
    }
  }

  await writeAuditLog({
    tenantId: profile?.tenant_id ?? '',
    actorId: created.user.id,
    actorRole: 'resident',
    action: 'auth.register',
    targetId: created.user.id,
  });

  return ok({
    userId: created.user.id,
    verificationRequired,
    verificationEmailSent,
    warning: verificationWarning,
    emailConfirm: true,
    isVerified: !verificationRequired,
    approvalStatus: 'pending_staff_review',
    role: 'resident',
    email,
  });
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PageGuide } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Select } from '@/components/ui/select';
import { changePassword, updateCurrentProfile } from '@/lib/frontend-data/store';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { copyText } from '@/features/resident/model/copy';
import { ResidentSection } from '@/features/resident/view/resident-primitives';
import { ResidentShell } from '@/features/resident/view/resident-shell';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';

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

function normalizeBirthdateInput(value?: string) {
  if (!value) return '';
  return value.includes('T') ? value.split('T')[0] : value;
}

export default function ResidentMyProfilePage() {
  const { user, locale } = useAppState();
  const pageCopy = getRolePageCopy('resident/my-profile');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [sex, setSex] = useState('');
  const [civilStatus, setCivilStatus] = useState('');
  const [citizenship, setCitizenship] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordStatusMessage, setPasswordStatusMessage] = useState<string | null>(null);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName ?? '');
    setPhone(user.phone ?? '');
    setAddress(user.address ?? '');
    setBirthdate(normalizeBirthdateInput(user.birthdate));
    setSex(user.sex ?? '');
    setCivilStatus(user.civilStatus ?? '');
    setCitizenship(user.citizenship ?? '');
  }, [user]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);
    setSaving(true);

    try {
      await updateCurrentProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        birthdate,
        sex,
        civilStatus,
        citizenship: citizenship.trim(),
      });
      setStatusMessage(copyText(locale, 'Personal information updated.', 'Na-update ang personal na impormasyon.'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copyText(locale, 'Unable to update profile.', 'Hindi ma-update ang profile.'));
    } finally {
      setSaving(false);
    }
  };

  const onPasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordStatusMessage(null);
    setPasswordErrorMessage(null);

    const currentValue = currentPassword.trim();
    const nextValue = newPassword;
    const confirmValue = confirmNewPassword;

    if (!currentValue || !nextValue || !confirmValue) {
      setPasswordErrorMessage(copyText(locale, 'All password fields are required.', 'Kailangan punan ang lahat ng password fields.'));
      return;
    }
    if (nextValue.length < 8) {
      setPasswordErrorMessage(copyText(locale, 'New password must be at least 8 characters.', 'Ang bagong password ay dapat may 8 na karakter o higit pa.'));
      return;
    }
    if (nextValue !== confirmValue) {
      setPasswordErrorMessage(copyText(locale, 'New password and confirmation do not match.', 'Hindi magkatugma ang bagong password at kumpirmasyon.'));
      return;
    }
    if (currentValue === nextValue) {
      setPasswordErrorMessage(copyText(locale, 'New password must be different from current password.', 'Dapat iba ang bagong password sa kasalukuyang password.'));
      return;
    }

    setChangingPassword(true);
    try {
      const result = await changePassword(currentValue, nextValue);
      if (!result.ok) {
        setPasswordErrorMessage(result.error);
        return;
      }
      setPasswordStatusMessage(copyText(locale, 'Password updated successfully.', 'Matagumpay na na-update ang password.'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      setPasswordErrorMessage(error instanceof Error ? error.message : copyText(locale, 'Unable to change password.', 'Hindi mapalitan ang password.'));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <ResidentShell title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {pageCopy.guide ? (
        <PageGuide
          tone="resident"
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      <ResidentSection
        title={copyText(locale, 'Personal Information', 'Personal na Impormasyon')}
        description={copyText(
          locale,
          'Edit your personal details so your resident profile stays accurate.',
          'I-edit ang iyong personal na detalye para manatiling tama ang iyong resident profile.'
        )}
      >
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <label className="md:col-span-2 grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Full name', 'Buong pangalan')}</span>
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Phone number', 'Numero ng telepono')}</span>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} required />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Birthdate', 'Petsa ng kapanganakan')}</span>
            <Input type="date" value={birthdate} onChange={(event) => setBirthdate(event.target.value)} required />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Sex', 'Kasarian')}</span>
            <Select value={sex} onChange={(event) => setSex(event.target.value)} required>
              <option value="">{copyText(locale, 'Select sex', 'Piliin ang kasarian')}</option>
              <option value="Male">{copyText(locale, 'Male', 'Lalaki')}</option>
              <option value="Female">{copyText(locale, 'Female', 'Babae')}</option>
              <option value="Prefer not to say">{copyText(locale, 'Prefer not to say', 'Ayaw tukuyin')}</option>
            </Select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Civil status', 'Katayuang sibil')}</span>
            <Select value={civilStatus} onChange={(event) => setCivilStatus(event.target.value)} required>
              <option value="">{copyText(locale, 'Select civil status', 'Piliin ang katayuang sibil')}</option>
              <option value="Single">{copyText(locale, 'Single', 'Single')}</option>
              <option value="Married">{copyText(locale, 'Married', 'Married')}</option>
              <option value="Widowed">{copyText(locale, 'Widowed', 'Widowed')}</option>
              <option value="Separated">{copyText(locale, 'Separated', 'Separated')}</option>
            </Select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Citizenship', 'Pagkamamamayan')}</span>
            <Input
              value={citizenship}
              onChange={(event) => setCitizenship(event.target.value)}
              list="profile-citizenship-options"
              autoComplete="country-name"
              required
            />
            <datalist id="profile-citizenship-options">
              {citizenshipSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          <label className="md:col-span-2 grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Address', 'Address')}</span>
            <Input value={address} onChange={(event) => setAddress(event.target.value)} required />
          </label>

          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {statusMessage ? <p className="text-sm text-[color:#1b6b3a]">{statusMessage}</p> : null}
              {errorMessage ? <p className="text-sm text-[color:#b42318]">{errorMessage}</p> : null}
            </div>
            <Button type="submit" variant="resident" disabled={saving}>
              {saving ? copyText(locale, 'Saving...', 'Nagse-save...') : copyText(locale, 'Save Personal Info', 'I-save ang Personal Info')}
            </Button>
          </div>
        </form>
      </ResidentSection>

      <ResidentSection
        title={copyText(locale, 'Change Password', 'Palitan ang Password')}
        description={copyText(
          locale,
          'Use your current password to set a new password for your account.',
          'Gamitin ang kasalukuyang password para magtakda ng bagong password para sa account mo.'
        )}
      >
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onPasswordSubmit}>
          <label className="md:col-span-2 grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Current password', 'Kasalukuyang password')}</span>
            <PasswordInput
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'New password', 'Bagong password')}</span>
            <PasswordInput
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Confirm new password', 'Kumpirmahin ang bagong password')}</span>
            <PasswordInput
              autoComplete="new-password"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              required
            />
          </label>

          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {passwordStatusMessage ? <p className="text-sm text-[color:#1b6b3a]">{passwordStatusMessage}</p> : null}
              {passwordErrorMessage ? <p className="text-sm text-[color:#b42318]">{passwordErrorMessage}</p> : null}
            </div>
            <Button type="submit" variant="residentOutline" disabled={changingPassword}>
              {changingPassword ? copyText(locale, 'Updating...', 'Ina-update...') : copyText(locale, 'Update Password', 'I-update ang Password')}
            </Button>
          </div>
        </form>
      </ResidentSection>
    </ResidentShell>
  );
}

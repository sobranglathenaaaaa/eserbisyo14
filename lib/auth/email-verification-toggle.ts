export function isRegistrationEmailVerificationRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  const rawValue = env.EMAIL_VERIFICATION_ENABLED;
  const parsedValue = rawValue?.trim();

  if (parsedValue === 'true') {
    return true;
  }
  if (parsedValue === 'false') {
    return false;
  }

  if (env.NODE_ENV !== 'production') {
    return true;
  }

  throw new Error(
    'Invalid EMAIL_VERIFICATION_ENABLED value. In production, set EMAIL_VERIFICATION_ENABLED to exactly "true" or "false".'
  );
}

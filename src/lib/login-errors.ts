/** Safe login error codes — never put arbitrary user-facing text in URL params. */

export const LOGIN_ERROR_MESSAGES = {
  not_configured:
    'CMS admin email is not configured. Set ALLOWED_CMS_EMAIL in .env.local.',
  access_denied: 'This account is not authorized to access the CMS.',
  invalid_credentials: 'Invalid email or password.',
  email_not_confirmed:
    'This account exists but email is not confirmed. In Supabase → Authentication → Users, confirm the user or recreate with “Auto Confirm User” checked.',
  email_provider_disabled:
    'Email/password login is turned off in Supabase. Go to Authentication → Providers → Email and enable it.',
} as const;

export type LoginErrorCode = keyof typeof LOGIN_ERROR_MESSAGES;

export function loginErrorPath(code: LoginErrorCode, next?: string) {
  const params = new URLSearchParams({ code });
  if (next) params.set('next', next);
  return `/login?${params.toString()}`;
}

/** Resolve a whitelisted error code to a display message. Unknown codes return null. */
export function resolveLoginErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  if (code in LOGIN_ERROR_MESSAGES) {
    return LOGIN_ERROR_MESSAGES[code as LoginErrorCode];
  }
  return null;
}

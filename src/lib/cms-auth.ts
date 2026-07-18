/** Single CMS operator — set ALLOWED_CMS_EMAIL in .env.local / Vercel (never hardcode in source). */

export function getAllowedCmsEmail(): string | null {
  const email = process.env.ALLOWED_CMS_EMAIL?.trim().toLowerCase();
  return email || null;
}

export function isAllowedCmsEmail(email: string | undefined | null): boolean {
  const allowed = getAllowedCmsEmail();
  if (!allowed || !email) return false;
  return email.trim().toLowerCase() === allowed;
}

export const CMS_ACCESS_DENIED_MESSAGE =
  'This account is not authorized to access the CMS.';

export const CMS_NOT_CONFIGURED_MESSAGE =
  'CMS admin email is not configured. Set ALLOWED_CMS_EMAIL in .env.local.';

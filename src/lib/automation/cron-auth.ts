import 'server-only';
import { timingSafeEqual } from 'crypto';

/** Verify Authorization: Bearer <CRON_SECRET> on cron endpoints. */
export function verifyCronAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return false;

  const token = auth.slice('Bearer '.length).trim();
  if (token.length !== secret.length) return false;

  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  } catch {
    return false;
  }
}

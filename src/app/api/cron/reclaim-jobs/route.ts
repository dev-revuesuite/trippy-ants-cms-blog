import { verifyCronAuth } from '@/lib/automation/cron-auth';
import { runReclaimTick } from '@/lib/automation/worker';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function handleReclaim(request: Request) {
  if (!verifyCronAuth(request)) {
    return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await runReclaimTick();
    return Response.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[automation] reclaim failed:', message);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleReclaim(request);
}

export async function GET(request: Request) {
  return handleReclaim(request);
}

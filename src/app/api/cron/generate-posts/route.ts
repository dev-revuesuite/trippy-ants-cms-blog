import { after } from 'next/server';
import { verifyCronAuth } from '@/lib/automation/cron-auth';
import { runAutomationTick } from '@/lib/automation/worker';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!verifyCronAuth(request)) {
    return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  after(async () => {
    try {
      const result = await runAutomationTick();
      console.info('[automation] tick finished:', JSON.stringify(result));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[automation] tick failed:', message);
    }
  });

  return Response.json(
    { success: true, accepted: true, message: 'Pipeline tick started' },
    { status: 202 },
  );
}

export async function GET(request: Request) {
  return POST(request);
}

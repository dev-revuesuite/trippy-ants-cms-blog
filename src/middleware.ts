import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon, images, robots, sitemap, rss
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|rss.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

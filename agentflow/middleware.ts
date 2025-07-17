import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from './lib/security/rate-limiter';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';

  // Skip middleware for static files and images
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/_next/') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next();
  }

  try {
    // Check if IP is blocked
    const isBlocked = await rateLimiter.isBlocked(ip);
    if (isBlocked) {
      return new NextResponse('Access denied', { status: 403 });
    }

    // Apply rate limiting for API routes
    if (pathname.startsWith('/api/')) {
      const rateLimit = await rateLimiter.checkRateLimit(ip, 'api');
      
      if (!rateLimit.allowed) {
        return new NextResponse('Rate limit exceeded', { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
          }
        });
      }

      // Add rate limit headers to response
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', '100');
      response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
      
      return response;
    }

    // Log suspicious activity patterns
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    
    // Detect potential bot traffic
    if (
      userAgent.toLowerCase().includes('bot') ||
      userAgent.toLowerCase().includes('crawler') ||
      userAgent.toLowerCase().includes('spider')
    ) {
      await rateLimiter.logSuspiciousActivity(ip, 'bot_traffic', {
        userAgent,
        pathname,
        referer
      });
    }

    // Detect rapid sequential requests (potential scraping)
    if (pathname.startsWith('/projects/') || pathname.startsWith('/agents/')) {
      const rapidRequests = await rateLimiter.checkRateLimit(ip, 'api');
      if (rapidRequests.remaining < 50) { // Less than 50% remaining
        await rateLimiter.logSuspiciousActivity(ip, 'rapid_requests', {
          pathname,
          remaining: rapidRequests.remaining
        });
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // Fail open - allow request to continue if middleware fails
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
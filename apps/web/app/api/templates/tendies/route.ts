import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const templateUrl = `${url.protocol}//${url.host}/templates/tendies.zip`;

    const response = await fetch(templateUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.status} - ${templateUrl}`);
    }

    const templateBuffer = await response.arrayBuffer();

    return new NextResponse(templateBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="tendies.zip"',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving tendies template:', error);

    try {
      const fallbackUrl = new URL('/templates/tendies.zip', request.url);
      const fallbackResponse = await fetch(fallbackUrl, {
        signal: AbortSignal.timeout(5000),
      });
      
      if (fallbackResponse.ok) {
        const fallbackBuffer = await fallbackResponse.arrayBuffer();
        return new NextResponse(fallbackBuffer, {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="tendies.zip"',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }

    return NextResponse.json(
      { error: 'Failed to load tendies template', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
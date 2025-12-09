import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'templates', 'gyro-tendies.zip');

    const templateBuffer = await fs.readFile(filePath);

    return new NextResponse(new Uint8Array(templateBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="gyro-tendies.zip"',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving gyro-tendies template:', error);

    return NextResponse.json(
      { error: 'Failed to load gyro-tendies template', details: error instanceof Error ? (error as Error).message : 'Unknown error' },
      { status: 500 }
    );
  }
}

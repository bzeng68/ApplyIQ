import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { findReportByNum } from '../../../../lib/data';

export async function GET(request: NextRequest, context: { params: { num: string } }) {
  const profile = request.nextUrl.searchParams.get('profile') ?? '';
  if (!profile) return new NextResponse('profile required', { status: 400 });

  const filePath = findReportByNum(context.params.num, profile);
  if (!filePath || !fs.existsSync(filePath)) {
    return new NextResponse('Report not found', { status: 404 });
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return new NextResponse(content, { status: 200 });
}

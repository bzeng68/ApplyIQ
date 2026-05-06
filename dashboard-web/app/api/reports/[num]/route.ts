import fs from 'fs';
import { NextResponse } from 'next/server';
import { findReportByNum } from '../../../../lib/data';

export async function GET(_request: Request, context: { params: { num: string } }) {
  const filePath = findReportByNum(context.params.num);
  if (!filePath || !fs.existsSync(filePath)) {
    return new NextResponse('Report not found', { status: 404 });
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return new NextResponse(content, { status: 200 });
}

import fs from 'fs';
import { NextResponse } from 'next/server';
import { findJdById } from '../../../../lib/data';

export async function GET(_request: Request, context: { params: { id: string } }) {
  const filePath = findJdById(context.params.id);
  if (!filePath || !fs.existsSync(filePath)) {
    return new NextResponse('JD not found', { status: 404 });
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return new NextResponse(content, { status: 200 });
}

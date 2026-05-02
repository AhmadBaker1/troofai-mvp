import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { meetingNumber, role = 0 } = body;

  const sdkKey = process.env.ZOOM_SDK_KEY;
  const sdkSecret = process.env.ZOOM_SDK_SECRET;

  if (!sdkKey || !sdkSecret) {
    return NextResponse.json(
      { error: 'Zoom SDK credentials not configured' },
      { status: 500 }
    );
  }

  const iat = Math.round(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2; // 2 hours

  const payload = {
    sdkKey,
    mn: String(meetingNumber),
    role,
    iat,
    exp,
    tokenExp: exp,
  };

  const signature = jwt.sign(payload, sdkSecret, { algorithm: 'HS256' });

  return NextResponse.json({ signature, sdkKey });
}

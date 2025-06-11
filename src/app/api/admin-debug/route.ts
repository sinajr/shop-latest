import { logAdminEnvStatus } from '@/app/profile/_server/debug-admin';
import { NextRequest } from 'next/server';

export async function GET(_req: NextRequest) {
  await logAdminEnvStatus();
  return new Response(JSON.stringify({ message: 'Admin debug triggered' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

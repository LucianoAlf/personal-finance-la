import { EducationIntelligenceDataError } from './education-intelligence.ts';

export class EducationIntelligenceHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'EducationIntelligenceHttpError';
    this.status = status;
  }
}

function isValidDateOnly(value: string): boolean {
  const [yearRaw, monthRaw, dayRaw] = value.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

export function parseOptionalYmd(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !isValidDateOnly(value)
  ) {
    throw new EducationIntelligenceHttpError(
      400,
      `${fieldName} must use YYYY-MM-DD format when provided`,
    );
  }

  return value;
}

export async function readRequestBody(req: Request): Promise<Record<string, unknown>> {
  const rawBody = await req.text();

  if (!rawBody.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch (_) {
    throw new EducationIntelligenceHttpError(400, 'Invalid JSON body');
  }
}

export async function resolveUserIdFromRequest(req: Request, supabase: any): Promise<string> {
  const authHeader =
    req.headers.get('x-supabase-authorization') || req.headers.get('authorization');

  if (!authHeader) {
    throw new EducationIntelligenceHttpError(401, 'Authorization token missing');
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    throw new EducationIntelligenceHttpError(401, 'Authorization token missing');
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new EducationIntelligenceHttpError(401, 'Unauthorized');
  }

  return user.id;
}

export function createErrorResponse(
  error: unknown,
  corsHeaders: Record<string, string>,
): Response {
  let status = 500;
  let message = 'Internal server error';

  if (error instanceof EducationIntelligenceHttpError) {
    status = error.status;
    message = error.message;
  } else if (error instanceof EducationIntelligenceDataError) {
    status = 503;
    message = error.message;
  }

  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

import { APP_ERRORS } from "@/lib/errors";
import type { ApiErrorBody, FieldErrors } from "@/lib/errors";

// Thrown for every failed request, so components only need one catch branch.
export class ApiClientError extends Error {
  readonly code: string | null;
  readonly fields: FieldErrors;

  constructor(message: string, code: string | null = null, fields: FieldErrors = {}) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.fields = fields;
  }
}

export async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiClientError("Network error. Check your connection and try again.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiClientError(
      body?.error?.message ?? APP_ERRORS.INTERNAL.message,
      body?.error?.code ?? null,
      body?.error?.fields ?? {},
    );
  }
  if (response.status === 204) return undefined as T; // DELETE has no body
  return (await response.json()) as T;
}

export const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// Lets every catch block treat any thrown value the same way.
export function toApiError(error: unknown): ApiClientError {
  return error instanceof ApiClientError
    ? error
    : new ApiClientError("Something went wrong. Please try again.");
}

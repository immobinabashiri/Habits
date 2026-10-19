// Single source of truth for API errors: code -> HTTP status + user-facing message.
// Messages are deliberately generic where needed (e.g. login never says which
// part was wrong, so it cannot be used to discover registered emails).
export const APP_ERRORS = {
      INVALID_DATA: { status: 400, message: "Please enter a valid email and password." },
  NAME_AT_LEAST: { status: 400, message: "First name must be at least 3 characters." },
  LAST_NAME_AT_LEAST: { status: 400, message: "Last name must be at least 3 characters." },
  PASSWORD_AT_LEAST: { status: 400, message: "Password must be at least 8 characters." },
  VALIDATION_FAILED: {
    status: 400,
    message: "Some fields are invalid. Please check them and try again.",
  },
  EMAIL_ALREADY_REGISTERED: {
    status: 409,
    message: "An account with this email already exists.",
  },
  INVALID_CREDENTIALS: { status: 401, message: "Incorrect email or password." },
  UNAUTHENTICATED: { status: 401, message: "Please log in to continue." },
  FORBIDDEN: {
    status: 403,
    message: "You do not have access to this resource.",
  },
  NOT_FOUND: { status: 404, message: "The requested item was not found." },
  RATE_LIMITED: {
    status: 429,
    message: "Too many attempts. Please wait a moment and try again.",
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    message: "The service is temporarily unavailable. Please try again shortly.",
  },
  INTERNAL: { status: 500, message: "Something went wrong. Please try again." },
} as const satisfies Record<string, { status: number; message: string }>;

export type ErrorCode = keyof typeof APP_ERRORS;

// Per-field messages, e.g. { email: "Enter a valid email address." }
export type FieldErrors = Partial<Record<string, string>>;

// The JSON shape every API error response will use.
export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; fields?: FieldErrors };
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields?: FieldErrors;

  constructor(code: ErrorCode, fields?: FieldErrors) {
    super(APP_ERRORS[code].message);
    this.name = "AppError";
    this.code = code;
    this.status = APP_ERRORS[code].status;
    this.fields = fields;
  }

  toBody(): ApiErrorBody {
    return {
      error: { code: this.code, message: this.message, fields: this.fields },
    };
  }
}


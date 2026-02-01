export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "AUTH_ERROR"
  | "DB_ERROR"
  | "CONFLICT";

export type ToolError = {
  code: ErrorCode;
  message: string;
  details?: unknown;
};

export type ToolResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ToolError };

export function ok<T>(data: T): ToolResponse<T> {
  return { ok: true, data };
}

export function err(
  code: ErrorCode,
  message: string,
  details?: unknown
): ToolResponse<never> {
  return { ok: false, error: { code, message, details } };
}

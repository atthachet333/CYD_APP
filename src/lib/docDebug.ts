export function createRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function logDoc(requestId: string, label: string, data?: unknown) {
  console.log(`[DOC_DEBUG:${requestId}] ${label}`, data ?? "");
}

export function logDocError(requestId: string, label: string, error: any) {
  console.error(`[DOC_ERROR:${requestId}] ${label}`, {
    name: error?.name,
    message: error?.message,
    stack: error?.stack,
    code: error?.code,
    meta: error?.meta,
    clientVersion: error?.clientVersion,
  });
}

export function requestHeadersForDebug(request: Request) {
  return {
    url: request.url,
    host: request.headers.get("host"),
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
    xForwardedHost: request.headers.get("x-forwarded-host"),
    xForwardedProto: request.headers.get("x-forwarded-proto"),
  };
}

export function safeFileNameFrom(name: string) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/\s+/g, "_");
}

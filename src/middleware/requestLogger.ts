import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

const DEFAULT_MAX_CHARS = 2000;
const MAX_LOG_CHARS = Number(process.env.HTTP_LOG_MAX_CHARS || DEFAULT_MAX_CHARS);

function truncate(value: string): string {
  if (value.length <= MAX_LOG_CHARS) {
    return value;
  }
  const truncated = value.slice(0, MAX_LOG_CHARS);
  const remaining = value.length - MAX_LOG_CHARS;
  return `${truncated}... [truncated ${remaining} chars]`;
}

function safeStringify(payload: unknown): string | null {
  if (payload === undefined || payload === null) {
    return null;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  try {
    return JSON.stringify(payload);
  } catch (error: any) {
    return `[unserializable payload: ${error?.message ?? 'unknown error'}]`;
  }
}

function formatPayload(payload: unknown): string | null {
  const serialized = safeStringify(payload);
  if (!serialized || serialized === '{}' || serialized === '[]') {
    return null;
  }
  return truncate(serialized);
}

const requestResponseLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = randomUUID();

  console.log(`[HTTP][${requestId}] Incoming ${req.method} ${req.originalUrl} from ${req.ip}`);

  const queryLog = formatPayload(req.query);
  if (queryLog) {
    console.log(`[HTTP][${requestId}] query=${queryLog}`);
  }

  const bodyLog = formatPayload(req.body);
  if (bodyLog) {
    console.log(`[HTTP][${requestId}] body=${bodyLog}`);
  }

  let responsePayload: unknown;
  const originalJson = res.json;
  const originalSend = res.send;

  res.json = function jsonOverride(body: any) {
    responsePayload = body;
    return originalJson.call(this, body);
  };

  res.send = function sendOverride(body: any) {
    responsePayload = body;
    return originalSend.call(this, body);
  };

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(
      `[HTTP][${requestId}] Completed ${req.method} ${req.originalUrl} with ${res.statusCode} in ${duration}ms`
    );

    const responseLog = formatPayload(responsePayload);
    if (responseLog) {
      console.log(`[HTTP][${requestId}] response=${responseLog}`);
    }
  });

  next();
};

export default requestResponseLogger;


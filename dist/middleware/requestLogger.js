"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const DEFAULT_MAX_CHARS = 2000;
const MAX_LOG_CHARS = Number(process.env.HTTP_LOG_MAX_CHARS || DEFAULT_MAX_CHARS);
function truncate(value) {
    if (value.length <= MAX_LOG_CHARS) {
        return value;
    }
    const truncated = value.slice(0, MAX_LOG_CHARS);
    const remaining = value.length - MAX_LOG_CHARS;
    return `${truncated}... [truncated ${remaining} chars]`;
}
function safeStringify(payload) {
    if (payload === undefined || payload === null) {
        return null;
    }
    if (typeof payload === 'string') {
        return payload;
    }
    try {
        return JSON.stringify(payload);
    }
    catch (error) {
        return `[unserializable payload: ${error?.message ?? 'unknown error'}]`;
    }
}
function formatPayload(payload) {
    const serialized = safeStringify(payload);
    if (!serialized || serialized === '{}' || serialized === '[]') {
        return null;
    }
    return truncate(serialized);
}
const requestResponseLogger = (req, res, next) => {
    const startTime = Date.now();
    const requestId = (0, crypto_1.randomUUID)();
    console.log(`[HTTP][${requestId}] Incoming ${req.method} ${req.originalUrl} from ${req.ip}`);
    const queryLog = formatPayload(req.query);
    if (queryLog) {
        console.log(`[HTTP][${requestId}] query=${queryLog}`);
    }
    const bodyLog = formatPayload(req.body);
    if (bodyLog) {
        console.log(`[HTTP][${requestId}] body=${bodyLog}`);
    }
    let responsePayload;
    const originalJson = res.json;
    const originalSend = res.send;
    res.json = function jsonOverride(body) {
        responsePayload = body;
        return originalJson.call(this, body);
    };
    res.send = function sendOverride(body) {
        responsePayload = body;
        return originalSend.call(this, body);
    };
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`[HTTP][${requestId}] Completed ${req.method} ${req.originalUrl} with ${res.statusCode} in ${duration}ms`);
        const responseLog = formatPayload(responsePayload);
        if (responseLog) {
            console.log(`[HTTP][${requestId}] response=${responseLog}`);
        }
    });
    next();
};
exports.default = requestResponseLogger;

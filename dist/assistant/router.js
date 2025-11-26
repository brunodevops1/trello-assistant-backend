"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicToolRouter = dynamicToolRouter;
const TrelloService = __importStar(require("../services/trello"));
function loadToolsDefinition() {
    try {
        // Prioritize the compiled spec copied to dist/
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require('../../dist/tools.json');
    }
    catch (distError) {
        console.warn('[tools.json] dist/tools.json introuvable, utilisation de la version racine (mode dev).');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require('../../tools.json');
    }
}
const toolsSpec = loadToolsDefinition();
function extractToolNames() {
    const tools = toolsSpec.components?.['x-oai-tools'];
    if (!Array.isArray(tools)) {
        return [];
    }
    return tools
        .map((tool) => tool?.function?.name)
        .filter((name) => typeof name === 'string' && name.trim().length > 0);
}
async function dynamicToolRouter(req, res) {
    try {
        const { action, ...params } = req.body || {};
        if (!action || typeof action !== 'string') {
            return res.status(400).json({
                error: "Missing 'action' field in request body.",
            });
        }
        const declaredTools = extractToolNames();
        if (!declaredTools.includes(action)) {
            return res.status(400).json({
                error: `UnrecognizedFunctionError: '${action}' is not listed in tools.json`,
                declared_tools: declaredTools,
            });
        }
        const handler = TrelloService[action];
        if (typeof handler !== 'function') {
            return res.status(500).json({
                error: `BackendMissingImplementation: '${action}' is declared in tools.json but not implemented in TrelloService.`,
            });
        }
        const result = await handler(params);
        return res.json({
            ok: true,
            data: result,
        });
    }
    catch (err) {
        console.error('❌ Error inside dynamic router:', err);
        return res.status(500).json({
            error: 'InternalServerError',
            message: err?.message || 'Unknown error',
        });
    }
}

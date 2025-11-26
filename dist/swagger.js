"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerUi = exports.swaggerSpec = void 0;
const path_1 = __importDefault(require("path"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
exports.swaggerUi = swagger_ui_express_1.default;
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Trello Assistant Backend API',
            version: '1.0.0',
            description: 'API REST du backend Trello Assistant (création et gestion de cartes Trello).',
        },
    },
    apis: [
        path_1.default.join(__dirname, 'index.ts'),
        path_1.default.join(__dirname, 'routes/**/*.ts'),
    ],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);

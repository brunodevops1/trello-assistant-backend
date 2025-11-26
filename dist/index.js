"use strict";
/**
 * Point d'entrée de l'application
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const assistant_route_1 = __importDefault(require("./routes/assistant.route"));
const swagger_1 = require("./swagger");
const requestLogger_1 = __importDefault(require("./middleware/requestLogger"));
const router_1 = require("./assistant/router");
// Charger les variables d'environnement
dotenv_1.default.config();
const app = (0, express_1.default)();
// Render et autres plateformes cloud définissent automatiquement le PORT
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(requestLogger_1.default);
// Routes
app.use('/assistant', assistant_route_1.default);
app.post('/assistant/run', router_1.dynamicToolRouter);
app.use('/docs', swagger_1.swaggerUi.serve, swagger_1.swaggerUi.setup(swagger_1.swaggerSpec));
app.get('/openapi.json', (_req, res) => res.json(swagger_1.swaggerSpec));
// Route de santé
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'trello-assistant-backend' });
});
// Ping minimal demandé par ChatGPT Tools
app.get('/dummy', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Trello Assistant backend is running',
    });
});
// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📋 Endpoint principal: http://localhost:${PORT}/assistant/trello`);
    console.log(`🔧 Définition des tools: http://localhost:${PORT}/assistant/tools`);
});

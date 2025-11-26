/**
 * Point d'entrée de l'application
 */

import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import assistantRoutes from './routes/assistant.route';
import { swaggerSpec, swaggerUi } from './swagger';
import requestResponseLogger from './middleware/requestLogger';
import { dynamicToolRouter } from './assistant/router';

// Charger les variables d'environnement
dotenv.config();

const app = express();
// Render et autres plateformes cloud définissent automatiquement le PORT
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestResponseLogger);

// Routes
app.use('/assistant', assistantRoutes);
app.post('/assistant/run', dynamicToolRouter);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/openapi.json', (_req, res) => res.json(swaggerSpec));

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


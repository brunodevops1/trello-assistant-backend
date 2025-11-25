import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Trello Assistant Backend API',
      version: '1.0.0',
      description:
        'API REST du backend Trello Assistant (création et gestion de cartes Trello).',
    },
  },
  apis: [
    path.join(__dirname, 'index.ts'),
    path.join(__dirname, 'routes/**/*.ts'),
  ],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
export { swaggerUi };



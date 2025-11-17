/**
 * Configuration Jest - Charge les variables d'environnement
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Charger le fichier .env depuis la racine du projet
dotenv.config({ path: resolve(__dirname, '..', '.env') });


# Configuration du fichier .env

## 📝 Étapes pour configurer vos credentials Trello

### 1. Obtenir vos credentials Trello

1. Allez sur https://trello.com/app-key
2. Copiez votre **API Key** (affichée en haut de la page)
3. Cliquez sur le lien "Token" en bas de la page pour générer un token
4. Autorisez l'accès et copiez le **Token** généré

### 2. Obtenir l'ID de votre board

**Option A : Via l'URL Trello**
- Ouvrez votre board dans Trello
- L'URL ressemble à : `https://trello.com/b/XXXXXXXX/board-name`
- L'ID est la partie `XXXXXXXX` (24 caractères)

**Option B : Via l'API**
- Utilisez le script de test après avoir configuré API_KEY et API_TOKEN
- Il listera vos boards

### 3. Éditer le fichier .env

Ouvrez le fichier `.env` à la racine du projet et remplacez :

```env
TRELLO_API_KEY=votre_vraie_clé_api_ici
TRELLO_API_TOKEN=votre_vrai_token_ici
TRELLO_DEFAULT_BOARD_ID=votre_vrai_board_id_ici
```

**Important :**
- Pas d'espaces autour du `=`
- Pas de guillemets autour des valeurs
- Chaque variable sur une ligne séparée

### 4. Vérifier la configuration

Après avoir édité le `.env`, testez avec :

```bash
npx ts-node scripts/test-credentials.ts
```

Ce script vérifiera que :
- ✅ Les credentials sont bien configurés
- ✅ La connexion à Trello fonctionne
- ✅ Le board est accessible
- ✅ Les listes sont disponibles

## 🔍 Exemple de fichier .env correct

```env
# Trello API Configuration
TRELLO_API_KEY=1234567890abcdef1234567890abcdef
TRELLO_API_TOKEN=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
TRELLO_DEFAULT_BOARD_ID=5f8a1b2c3d4e5f6a7b8c9d0e

# OpenAI API Configuration (optionnel)
OPENAI_API_KEY=sk-...

# Server Configuration
PORT=3000
```

## ⚠️ Problèmes courants

1. **"invalid key"** → La clé API est incorrecte
2. **"401 Unauthorized"** → Le token est invalide ou expiré
3. **"404 Board not found"** → L'ID du board est incorrect
4. **Les tests ne détectent pas les credentials** → Vérifiez qu'il n'y a pas d'espaces autour du `=`

## 💡 Astuce

Si vous avez plusieurs boards, vous pouvez utiliser le nom du board au lieu de l'ID :
```env
TRELLO_DEFAULT_BOARD_ID=Mon Board Trello
```

Le système cherchera automatiquement le board par nom.


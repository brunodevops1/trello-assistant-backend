#!/bin/bash

# Script d'exemple pour tester l'API Trello Assistant
# Assurez-vous que le serveur est démarré (npm run dev)

BASE_URL="http://localhost:3000"

echo "🔍 Récupération des tools..."
curl -s "$BASE_URL/assistant/tools" | jq '.tools[0].function.name' || echo "Erreur"

echo -e "\n📋 Test: Créer une tâche"
curl -X POST "$BASE_URL/assistant/trello" \
  -H "Content-Type: application/json" \
  -d '{
    "tool_calls": [{
      "id": "call_test_1",
      "type": "function",
      "function": {
        "name": "createTrelloTask",
        "arguments": "{\"title\": \"Tâche de test\", \"list\": \"À faire\"}"
      }
    }]
  }' | jq '.'

echo -e "\n✅ Test: Marquer une tâche comme terminée"
curl -X POST "$BASE_URL/assistant/trello" \
  -H "Content-Type: application/json" \
  -d '{
    "tool_calls": [{
      "id": "call_test_2",
      "type": "function",
      "function": {
        "name": "completeTrelloTask",
        "arguments": "{\"task_name\": \"Tâche de test\"}"
      }
    }]
  }' | jq '.'

echo -e "\n📅 Test: Modifier la date d\'échéance"
curl -X POST "$BASE_URL/assistant/trello" \
  -H "Content-Type: application/json" \
  -d '{
    "tool_calls": [{
      "id": "call_test_3",
      "type": "function",
      "function": {
        "name": "updateTrelloDueDate",
        "arguments": "{\"task_name\": \"Tâche de test\", \"due_date\": \"2026-12-31T00:00:00Z\"}"
      }
    }]
  }' | jq '.'

echo -e "\n💚 Test: Health check"
curl -s "$BASE_URL/health" | jq '.'


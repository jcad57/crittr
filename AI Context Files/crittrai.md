## CrittrAI Feature

CrittrAI will let users ask questions to an AI model (Anthropic/Claude) in a chat-based setting similar to chatGPT or claude.ai. What will separate CrittrAI from asking questions directly to chatGPT or other web-based AI chat services is that CrittrAI will utilize the data that's been logged in activities for their pets, their pet's profile information - pulling pet details like weight, sex, breed, activity level, etc. - to help aid in answering questions the user might have.

CrittrAI's scope will strictly stick to pet-related topics so if users ask other random questions then CrittrAI should know not to engage and let the user know to ask another question related to their pets.

DISCLAIMER: We should make it clear to the user that CrittrAI is NOT a doctor so answering any questions relating to health concerns should be used as a guide only and to contact their vet directly if there are any immediate health concerns that need attention.

Consider the following when implementing this feature:

The Core Concept: Conversation History
The most important thing to understand: Claude has no memory between API calls. To make it feel like a continuous conversation, you send the entire conversation history with every request. This is how all LLM chat works under the hood.
Turn 1: [system prompt] + [user: "how much should Roxy eat?"]
Turn 2: [system prompt] + [user: "how much..."] + [assistant: "..."] + [user: "what about treats?"]
Turn 3: [system prompt] + all previous turns + [user: "new message"]

1. Never Call the API From the Client
   Don't put your Anthropic API key in your Expo app — it will be exposed. Always proxy through your own backend.
   Expo App → Your Backend (supabase) → Anthropic API
   Your backend holds the API key securely and forwards requests.

The system prompt sets the personality, context, and constraints for the entire conversation. You rebuild it fresh with each call (since it can change per-pet per-session).
javascriptfunction buildSystemPrompt(pet, activityLog) {
return `You are a friendly, knowledgeable pet care assistant helping the owner of ${pet.name}.

## About ${pet.name}

- Species: ${pet.species}
- Breed: ${pet.breed}
- Age: ${pet.age}
- Weight: ${pet.weight}
- Health conditions: ${pet.healthConditions || 'None listed'}
- Dietary restrictions: ${pet.dietaryRestrictions || 'None listed'}
- Typical activity level: ${pet.activityLevel}

## Recent Activity Log (last 14 days)

${formatActivityLog(activityLog)}

## Your Role

- Give personalized advice based on ${pet.name}'s specific profile above
- Suggest appropriate exercise ideas, food recommendations, and general care tips
- When health concerns are raised, provide general guidance but ALWAYS clarify that you
  are not a veterinarian and recommend consulting one for medical decisions
- Keep responses conversational and warm — you're talking to a pet owner who cares deeply
- Reference ${pet.name} by name to keep things personal
- If the activity log is relevant to a question, reference specific entries

## Important

Never diagnose medical conditions. For any serious health concern, advise seeing a vet.`;
}

function formatActivityLog(log) {
if (!log || log.length === 0) return 'No activity logged yet.';
return log
.slice(-14) // last 14 entries
.map(entry => `- ${entry.date}: ${entry.type} for ${entry.duration} mins — ${entry.notes || ''}`)
.join('\n');
}

3. Conversation State in Your App
   Keep the message history in state. Each message is { role: 'user' | 'assistant', content: string }.
   javascriptconst [messages, setMessages] = useState([]); // conversation history
   const [inputText, setInputText] = useState('');
   const [isLoading, setIsLoading] = useState(false);

async function sendMessage() {
const userMessage = { role: 'user', content: inputText };
const updatedMessages = [...messages, userMessage];

setMessages(updatedMessages);
setInputText('');
setIsLoading(true);

try {
const reply = await callYourBackend({
messages: updatedMessages,
petId: currentPet.id, // backend will fetch pet profile + activity log
});

    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

} catch (err) {
// handle error
} finally {
setIsLoading(false);
}
}

4. Your Backend Endpoint
   javascript// Express example
   app.post('/api/chat', async (req, res) => {
   const { messages, petId, userId } = req.body;

// Fetch fresh pet data & activity log from your DB
const pet = await db.getPet(petId, userId);
const activityLog = await db.getActivityLog(petId, { days: 14 });

const response = await anthropic.messages.create({
model: 'claude-sonnet-4-20250514',
max_tokens: 1024,
system: buildSystemPrompt(pet, activityLog),
messages: messages, // the full history from the client
});

res.json({ reply: response.content[0].text });
});

5. Conversation Length Management
   After many turns, the history grows large and hits token limits. A simple fix: keep a rolling window.
   javascriptfunction trimHistory(messages, maxTurns = 20) {
   // Always keep the full history up to a limit
   // Each "turn" = 1 user + 1 assistant message = 2 items
   const maxMessages = maxTurns \* 2;
   if (messages.length > maxMessages) {
   return messages.slice(-maxMessages);
   }
   return messages;
   }

// On backend before sending to Anthropic:
const trimmedMessages = trimHistory(messages, 20);

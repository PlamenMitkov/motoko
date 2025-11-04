# Quick Integration Guide: ICPChatService into app.js

This guide shows you exactly how to replace the existing fetch-based chat logic in `app.js` with the new `ICPChatService`.

## 🎯 Goal

Replace this:

```javascript
const response = await fetch('/querydata', { method: 'POST', ... });
```

With this:

```javascript
const response = await chatService.sendMessage(message);
```

## 📝 Step-by-Step Integration

### Step 1: Add Import Statement

At the **top** of `app.js`, add:

```javascript
import ICPChatService from "./ICPChatService.js";
```

### Step 2: Create Global Service Instance

After the `CONFIG` object, add:

```javascript
/**
 * ICP Chat Service instance
 * Replaces traditional REST API calls with canister communication
 */
let chatService = null;
```

### Step 3: Initialize Service on App Load

Find your `DOMContentLoaded` event listener (around line 1600+) and add initialization:

```javascript
document.addEventListener("DOMContentLoaded", async function () {
  console.log("🌲 EcoTrails Bulgaria - Initializing...");

  try {
    // NEW: Initialize ICP Chat Service
    console.log("🚀 Initializing ICP Chat Service...");
    chatService = new ICPChatService();
    await chatService.initialize();
    console.log("✅ Chat service ready");
    console.log("👤 User ID:", chatService.getUserId());

    // ... rest of your existing initialization code ...

    initializeApp();
    setupEventListeners();
    displayWelcomeMessage();
  } catch (error) {
    console.error("❌ Initialization failed:", error);
    // Show error to user
    alert("Не успяхме да заредим приложението. Моля, презаредете страницата.");
  }
});
```

### Step 4: Replace sendChatMessage Function

Find the `sendChatMessage` function (around line 586) and **replace** it with:

```javascript
/**
 * Sends a chat message to the ICP canister backend
 *
 * @param {string} message - User's message
 * @returns {Promise<Object>} Response with shape: { response: string, coords: object|null }
 */
async function sendChatMessage(message) {
  // Ensure service is initialized
  if (!chatService || !chatService.isInitialized()) {
    throw new Error("Chat service not initialized. Please refresh the page.");
  }

  try {
    // Call the ICP canister through the service
    const response = await chatService.sendMessage(message);

    // Response format is already compatible:
    // { response: "...", coords: { lat: 42.5, lng: 23.2 } | null }
    return response;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}
```

### Step 5: Update handleChatSubmit (Optional Enhancement)

The `handleChatSubmit` function should already work, but you can enhance error handling:

```javascript
async function handleChatSubmit(event) {
  event.preventDefault();

  const chatInput = document.getElementById("chat-input");
  const message = chatInput.value.trim();

  if (!message) return;

  // Validate message length
  if (message.length > CONFIG.LIMITS.MAX_MESSAGE_LENGTH) {
    showErrorMessage(
      `Съобщението е твърде дълго (макс ${CONFIG.LIMITS.MAX_MESSAGE_LENGTH} символа)`,
    );
    return;
  }

  // Clear input
  chatInput.value = "";

  // Show user message
  displayUserMessage(message);

  // Show loading indicator
  showTypingIndicator();
  applicationState.chat.isLoading = true;

  try {
    // Send message through ICP canister
    const response = await sendChatMessage(message);

    // Hide loading indicator
    hideTypingIndicator();
    applicationState.chat.isLoading = false;

    // Display AI response
    displayAIResponse(response);

    // If response contains coordinates, update map
    if (response.coords) {
      applicationState.chat.lastCoordinates = response.coords;
      updateMapWithCoordinates(response.coords);
    }
  } catch (error) {
    console.error("Chat error:", error);

    hideTypingIndicator();
    applicationState.chat.isLoading = false;

    // Show error message
    displayAIResponse({
      response:
        "Извинявам се, възникна техническа грешка. Моля, опитайте отново след малко.",
    });
  }
}
```

## ✅ Verification Checklist

After making these changes, verify:

- [ ] No console errors on page load
- [ ] You see "✅ Chat service ready" in console
- [ ] You see a User ID logged
- [ ] Chat messages can be sent
- [ ] AI responses appear correctly
- [ ] Coordinates (if any) are displayed on map

## 🧪 Testing

### In Browser Console:

```javascript
// Check if service is initialized
console.log("Service initialized?", chatService?.isInitialized());

// Check user ID
console.log("User ID:", chatService?.getUserId());

// Test sending a message
await chatService
  .sendMessage("Здравей")
  .then((r) => console.log("Response:", r))
  .catch((e) => console.error("Error:", e));
```

### Full Integration Test:

1. Open browser DevTools (F12)
2. Go to Console tab
3. You should see:

   ```
   🚀 Initializing ICP Chat Service...
   📍 Host: http://localhost:4943
   🏠 Local environment: true
   🆔 Canister ID: rrkah-fqaaa-aaaaa-aaaaq-cai
   🔑 Fetching root key for local development...
   ✅ Root key fetched successfully
   ✅ ICPChatService initialized successfully
   👤 User ID: user_1699...
   ```

4. Type a message in the chat and press Enter
5. You should see:
   ```
   📤 Sending message to canister...
   👤 User ID: user_1699...
   💬 Message: Здравей
   📥 Response received from canister
   📝 Response text: ...
   ```

## 🚨 Common Issues

### Issue 1: "Cannot find module ICPChatService"

**Solution:** Make sure the file path in the import is correct:

```javascript
import ICPChatService from "./ICPChatService.js";
```

### Issue 2: "Service not initialized"

**Solution:** Make sure `await chatService.initialize()` is called and completes before sending messages.

### Issue 3: "Cannot find canister id"

**Solution:**

```bash
# Deploy the backend first
dfx deploy backend

# This generates the declarations that ICPChatService needs
```

### Issue 4: CORS errors

**Solution:** If using local development, make sure:

- dfx is running: `dfx start --background`
- Backend is deployed: `dfx deploy backend`
- You're accessing via localhost, not 127.0.0.1

## 🔄 Rollback Plan

If something goes wrong, you can quickly revert:

1. Remove the import statement
2. Restore the original `sendChatMessage` function:

```javascript
async function sendChatMessage(message) {
  const response = await fetch(CONFIG.API_ENDPOINTS.CHAT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: message }),
  });

  if (!response.ok) {
    throw new Error(`HTTP грешка: ${response.status}`);
  }

  return await response.json();
}
```

## 🎉 Success!

Once integrated, your app will:

- ✅ Communicate directly with ICP canisters
- ✅ Work without a traditional backend server
- ✅ Be fully decentralized
- ✅ Have persistent user sessions
- ✅ Benefit from ICP's security model

## 📚 Next Steps

After successful integration:

1. **Add trail search:**

   ```javascript
   const trails = await chatService.searchTrails("София");
   ```

2. **Get specific trail:**

   ```javascript
   const trail = await chatService.getTrailById(1);
   ```

3. **List all trails:**

   ```javascript
   const allTrails = await chatService.listAllTrails();
   ```

4. **Enhance error handling** based on your UI requirements

5. **Add loading states** for better UX

## 📖 Additional Resources

- Full API Documentation: `ICP_CHAT_SERVICE_README.md`
- Complete Examples: `ICPChatServiceIntegration.example.js`
- Backend Implementation: `src/backend/main.mo`
- Migration Guide: `OPENAI_MIGRATION.md`

---

**Need Help?** Check the troubleshooting section in `ICP_CHAT_SERVICE_README.md` or review the complete integration example in `ICPChatServiceIntegration.example.js`.

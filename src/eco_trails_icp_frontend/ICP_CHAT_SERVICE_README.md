# ICPChatService - ICP Canister Communication Module

A modular JavaScript service class for communicating with the Motoko backend canister, specifically designed for the EcoTrails Bulgaria chatbot application.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Integration Guide](#integration-guide)
- [Examples](#examples)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🌟 Overview

`ICPChatService` replaces traditional REST API calls with direct Internet Computer canister communication using `@dfinity/agent`. It provides a clean, promise-based interface for:

- Sending chat messages to the AI-powered backend
- Searching for eco-trails
- Retrieving trail information
- Managing user sessions

## ✨ Features

- ✅ **Automatic Environment Detection** - Detects local vs production automatically
- ✅ **Type-Safe** - Properly typed responses from Motoko backend
- ✅ **Session Management** - Persistent user IDs across page reloads
- ✅ **Error Handling** - Comprehensive error handling with descriptive messages
- ✅ **Flexible API** - Multiple methods for different backend functions
- ✅ **Debug Logging** - Detailed console logs for development
- ✅ **Async/Await** - Modern JavaScript async patterns

## 📦 Installation

### Prerequisites

Make sure you have the required dependencies installed:

```bash
npm install @dfinity/agent @dfinity/candid @dfinity/principal
```

### File Structure

```
src/eco_trails_icp_frontend/
├── ICPChatService.js                          # Main service class
├── ICPChatServiceIntegration.example.js       # Integration examples
└── app.js                                      # Your main app (to be updated)
```

## 🚀 Quick Start

### Step 1: Import and Initialize

```javascript
import ICPChatService from "./ICPChatService.js";

// Create service instance
const chatService = new ICPChatService();

// Initialize (creates agent and actor)
await chatService.initialize();

console.log("✅ Service ready!");
console.log("User ID:", chatService.getUserId());
```

### Step 2: Send a Message

```javascript
// Send a message to the chatbot
const response = await chatService.sendMessage("Търся екопътека в София");

console.log(response.response); // AI-generated text
console.log(response.coords); // Optional coordinates { lat, lng }
```

### Step 3: Search for Trails

```javascript
// Search for trails
const trails = await chatService.searchTrails("София");

trails.forEach((trail) => {
  console.log(trail.name);
  console.log(trail.location.region);
});
```

## 📚 API Reference

### Constructor

```javascript
new ICPChatService(config);
```

**Parameters:**

- `config` (Object, optional)
  - `host` (string) - IC host URL (auto-detected if not provided)
  - `local` (boolean) - Force local/production mode (auto-detected if not provided)
  - `canisterId` (string) - Override canister ID

**Example:**

```javascript
const service = new ICPChatService({
  host: "http://localhost:4943",
  local: true,
});
```

### Methods

#### `initialize()`

Initializes the service by creating the agent and actor.

**Returns:** `Promise<void>`

**Throws:** `Error` if initialization fails

**Example:**

```javascript
await chatService.initialize();
```

---

#### `sendMessage(message)`

Sends a message to the chatbot and receives an AI-generated response.

**Parameters:**

- `message` (string) - User's message (max 500 characters)

**Returns:** `Promise<Object>`

```javascript
{
    response: string,      // AI-generated response text
    coords: {              // Optional coordinates (if trail mentioned)
        lat: number,
        lng: number
    } | null
}
```

**Throws:**

- `Error` if service not initialized
- `Error` if message is empty or too long
- `Error` if canister call fails

**Example:**

```javascript
try {
  const response = await chatService.sendMessage(
    "Препоръчай ми лека екопътека",
  );
  console.log(response.response);

  if (response.coords) {
    showOnMap(response.coords.lat, response.coords.lng);
  }
} catch (error) {
  console.error("Failed to send message:", error);
}
```

---

#### `searchTrails(query)`

Searches for trails matching the query.

**Parameters:**

- `query` (string) - Search query

**Returns:** `Promise<Array<TrailRecord>>`

**Example:**

```javascript
const trails = await chatService.searchTrails("Витоша");
console.log(`Found ${trails.length} trails`);
```

---

#### `getTrailById(trailId)`

Gets a specific trail by its ID.

**Parameters:**

- `trailId` (number) - Trail ID (Nat)

**Returns:** `Promise<TrailRecord|null>`

**Example:**

```javascript
const trail = await chatService.getTrailById(1);
if (trail) {
  console.log(trail.name);
  console.log(trail.description);
}
```

---

#### `listAllTrails()`

Lists all available trails.

**Returns:** `Promise<Array<TrailRecord>>`

**Example:**

```javascript
const allTrails = await chatService.listAllTrails();
console.log(`Total trails: ${allTrails.length}`);
```

---

#### `getUserId()`

Gets the current user ID.

**Returns:** `string`

---

#### `isInitialized()`

Checks if the service is initialized.

**Returns:** `boolean`

---

#### `getCanisterId()`

Gets the canister ID.

**Returns:** `string`

---

#### `reset()`

Resets the service (useful for testing).

**Returns:** `void`

## 🔧 Integration Guide

### Replacing Existing Chat Functionality

#### Before (using fetch):

```javascript
async function sendChatMessage(message) {
  const response = await fetch("/querydata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  return await response.json();
}
```

#### After (using ICPChatService):

```javascript
import ICPChatService from "./ICPChatService.js";

let chatService = null;

// Initialize on app load
async function initApp() {
  chatService = new ICPChatService();
  await chatService.initialize();
}

async function sendChatMessage(message) {
  return await chatService.sendMessage(message);
}
```

### Complete Integration Example

See `ICPChatServiceIntegration.example.js` for a complete integration example showing:

- Application initialization
- Event handler updates
- Error handling
- UI integration

### Key Changes to Make in app.js

1. **Add import at the top:**

   ```javascript
   import ICPChatService from "./ICPChatService.js";
   ```

2. **Create service instance globally:**

   ```javascript
   let chatService = null;
   ```

3. **Initialize in DOMContentLoaded:**

   ```javascript
   document.addEventListener("DOMContentLoaded", async function () {
     chatService = new ICPChatService();
     await chatService.initialize();
     // ... rest of initialization
   });
   ```

4. **Update sendChatMessage function:**
   ```javascript
   async function sendChatMessage(message) {
     return await chatService.sendMessage(message);
   }
   ```

## 📖 Examples

### Example 1: Basic Chat Interaction

```javascript
import ICPChatService from "./ICPChatService.js";

async function chatExample() {
  // Initialize
  const service = new ICPChatService();
  await service.initialize();

  // Send message
  const response = await service.sendMessage("Здравей!");
  console.log(response.response);
}

chatExample();
```

### Example 2: Trail Search and Display

```javascript
async function searchAndDisplay(query) {
  const service = new ICPChatService();
  await service.initialize();

  // Search
  const trails = await service.searchTrails(query);

  // Display results
  trails.forEach((trail) => {
    console.log(`
            Name: ${trail.name}
            Region: ${trail.location.region}
            Difficulty: ${trail.trail_details.difficulty}
            Coordinates: ${trail.location.coordinates.lat}, ${trail.location.coordinates.lng}
        `);
  });
}

searchAndDisplay("София");
```

### Example 3: Error Handling

```javascript
async function robustChatMessage(message) {
  const service = new ICPChatService();

  try {
    await service.initialize();
    const response = await service.sendMessage(message);
    return response;
  } catch (error) {
    if (error.message.includes("not initialized")) {
      console.error("Service initialization failed");
      // Show error to user
    } else if (error.message.includes("too long")) {
      console.error("Message too long");
      // Truncate and retry
    } else {
      console.error("Unknown error:", error);
      // Fallback behavior
    }

    return {
      response: "Извинявам се, възникна грешка. Моля, опитайте отново.",
      coords: null,
    };
  }
}
```

## 🚨 Error Handling

### Common Errors and Solutions

| Error                                 | Cause                     | Solution                                               |
| ------------------------------------- | ------------------------- | ------------------------------------------------------ |
| `ICPChatService not initialized`      | `initialize()` not called | Call `await service.initialize()` before other methods |
| `Message must be a non-empty string`  | Empty or invalid message  | Validate input before calling `sendMessage()`          |
| `Message too long`                    | Message > 500 chars       | Truncate or show error to user                         |
| `Failed to communicate with canister` | Network or canister issue | Check dfx is running, retry request                    |
| `Cannot find canister id`             | Missing declarations      | Run `dfx deploy` to generate declarations              |

### Error Handling Pattern

```javascript
try {
  const response = await chatService.sendMessage(userInput);
  // Handle success
} catch (error) {
  console.error("Error:", error);

  // Show user-friendly message
  showNotification(
    "Не успяхме да изпратим съобщението. Моля, опитайте отново.",
  );

  // Optional: Log to analytics
  logError(error);
}
```

## 🧪 Testing

### Local Development Testing

```bash
# Start local replica
dfx start --background

# Deploy backend
dfx deploy backend

# Your frontend should automatically connect to localhost:4943
```

### Testing Checklist

- [ ] Service initializes successfully
- [ ] Send message returns valid response
- [ ] Coordinates are extracted correctly
- [ ] Search returns matching trails
- [ ] Error handling works properly
- [ ] User ID persists across reloads

### Manual Test Script

```javascript
// In browser console:
import ICPChatService from "./ICPChatService.js";

const service = new ICPChatService();
await service.initialize();

// Test 1: Send message
const r1 = await service.sendMessage("Здравей");
console.log("Test 1:", r1.response ? "PASS" : "FAIL");

// Test 2: Search trails
const r2 = await service.searchTrails("София");
console.log("Test 2:", r2.length > 0 ? "PASS" : "FAIL");

// Test 3: Get trail
const r3 = await service.getTrailById(1);
console.log("Test 3:", r3 !== null ? "PASS" : "FAIL");
```

## 🔍 Troubleshooting

### Problem: Service won't initialize

**Symptoms:** Error "Failed to initialize ICPChatService"

**Solutions:**

1. Check dfx is running: `dfx ping`
2. Verify canister is deployed: `dfx canister id backend`
3. Check browser console for specific error
4. Ensure declarations are generated: `dfx deploy backend`

### Problem: "Cannot find module" errors

**Symptoms:** Import errors for `@dfinity/agent`

**Solutions:**

```bash
npm install @dfinity/agent @dfinity/candid @dfinity/principal
```

### Problem: Coordinates not showing

**Symptoms:** `response.coords` is always null

**Solutions:**

1. Check Motoko backend returns coordinates
2. Verify `_extractCoordinates()` method logic
3. Test with a message that mentions a specific trail

### Problem: Local vs Production Issues

**Symptoms:** Works locally but not in production

**Solutions:**

1. Check `fetchRootKey()` is NOT called in production
2. Verify canister ID is correct
3. Ensure agent host matches deployment environment

## 📝 Notes

- User IDs are stored in localStorage and persist across sessions
- The service automatically handles Motoko optional types (arrays)
- All console logs include emoji prefixes for easy filtering
- Coordinates from Motoko come as `?Coordinates` (optional type)

## 🤝 Contributing

When extending this service:

1. Keep methods focused and single-purpose
2. Add comprehensive JSDoc comments
3. Include error handling for all async operations
4. Add console logs for debugging
5. Update this README with new methods

## 📄 License

Part of the EcoTrails Bulgaria project.

---

**Created for:** EcoTrails Bulgaria - Internet Computer Migration  
**Last Updated:** November 2025  
**Version:** 1.0.0

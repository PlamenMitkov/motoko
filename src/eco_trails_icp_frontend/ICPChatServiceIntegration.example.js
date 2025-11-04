/**
 * Integration Example for ICPChatService
 *
 * This file demonstrates how to integrate ICPChatService into the existing
 * app.js to replace the fetch-based chat functionality with ICP canister calls.
 *
 * @module ICPChatServiceIntegration
 */

import ICPChatService from "./ICPChatService.js";

// ============================================================================
// STEP 1: Initialize the service at application startup
// ============================================================================

/**
 * Global chat service instance
 * Replace the CONFIG.API_ENDPOINTS.CHAT approach with this service
 */
let chatService = null;

/**
 * Initialize the ICP Chat Service
 * Call this when the application loads (in DOMContentLoaded or similar)
 */
async function initializeChatService() {
  try {
    console.log("🚀 Initializing ICP Chat Service...");

    // Create service instance
    chatService = new ICPChatService({
      // Automatically detects local vs production environment
      // You can override these if needed:
      // host: 'http://localhost:4943',
      // local: true,
      // canisterId: 'your-canister-id'
    });

    // Initialize the service (creates agent and actor)
    await chatService.initialize();

    console.log("✅ Chat service ready!");
    console.log("👤 User ID:", chatService.getUserId());
    console.log("🆔 Canister ID:", chatService.getCanisterId());

    return chatService;
  } catch (error) {
    console.error("❌ Failed to initialize chat service:", error);

    // Show error to user
    showErrorNotification(
      "Не успяхме да се свържем със сървъра. Моля, презаредете страницата.",
    );

    throw error;
  }
}

// ============================================================================
// STEP 2: Replace sendChatMessage function
// ============================================================================

/**
 * ORIGINAL FUNCTION (to be replaced):
 *
 * async function sendChatMessage(message) {
 *     const response = await fetch(CONFIG.API_ENDPOINTS.CHAT, {
 *         method: 'POST',
 *         headers: {
 *             'Content-Type': 'application/json',
 *         },
 *         body: JSON.stringify({ message: message })
 *     });
 *
 *     if (!response.ok) {
 *         throw new Error(`HTTP грешка: ${response.status}`);
 *     }
 *
 *     return await response.json();
 * }
 */

/**
 * NEW FUNCTION using ICPChatService:
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

// ============================================================================
// STEP 3: Update handleChatSubmit to use the new service
// ============================================================================

/**
 * UPDATED VERSION of handleChatSubmit
 * This replaces the existing function in app.js
 */
async function handleChatSubmit(event) {
  event.preventDefault();

  const chatInput = document.getElementById("chat-input");
  const message = chatInput.value.trim();

  if (!message) return;

  // Validate message length
  if (message.length > CONFIG.LIMITS.MAX_MESSAGE_LENGTH) {
    showErrorNotification(
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

// ============================================================================
// STEP 4: Additional helper functions for ICP integration
// ============================================================================

/**
 * Search for trails using the ICP canister
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of trails
 */
async function searchTrailsICP(query) {
  if (!chatService || !chatService.isInitialized()) {
    console.error("Chat service not initialized");
    return [];
  }

  try {
    const trails = await chatService.searchTrails(query);
    return trails;
  } catch (error) {
    console.error("Error searching trails:", error);
    return [];
  }
}

/**
 * Get a specific trail by ID
 * @param {number} trailId - Trail ID
 * @returns {Promise<Object|null>} Trail object or null
 */
async function getTrailByIdICP(trailId) {
  if (!chatService || !chatService.isInitialized()) {
    console.error("Chat service not initialized");
    return null;
  }

  try {
    const trail = await chatService.getTrailById(trailId);
    return trail;
  } catch (error) {
    console.error("Error getting trail:", error);
    return null;
  }
}

/**
 * List all trails
 * @returns {Promise<Array>} All trails
 */
async function listAllTrailsICP() {
  if (!chatService || !chatService.isInitialized()) {
    console.error("Chat service not initialized");
    return [];
  }

  try {
    const trails = await chatService.listAllTrails();
    return trails;
  } catch (error) {
    console.error("Error listing trails:", error);
    return [];
  }
}

/**
 * Show error notification to user
 * @param {string} message - Error message
 */
function showErrorNotification(message) {
  // Implement your error notification UI here
  // For example:
  console.error("⚠️", message);

  // You could also use a toast notification, modal, etc.
  if (typeof displayAIResponse === "function") {
    displayAIResponse({
      response: `⚠️ ${message}`,
    });
  }
}

// ============================================================================
// STEP 5: Application initialization
// ============================================================================

/**
 * Initialize the application
 * Add this to your existing DOMContentLoaded event listener
 */
document.addEventListener("DOMContentLoaded", async function () {
  console.log("🌲 EcoTrails Bulgaria - Starting...");

  try {
    // Initialize chat service first
    await initializeChatService();

    // ... rest of your existing initialization code ...

    // Setup event listeners
    const chatForm = document.getElementById("chat-form");
    if (chatForm) {
      chatForm.addEventListener("submit", handleChatSubmit);
    }

    // Display welcome message
    displayWelcomeMessage();

    console.log("✅ Application initialized successfully");
  } catch (error) {
    console.error("❌ Application initialization failed:", error);
  }
});

// ============================================================================
// EXPORTS (if using modules)
// ============================================================================

export {
  initializeChatService,
  sendChatMessage,
  handleChatSubmit,
  searchTrailsICP,
  getTrailByIdICP,
  listAllTrailsICP,
  chatService,
};

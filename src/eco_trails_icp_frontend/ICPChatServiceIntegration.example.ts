/**
 * Integration Example for ICPChatService (TypeScript)
 *
 * This file demonstrates how to integrate ICPChatService into your TypeScript
 * application to communicate with the Motoko backend canister.
 *
 * @module ICPChatServiceIntegration
 */

import ICPChatService, {
  ChatResponse,
  TrailRecord,
  Coordinates,
  ICPChatServiceConfig,
} from "./ICPChatService";

// ============================================================================
// STEP 1: Initialize the service at application startup
// ============================================================================

/**
 * Global chat service instance
 * Replace the CONFIG.API_ENDPOINTS.CHAT approach with this service
 */
let chatService: ICPChatService | null = null;

/**
 * Initialize the ICP Chat Service
 * Call this when the application loads (in DOMContentLoaded or similar)
 *
 * @returns Promise resolving to the initialized service
 * @throws Error if initialization fails
 */
async function initializeChatService(): Promise<ICPChatService> {
  try {
    console.log("🚀 Initializing ICP Chat Service...");

    // Create service instance with optional config
    const config: ICPChatServiceConfig = {
      // Automatically detects local vs production environment
      // You can override these if needed:
      // host: 'http://localhost:4943',
      // local: true,
      // canisterId: 'your-canister-id'
    };

    chatService = new ICPChatService(config);

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
 * Sends a chat message to the ICP canister backend
 *
 * @param message - User's message
 * @returns Promise resolving to response with text and optional coordinates
 * @throws Error if service not initialized or request fails
 *
 * @example
 * const response = await sendChatMessage("Търся екопътека в София");
 * console.log(response.response);
 * if (response.coords) {
 *   showOnMap(response.coords);
 * }
 */
async function sendChatMessage(message: string): Promise<ChatResponse> {
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
 * Handle chat form submission
 * This replaces the existing function in your application
 *
 * @param event - Form submit event
 */
async function handleChatSubmit(event: Event): Promise<void> {
  event.preventDefault();

  const chatInput = document.getElementById("chat-input") as HTMLInputElement;
  if (!chatInput) return;

  const message = chatInput.value.trim();

  if (!message) return;

  // Validate message length
  const MAX_MESSAGE_LENGTH = 500;
  if (message.length > MAX_MESSAGE_LENGTH) {
    showErrorNotification(
      `Съобщението е твърде дълго (макс ${MAX_MESSAGE_LENGTH} символа)`,
    );
    return;
  }

  // Clear input
  chatInput.value = "";

  // Show user message
  displayUserMessage(message);

  // Show loading indicator
  showTypingIndicator();

  try {
    // Send message through ICP canister
    const response = await sendChatMessage(message);

    // Hide loading indicator
    hideTypingIndicator();

    // Display AI response
    displayAIResponse(response);

    // If response contains coordinates, update map
    if (response.coords) {
      updateMapWithCoordinates(response.coords);
    }
  } catch (error) {
    console.error("Chat error:", error);

    hideTypingIndicator();

    // Show error message
    displayAIResponse({
      response:
        "Извинявам се, възникна техническа грешка. Моля, опитайте отново след малко.",
      coords: null,
    });
  }
}

// ============================================================================
// STEP 4: Additional helper functions for ICP integration
// ============================================================================

/**
 * Search for trails using the ICP canister
 *
 * @param query - Search query
 * @returns Promise resolving to array of trails
 *
 * @example
 * const trails = await searchTrailsICP("София");
 * trails.forEach(trail => console.log(trail.name));
 */
async function searchTrailsICP(query: string): Promise<TrailRecord[]> {
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
 *
 * @param trailId - Trail ID (number or bigint)
 * @returns Promise resolving to trail object or null
 *
 * @example
 * const trail = await getTrailByIdICP(1);
 * if (trail) {
 *   console.log(trail.name, trail.description);
 * }
 */
async function getTrailByIdICP(
  trailId: number | bigint,
): Promise<TrailRecord | null> {
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
 *
 * @returns Promise resolving to all trails
 *
 * @example
 * const allTrails = await listAllTrailsICP();
 * console.log(`Found ${allTrails.length} trails`);
 */
async function listAllTrailsICP(): Promise<TrailRecord[]> {
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

// ============================================================================
// STEP 5: UI Helper Functions (typed versions)
// ============================================================================

/**
 * Display user message in the chat
 *
 * @param message - User's message text
 */
function displayUserMessage(message: string): void {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) return;

  const messageElement = createMessageElement(message, "user");
  chatMessages.appendChild(messageElement);

  // Scroll to bottom
  scrollToBottom(chatMessages);
}

/**
 * Display AI response in the chat
 *
 * @param response - Chat response from backend
 */
function displayAIResponse(response: ChatResponse): void {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) return;

  const message =
    response.response ||
    "Извинявам се, но не мога да обработя заявката ви в момента.";
  const messageElement = createMessageElement(message, "ai");

  // Animation on appear
  messageElement.style.opacity = "0";
  messageElement.style.transform = "translateY(20px)";

  chatMessages.appendChild(messageElement);

  // Animate
  setTimeout(() => {
    messageElement.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    messageElement.style.opacity = "1";
    messageElement.style.transform = "translateY(0)";
  }, 50);

  // Scroll to bottom
  scrollToBottom(chatMessages);
}

/**
 * Create a message DOM element
 *
 * @param content - Message content
 * @param type - Message type ('user' or 'ai')
 * @returns The created DOM element
 */
function createMessageElement(
  content: string,
  type: "user" | "ai",
): HTMLDivElement {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}-message`;

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  contentDiv.textContent = content;

  const timestampDiv = document.createElement("div");
  timestampDiv.className = "message-timestamp";
  timestampDiv.textContent = formatTimestamp(new Date());

  messageDiv.appendChild(contentDiv);
  messageDiv.appendChild(timestampDiv);

  return messageDiv;
}

/**
 * Update map with coordinates
 *
 * @param coords - Coordinates to display on map
 */
function updateMapWithCoordinates(coords: Coordinates): void {
  console.log("🗺️ Updating map with coordinates:", coords);

  // Implement your map update logic here
  // For example, using Leaflet:
  // map.setView([coords.lat, coords.lng], 13);
  // L.marker([coords.lat, coords.lng]).addTo(map);
}

/**
 * Show typing indicator
 */
function showTypingIndicator(): void {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) return;

  const indicator = document.createElement("div");
  indicator.id = "typing-indicator";
  indicator.className = "typing-indicator";
  indicator.innerHTML = "<span></span><span></span><span></span>";

  chatMessages.appendChild(indicator);
  scrollToBottom(chatMessages);
}

/**
 * Hide typing indicator
 */
function hideTypingIndicator(): void {
  const indicator = document.getElementById("typing-indicator");
  if (indicator) {
    indicator.remove();
  }
}

/**
 * Scroll chat to bottom
 *
 * @param element - Element to scroll
 */
function scrollToBottom(element: HTMLElement): void {
  element.scrollTop = element.scrollHeight;
}

/**
 * Format timestamp for display
 *
 * @param date - Date to format
 * @returns Formatted time string
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Show error notification to user
 *
 * @param message - Error message to display
 */
function showErrorNotification(message: string): void {
  console.error("⚠️", message);

  // You could implement a toast notification, modal, etc.
  const notification = document.createElement("div");
  notification.className = "error-notification";
  notification.textContent = message;
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 16px 24px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 9999;
    `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// ============================================================================
// STEP 6: Application initialization
// ============================================================================

/**
 * Initialize the application
 * Add this to your existing DOMContentLoaded event listener
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🌲 EcoTrails Bulgaria - Starting...");

  try {
    // Initialize chat service first
    await initializeChatService();

    // Setup event listeners
    const chatForm = document.getElementById("chat-form");
    if (chatForm) {
      chatForm.addEventListener("submit", handleChatSubmit);
    }

    // Display welcome message
    displayAIResponse({
      response: `Здравейте! 👋 Аз съм вашият интелигентен туристически асистент за екопътеки в България.
            
Мога да ви помогна с:
🗺️ Намиране на подходящи маршрути
📍 Информация за местоположения
🥾 Съвети за подготовка
🌟 Препоръки според вашите предпочитания

Как мога да ви помогна днес?`,
      coords: null,
    });

    console.log("✅ Application initialized successfully");
  } catch (error) {
    console.error("❌ Application initialization failed:", error);
    showErrorNotification(
      "Неуспешно зареждане на приложението. Моля, презаредете страницата.",
    );
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

export {
  initializeChatService,
  sendChatMessage,
  handleChatSubmit,
  searchTrailsICP,
  getTrailByIdICP,
  listAllTrailsICP,
  displayUserMessage,
  displayAIResponse,
  updateMapWithCoordinates,
  chatService,
};

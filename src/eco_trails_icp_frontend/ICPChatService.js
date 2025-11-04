/**
 * ICP Chat Service
 *
 * A modular service class for communicating with the Motoko backend canister.
 * Replaces the traditional REST API approach with Internet Computer canister calls.
 *
 * @module ICPChatService
 * @requires @dfinity/agent
 * @requires @dfinity/candid
 * @requires @dfinity/principal
 */

import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../declarations/backend";
import { canisterId } from "../../declarations/backend";

/**
 * ICPChatService - Service class for ICP canister communication
 *
 * This class handles all communication with the Motoko backend canister,
 * specifically for the eco-trails chatbot functionality.
 *
 * @class
 * @example
 * const chatService = new ICPChatService();
 * await chatService.initialize();
 * const response = await chatService.sendMessage("Търся екопътека в София");
 */
class ICPChatService {
  /**
   * Creates an instance of ICPChatService
   *
   * @constructor
   * @param {Object} config - Configuration options
   * @param {string} config.host - The IC host URL (default: location.origin for production)
   * @param {boolean} config.local - Whether to use local development replica
   */
  constructor(config = {}) {
    this.config = {
      host: config.host || this._getDefaultHost(),
      local:
        config.local !== undefined ? config.local : this._isLocalEnvironment(),
      canisterId: config.canisterId || canisterId,
      ...config,
    };

    this.agent = null;
    this.actor = null;
    this.userId = this._generateUserId();
    this.initialized = false;
  }

  /**
   * Determines the default host based on environment
   * @private
   * @returns {string} The IC host URL
   */
  _getDefaultHost() {
    // In production, use the current origin
    // In development, use local replica
    if (typeof window !== "undefined") {
      const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      return isLocal ? "http://localhost:4943" : window.location.origin;
    }
    return "http://localhost:4943";
  }

  /**
   * Checks if running in local development environment
   * @private
   * @returns {boolean}
   */
  _isLocalEnvironment() {
    if (typeof window === "undefined") return true;
    return (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );
  }

  /**
   * Generates a unique user ID for the session
   * @private
   * @returns {string} User ID
   */
  _generateUserId() {
    // Try to get from localStorage first
    if (typeof window !== "undefined" && window.localStorage) {
      let userId = localStorage.getItem("ecotrails_user_id");
      if (!userId) {
        userId =
          "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        localStorage.setItem("ecotrails_user_id", userId);
      }
      return userId;
    }
    // Fallback for environments without localStorage
    return "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Initializes the service by creating the agent and actor
   *
   * @async
   * @throws {Error} If initialization fails
   * @returns {Promise<void>}
   *
   * @example
   * const service = new ICPChatService();
   * await service.initialize();
   */
  async initialize() {
    if (this.initialized) {
      console.log("ICPChatService already initialized");
      return;
    }

    try {
      console.log("🚀 Initializing ICPChatService...");
      console.log("📍 Host:", this.config.host);
      console.log("🏠 Local environment:", this.config.local);
      console.log("🆔 Canister ID:", this.config.canisterId);

      // Create the agent
      this.agent = new HttpAgent({
        host: this.config.host,
      });

      // Fetch root key for local development (required for certificate verification)
      if (this.config.local) {
        console.log("🔑 Fetching root key for local development...");
        await this.agent.fetchRootKey();
        console.log("✅ Root key fetched successfully");
      }

      // Create the actor
      this.actor = Actor.createActor(idlFactory, {
        agent: this.agent,
        canisterId: this.config.canisterId,
      });

      this.initialized = true;
      console.log("✅ ICPChatService initialized successfully");
      console.log("👤 User ID:", this.userId);
    } catch (error) {
      console.error("❌ Failed to initialize ICPChatService:", error);
      throw new Error(`ICPChatService initialization failed: ${error.message}`);
    }
  }

  /**
   * Ensures the service is initialized before making calls
   * @private
   * @throws {Error} If service is not initialized
   */
  _ensureInitialized() {
    if (!this.initialized || !this.actor) {
      throw new Error(
        "ICPChatService not initialized. Call initialize() first.",
      );
    }
  }

  /**
   * Sends a message to the chatbot and receives a response
   *
   * @async
   * @param {string} message - The user's message
   * @returns {Promise<Object>} The response object with shape:
   *   {
   *     response: string,      // The AI-generated response text
   *     coords: {              // Optional coordinates (if trail mentioned)
   *       lat: number,
   *       lng: number
   *     } | null
   *   }
   * @throws {Error} If the canister call fails
   *
   * @example
   * const response = await service.sendMessage("Търся екопътека в София");
   * console.log(response.response); // AI response text
   * if (response.coords) {
   *   console.log(`Coordinates: ${response.coords.lat}, ${response.coords.lng}`);
   * }
   */
  async sendMessage(message) {
    this._ensureInitialized();

    if (!message || typeof message !== "string") {
      throw new Error("Message must be a non-empty string");
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      throw new Error("Message cannot be empty");
    }

    if (trimmedMessage.length > 500) {
      throw new Error("Message too long (max 500 characters)");
    }

    try {
      console.log("📤 Sending message to canister...");
      console.log("👤 User ID:", this.userId);
      console.log("💬 Message:", trimmedMessage);

      // Call the queryData function on the backend canister
      const response = await this.actor.queryData(this.userId, trimmedMessage);

      console.log("📥 Response received from canister");
      console.log("📝 Response text:", response.response);
      console.log("📍 Coordinates:", response.coords);

      // Transform the response to match the expected format
      return {
        response: response.response,
        coords: this._extractCoordinates(response.coords),
      };
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      throw new Error(`Failed to communicate with canister: ${error.message}`);
    }
  }

  /**
   * Extracts coordinates from the optional coords field
   * @private
   * @param {Array|null} coords - Coordinates from Motoko (optional array)
   * @returns {Object|null} Coordinates object or null
   */
  _extractCoordinates(coords) {
    // Motoko optional types come as arrays where [] = null, [value] = Some(value)
    if (Array.isArray(coords) && coords.length > 0) {
      const coordObj = coords[0];
      return {
        lat: coordObj.lat,
        lng: coordObj.lng,
      };
    }
    return null;
  }

  /**
   * Searches for trails matching a query
   *
   * @async
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching trails
   * @throws {Error} If the canister call fails
   *
   * @example
   * const trails = await service.searchTrails("София");
   * trails.forEach(trail => console.log(trail.name));
   */
  async searchTrails(query) {
    this._ensureInitialized();

    try {
      console.log("🔍 Searching trails with query:", query);
      const trails = await this.actor.searchTrails(query);
      console.log(`✅ Found ${trails.length} trails`);
      return trails;
    } catch (error) {
      console.error("❌ Failed to search trails:", error);
      throw new Error(`Trail search failed: ${error.message}`);
    }
  }

  /**
   * Gets a trail by its ID
   *
   * @async
   * @param {number} trailId - The trail ID (Nat)
   * @returns {Promise<Object|null>} Trail object or null if not found
   * @throws {Error} If the canister call fails
   *
   * @example
   * const trail = await service.getTrailById(1);
   * if (trail) {
   *   console.log(trail.name);
   * }
   */
  async getTrailById(trailId) {
    this._ensureInitialized();

    try {
      console.log("🔍 Getting trail by ID:", trailId);
      const result = await this.actor.getTrailById(BigInt(trailId));

      // Motoko optional comes as array
      if (Array.isArray(result) && result.length > 0) {
        return result[0];
      }
      return null;
    } catch (error) {
      console.error("❌ Failed to get trail:", error);
      throw new Error(`Get trail failed: ${error.message}`);
    }
  }

  /**
   * Lists all available trails
   *
   * @async
   * @returns {Promise<Array>} Array of all trails
   * @throws {Error} If the canister call fails
   *
   * @example
   * const allTrails = await service.listAllTrails();
   * console.log(`Total trails: ${allTrails.length}`);
   */
  async listAllTrails() {
    this._ensureInitialized();

    try {
      console.log("📋 Listing all trails...");
      const trails = await this.actor.listAllTrails();
      console.log(`✅ Retrieved ${trails.length} trails`);
      return trails;
    } catch (error) {
      console.error("❌ Failed to list trails:", error);
      throw new Error(`List trails failed: ${error.message}`);
    }
  }

  /**
   * Gets the current user ID
   *
   * @returns {string} The user ID
   */
  getUserId() {
    return this.userId;
  }

  /**
   * Checks if the service is initialized
   *
   * @returns {boolean} True if initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Gets the canister ID
   *
   * @returns {string} The canister ID
   */
  getCanisterId() {
    return this.config.canisterId;
  }

  /**
   * Resets the service (useful for testing)
   *
   * @example
   * service.reset();
   * await service.initialize(); // Re-initialize with new settings
   */
  reset() {
    this.agent = null;
    this.actor = null;
    this.initialized = false;
    console.log("🔄 ICPChatService reset");
  }
}

// Export the class as default
export default ICPChatService;

// Also export as named export for flexibility
export { ICPChatService };

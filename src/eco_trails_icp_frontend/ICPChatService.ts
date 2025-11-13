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

import { Actor, HttpAgent, ActorSubclass } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";

// Import the generated declarations
import { idlFactory } from "../../declarations/backend";
import { canisterId } from "../../declarations/backend";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Coordinates type matching Motoko backend
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Location information for a trail
 */
export interface Location {
  region: string;
  keywords: string[];
  coordinates: Coordinates;
}

/**
 * Trail details and characteristics
 */
export interface TrailDetails {
  difficulty: string;
  duration: string;
  length: string;
  elevation: string;
}

/**
 * Main TrailRecord data structure
 */
export interface TrailRecord {
  id: bigint;
  name: string;
  description: string;
  location: Location;
  trail_details: TrailDetails;
  best_season: string[];
}

/**
 * Chat response from the backend
 */
export interface ChatResponse {
  response: string;
  coords: Coordinates | null;
}

/**
 * Configuration options for ICPChatService
 */
export interface ICPChatServiceConfig {
  host?: string;
  local?: boolean;
  canisterId?: string;
}

/**
 * Backend canister interface
 * Defines the methods available on the Motoko backend
 */
export interface BackendActor {
  queryData: (
    userId: string,
    message: string,
  ) => Promise<{
    response: string;
    coords: [] | [Coordinates];
  }>;
  searchTrails: (query: string) => Promise<TrailRecord[]>;
  getTrailById: (id: bigint) => Promise<[] | [TrailRecord]>;
  listAllTrails: () => Promise<TrailRecord[]>;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

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
export class ICPChatService {
  private config: Required<ICPChatServiceConfig>;
  private agent: HttpAgent | null = null;
  private actor: ActorSubclass<BackendActor> | null = null;
  private userId: string;
  private initialized: boolean = false;

  /**
   * Creates an instance of ICPChatService
   *
   * @constructor
   * @param config - Configuration options
   */
  constructor(config: ICPChatServiceConfig = {}) {
    this.config = {
      host: config.host || this._getDefaultHost(),
      local:
        config.local !== undefined ? config.local : this._isLocalEnvironment(),
      canisterId: config.canisterId || canisterId,
    };

    this.userId = this._generateUserId();
  }

  /**
   * Determines the default host based on environment
   * @private
   * @returns The IC host URL
   */
  private _getDefaultHost(): string {
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
   * @returns True if local environment
   */
  private _isLocalEnvironment(): boolean {
    if (typeof window === "undefined") return true;
    return (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );
  }

  /**
   * Generates a unique user ID for the session
   * @private
   * @returns User ID
   */
  private _generateUserId(): string {
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
   * @throws Error if initialization fails
   * @returns Promise that resolves when initialized
   *
   * @example
   * const service = new ICPChatService();
   * await service.initialize();
   */
  public async initialize(): Promise<void> {
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
      this.actor = Actor.createActor<BackendActor>(
        idlFactory as IDL.InterfaceFactory,
        {
          agent: this.agent,
          canisterId: this.config.canisterId,
        },
      );

      this.initialized = true;
      console.log("✅ ICPChatService initialized successfully");
      console.log("👤 User ID:", this.userId);
    } catch (error) {
      console.error("❌ Failed to initialize ICPChatService:", error);
      throw new Error(
        `ICPChatService initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Ensures the service is initialized before making calls
   * @private
   * @throws Error if service is not initialized
   */
  private _ensureInitialized(): void {
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
   * @param message - The user's message
   * @returns Promise resolving to the response object
   * @throws Error if the canister call fails or validation fails
   *
   * @example
   * const response = await service.sendMessage("Търся екопътека в София");
   * console.log(response.response); // AI response text
   * if (response.coords) {
   *   console.log(`Coordinates: ${response.coords.lat}, ${response.coords.lng}`);
   * }
   */
  public async sendMessage(message: string): Promise<ChatResponse> {
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
      const response = await this.actor!.queryData(this.userId, trimmedMessage);

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
      throw new Error(
        `Failed to communicate with canister: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Extracts coordinates from the optional coords field
   * @private
   * @param coords - Coordinates from Motoko (optional array)
   * @returns Coordinates object or null
   */
  private _extractCoordinates(coords: [] | [Coordinates]): Coordinates | null {
    // Motoko optional types come as arrays where [] = null, [value] = Some(value)
    if (Array.isArray(coords) && coords.length > 0) {
      return coords[0];
    }
    return null;
  }

  /**
   * Searches for trails matching a query
   *
   * @async
   * @param query - Search query
   * @returns Promise resolving to array of matching trails
   * @throws Error if the canister call fails
   *
   * @example
   * const trails = await service.searchTrails("София");
   * trails.forEach(trail => console.log(trail.name));
   */
  public async searchTrails(query: string): Promise<TrailRecord[]> {
    this._ensureInitialized();

    try {
      console.log("🔍 Searching trails with query:", query);
      const trails = await this.actor!.searchTrails(query);
      console.log(`✅ Found ${trails.length} trails`);
      return trails;
    } catch (error) {
      console.error("❌ Failed to search trails:", error);
      throw new Error(
        `Trail search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Gets a trail by its ID
   *
   * @async
   * @param trailId - The trail ID (number or bigint)
   * @returns Promise resolving to trail object or null if not found
   * @throws Error if the canister call fails
   *
   * @example
   * const trail = await service.getTrailById(1);
   * if (trail) {
   *   console.log(trail.name);
   * }
   */
  public async getTrailById(
    trailId: number | bigint,
  ): Promise<TrailRecord | null> {
    this._ensureInitialized();

    try {
      console.log("🔍 Getting trail by ID:", trailId);
      const id = typeof trailId === "number" ? BigInt(trailId) : trailId;
      const result = await this.actor!.getTrailById(id);

      // Motoko optional comes as array
      if (Array.isArray(result) && result.length > 0) {
        return result[0];
      }
      return null;
    } catch (error) {
      console.error("❌ Failed to get trail:", error);
      throw new Error(
        `Get trail failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Lists all available trails
   *
   * @async
   * @returns Promise resolving to array of all trails
   * @throws Error if the canister call fails
   *
   * @example
   * const allTrails = await service.listAllTrails();
   * console.log(`Total trails: ${allTrails.length}`);
   */
  public async listAllTrails(): Promise<TrailRecord[]> {
    this._ensureInitialized();

    try {
      console.log("📋 Listing all trails...");
      const trails = await this.actor!.listAllTrails();
      console.log(`✅ Retrieved ${trails.length} trails`);
      return trails;
    } catch (error) {
      console.error("❌ Failed to list trails:", error);
      throw new Error(
        `List trails failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Gets the current user ID
   *
   * @returns The user ID
   */
  public getUserId(): string {
    return this.userId;
  }

  /**
   * Checks if the service is initialized
   *
   * @returns True if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Gets the canister ID
   *
   * @returns The canister ID
   */
  public getCanisterId(): string {
    return this.config.canisterId;
  }

  /**
   * Resets the service (useful for testing)
   *
   * @example
   * service.reset();
   * await service.initialize(); // Re-initialize with new settings
   */
  public reset(): void {
    this.agent = null;
    this.actor = null;
    this.initialized = false;
    console.log("🔄 ICPChatService reset");
  }
}

// Export as default
export default ICPChatService;

import { backend } from "../../../declarations/backend";
import type {
  TrailRecord,
  Coordinates,
  Location,
  TrailDetails,
} from "../../../declarations/backend/backend.did";

// Re-export types
export type { TrailRecord, Coordinates, Location, TrailDetails };

// Convenience type alias
export type Trail = TrailRecord;

export interface SearchResult {
  success: boolean;
  trails: Trail[];
  count: number;
}

export interface ChatResponse {
  response: string;
  coords: Coordinates | null;
}

/**
 * Service for handling all backend canister API calls
 */
export const backendService = {
  /**
   * Sends a greeting to the backend and returns the response
   * @param name Name to greet
   * @returns Promise with the greeting response
   */
  async greet(name: string): Promise<string> {
    return await backend.greet(name || "World");
  },

  /**
   * Fetches the current counter value
   * @returns Promise with the current count
   */
  async getCount(): Promise<bigint> {
    return await backend.get_count();
  },

  /**
   * Increments the counter on the backend
   * @returns Promise with the new count
   */
  async incrementCounter(): Promise<bigint> {
    return await backend.increment();
  },

  /**
   * Sends a prompt to the chatbot backend
   * @param prompt The user's prompt text
   * @returns Promise with the chatbot response
   */
  async sendLlmPrompt(prompt: string): Promise<string> {
    // Generate a simple user ID (in production, use proper authentication)
    const userId = "user_" + Math.random().toString(36).substring(7);
    const result = await backend.queryData(userId, prompt);
    return result.response;
  },

  // ============================================================================
  // ECO-TRAILS METHODS
  // ============================================================================

  /**
   * Search for eco-trails by keyword
   * @param query Search query string
   * @returns Promise with search results
   */
  async searchTrails(query: string): Promise<SearchResult> {
    const trails = await backend.searchTrails(query);
    return {
      success: trails.length > 0,
      trails: trails,
      count: trails.length,
    };
  },

  /**
   * Get a specific trail by ID
   * @param trailId Trail identifier (as number or bigint)
   * @returns Promise with trail data or null
   */
  async getTrailById(trailId: number | bigint): Promise<Trail | null> {
    const id = typeof trailId === "number" ? BigInt(trailId) : trailId;
    const result = await backend.getTrailById(id);
    return result.length > 0 && result[0] ? result[0] : null;
  },

  /**
   * Get all available trails
   * @returns Promise with array of all trails
   */
  async listAllTrails(): Promise<Trail[]> {
    return await backend.listAllTrails();
  },

  /**
   * Advanced search with multiple filters
   * @param region Optional region filter
   * @param difficulty Optional difficulty filter
   * @param season Optional season filter
   * @returns Promise with search results
   */
  async advancedSearch(
    region?: string,
    difficulty?: string,
    season?: string,
  ): Promise<SearchResult> {
    const trails = await backend.advancedSearch(
      region ? [region] : [],
      difficulty ? [difficulty] : [],
      season ? [season] : [],
    );
    return {
      success: trails.length > 0,
      trails: trails,
      count: trails.length,
    };
  },

  /**
   * Query the chatbot with a message
   * @param userId User identifier for session management
   * @param message User's message
   * @returns Promise with chat response
   */
  async queryData(userId: string, message: string): Promise<ChatResponse> {
    const result = await backend.queryData(userId, message);

    // Parse the JSON response to extract the actual message
    let responseText = result.response;
    try {
      const parsed = JSON.parse(result.response);
      if (parsed.response) {
        responseText = parsed.response;
      }
    } catch (e) {
      // If parsing fails, use the original response
      console.warn("Failed to parse response as JSON, using raw text");
    }

    return {
      response: responseText,
      coords:
        result.coords.length > 0 ? (result.coords[0] as Coordinates) : null,
    };
  },

  /**
   * Add a new trail to the database
   * @param trail Trail object to add
   * @returns Promise with success boolean
   */
  async addTrail(trail: Trail): Promise<boolean> {
    return await backend.addTrail(trail);
  },
};

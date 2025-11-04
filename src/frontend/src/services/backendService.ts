import { backend } from "../../../declarations/backend";

// Type definitions matching Motoko backend
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location {
  region: string;
  keywords: string[];
  coordinates: Coordinates;
}

export interface TrailDetails {
  difficulty: string;
  duration: string;
  length: string;
  elevation: string;
}

export interface Trail {
  id: string;
  name: string;
  description: string;
  location: Location;
  trail_details: TrailDetails;
  best_season: string[];
}

export interface SearchResult {
  success: boolean;
  trails: Trail[];
  count: bigint;
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
   * Sends a prompt to the LLM backend
   * @param prompt The user's prompt text
   * @returns Promise with the LLM response
   */
  async sendLlmPrompt(prompt: string): Promise<string> {
    return await backend.prompt(prompt);
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
    const result = await backend.searchTrails(query);
    return {
      success: result.success,
      trails: result.trails as Trail[],
      count: result.count,
    };
  },

  /**
   * Get a specific trail by ID
   * @param trailId Trail identifier
   * @returns Promise with trail data or null
   */
  async getTrailById(trailId: string): Promise<Trail | null> {
    const result = await backend.getTrailById(trailId);
    return result.length > 0 ? (result[0] as Trail) : null;
  },

  /**
   * Get all available trails
   * @returns Promise with array of all trails
   */
  async listAllTrails(): Promise<Trail[]> {
    const trails = await backend.listAllTrails();
    return trails as Trail[];
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
    const result = await backend.advancedSearch(
      region ? [region] : [],
      difficulty ? [difficulty] : [],
      season ? [season] : [],
    );
    return {
      success: result.success,
      trails: result.trails as Trail[],
      count: result.count,
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
    return {
      response: result.response,
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

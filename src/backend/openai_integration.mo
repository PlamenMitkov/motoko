/**
 * OpenAI Integration Module for Motoko
 * 
 * This module provides integration with OpenAI's GPT-3.5-turbo API
 * using Internet Computer HTTP outcalls.
 * 
 * To use this in your main.mo:
 * 1. Import this module: import OpenAI "./openai_integration"
 * 2. Set your API key: await OpenAI.setApiKey(caller, "sk-...")
 * 3. Call the chat function: await OpenAI.chat(prompt, systemPrompt)
 */

import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Cycles "mo:base/ExperimentalCycles";
import Array "mo:base/Array";
import Nat8 "mo:base/Nat8";
import Nat "mo:base/Nat";
import Debug "mo:base/Debug";
import Principal "mo:base/Principal";

module {
    // ============================================================================
    // TYPES
    // ============================================================================

    /// HTTP outcall types (from IC management canister)
    public type HttpHeader = {
        name : Text;
        value : Text;
    };

    public type HttpMethod = {
        #get;
        #post;
        #head;
    };

    public type TransformContext = {
        function : shared query TransformArgs -> async HttpResponse;
        context : Blob;
    };

    public type HttpRequest = {
        url : Text;
        max_response_bytes : ?Nat64;
        headers : [HttpHeader];
        body : ?Blob;
        method : HttpMethod;
        transform : ?TransformContext;
    };

    public type HttpResponse = {
        status : Nat;
        headers : [HttpHeader];
        body : Blob;
    };

    public type TransformArgs = {
        response : HttpResponse;
        context : Blob;
    };

    /// Management canister interface
    public type IC = actor {
        http_request : HttpRequest -> async HttpResponse;
    };

    // ============================================================================
    // STATE
    // ============================================================================

    private var apiKey : Text = "";
    private var owner : ?Principal = null;

    // Management canister
    private let ic : IC = actor "aaaaa-aa";

    // ============================================================================
    // CONFIGURATION
    // ============================================================================

    public func setApiKey(caller : Principal, key : Text) : async () {
        // Set owner on first call
        if (owner == null) {
            owner := ?caller;
        };

        // Only owner can set API key
        switch (owner) {
            case (?o) {
                if (Principal.equal(caller, o)) {
                    apiKey := key;
                    Debug.print("✅ OpenAI API key set");
                } else {
                    Debug.print("❌ Only owner can set API key");
                };
            };
            case null {};
        };
    };

    public func getApiKeyStatus() : Bool {
        Text.size(apiKey) > 0
    };

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    /// Escape special characters for JSON
    private func escapeJson(text : Text) : Text {
        var result = "";
        for (char in text.chars()) {
            switch (char) {
                case ('\"') { result #= "\\\"" };
                case ('\\') { result #= "\\\\" };
                case ('\n') { result #= "\\n" };
                case ('\r') { result #= "\\r" };
                case ('\t') { result #= "\\t" };
                case _ { result #= Text.fromChar(char) };
            };
        };
        result
    };

    /// Build JSON request for OpenAI
    private func buildOpenAIRequest(userMessage : Text, systemPrompt : Text) : Text {
        "{" #
        "\"model\": \"gpt-3.5-turbo\"," #
        "\"messages\": [" #
            "{\"role\": \"system\", \"content\": \"" # escapeJson(systemPrompt) # "\"}," #
            "{\"role\": \"user\", \"content\": \"" # escapeJson(userMessage) # "\"}" #
        "]," #
        "\"temperature\": 0.0," #
        "\"max_tokens\": 384" #
        "}"
    };

    /// Extract content from OpenAI response
    private func extractContent(jsonResponse : Text) : Text {
        // Simple JSON parsing - look for "content": "..."
        // In production, use a proper JSON library
        
        let contentMarker = "\"content\":\"";
        var startIdx : ?Nat = null;
        
        // Find "content":"
        let chars = Text.toArray(jsonResponse);
        var i = 0;
        while (i < chars.size()) {
            if (i + contentMarker.size() < chars.size()) {
                var match = true;
                var j = 0;
                for (c in contentMarker.chars()) {
                    if (chars[i + j] != c) {
                        match := false;
                    };
                    j += 1;
                };
                if (match) {
                    startIdx := ?(i + contentMarker.size());
                    i := chars.size(); // Break
                };
            };
            i += 1;
        };

        switch (startIdx) {
            case null { return "Error: Could not parse response"; };
            case (?start) {
                // Extract until closing quote
                var content = "";
                var idx = start;
                var escaped = false;
                
                while (idx < chars.size()) {
                    let char = chars[idx];
                    
                    if (escaped) {
                        // Handle escaped characters
                        switch (char) {
                            case ('n') { content #= "\n" };
                            case ('r') { content #= "\r" };
                            case ('t') { content #= "\t" };
                            case ('\"') { content #= "\"" };
                            case ('\\') { content #= "\\" };
                            case _ { content #= Text.fromChar(char) };
                        };
                        escaped := false;
                    } else if (char == '\\') {
                        escaped := true;
                    } else if (char == '\"') {
                        // End of content
                        return content;
                    } else {
                        content #= Text.fromChar(char);
                    };
                    
                    idx += 1;
                };
                
                return content;
            };
        };
    };

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    /// Call OpenAI GPT-3.5-turbo via HTTP outcalls
    ///
    /// @param userMessage - The user's message
    /// @param systemPrompt - The system prompt/context
    /// @returns The AI-generated response text
    ///
    /// Example:
    /// ```motoko
    /// let response = await OpenAI.chat("Hello!", "You are a helpful assistant");
    /// ```
    public func chat(userMessage : Text, systemPrompt : Text) : async Text {
        if (Text.size(apiKey) == 0) {
            return "Error: OpenAI API key not set. Call setApiKey first.";
        };

        Debug.print("📤 Calling OpenAI GPT-3.5-turbo...");

        // Build request body
        let requestBody = buildOpenAIRequest(userMessage, systemPrompt);
        Debug.print("📝 Request: " # requestBody);

        // Prepare HTTP request
        let request : HttpRequest = {
            url = "https://api.openai.com/v1/chat/completions";
            max_response_bytes = ?2048;
            headers = [
                { name = "Content-Type"; value = "application/json" },
                { name = "Authorization"; value = "Bearer " # apiKey }
            ];
            body = ?Text.encodeUtf8(requestBody);
            method = #post;
            transform = null;
        };

        // Add cycles for HTTP request (~13M cycles)
        Cycles.add(13_000_000_000);

        try {
            // Make HTTP outcall
            let response = await ic.http_request(request);
            
            Debug.print("📥 Response status: " # Nat.toText(response.status));

            // Check status
            if (response.status != 200) {
                let errorBody = switch (Text.decodeUtf8(response.body)) {
                    case null { "Unknown error" };
                    case (?text) { text };
                };
                Debug.print("❌ Error response: " # errorBody);
                return "Error: OpenAI API returned status " # Nat.toText(response.status);
            };

            // Parse response
            let responseText = switch (Text.decodeUtf8(response.body)) {
                case null { 
                    Debug.print("❌ Could not decode response");
                    return "Error: Could not decode response";
                };
                case (?text) { text };
            };

            Debug.print("📄 Full response: " # responseText);

            // Extract content
            let content = extractContent(responseText);
            Debug.print("✅ Extracted content: " # content);

            return content;

        } catch (error) {
            Debug.print("❌ HTTP request failed: " # debug_show(error));
            return "Error: HTTP request failed. Check cycles balance and API key.";
        };
    };

    /// Simplified chat function with default system prompt
    public func chatSimple(userMessage : Text) : async Text {
        await chat(userMessage, "You are a helpful assistant.")
    };

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    /// Check if the OpenAI integration is properly configured
    public func isConfigured() : Bool {
        Text.size(apiKey) > 0
    };

    /// Get cost estimation for number of requests
    public func estimateCost(numberOfRequests : Nat) : Nat {
        // Each request costs approximately 13M cycles
        numberOfRequests * 13_000_000_000
    };
};

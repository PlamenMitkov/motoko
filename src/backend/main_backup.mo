import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";
import Debug "mo:base/Debug";
import Array "mo:base/Array";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Buffer "mo:base/Buffer";
import Char "mo:base/Char";

actor {
    // ============================================================================
    // TYPE DEFINITIONS
    // ============================================================================

    // Coordinates type for geographic locations
    public type Coordinates = {
        lat: Float;
        lng: Float;
    };

    // Location information for a trail
    public type Location = {
        region: Text;
        keywords: [Text];
        coordinates: Coordinates;
    };

    // Trail details and characteristics
    public type TrailDetails = {
        difficulty: Text;
        duration: Text;
        length: Text;
        elevation: Text;
    };

    // Main Trail data structure
    public type Trail = {
        id: Text;
        name: Text;
        description: Text;
        location: Location;
        trail_details: TrailDetails;
        best_season: [Text];
    };

    // Search result with optional trail data
    public type SearchResult = {
        success: Bool;
        trails: [Trail];
        count: Nat;
    };

    // Chat message structure
    public type ChatMessage = {
        role: Text; // "user" or "assistant"
        content: Text;
    };

    // Response structure for chat queries
    public type ChatResponse = {
        response: Text;
        coords: ?Coordinates;
    };

    // ============================================================================
    // STATE VARIABLES
    // ============================================================================

    // Counter variable to keep track of count (from original template)
    private stable var counter : Nat64 = 0;

    // Stable storage for trails
    private stable var trailsEntries : [(Text, Trail)] = [];
    private var trails = HashMap.HashMap<Text, Trail>(10, Text.equal, Text.hash);

    // Stable storage for conversation histories per user
    private stable var conversationHistoryEntries : [(Text, [ChatMessage])] = [];
    private var conversationHistories = HashMap.HashMap<Text, [ChatMessage]>(10, Text.equal, Text.hash);

    // ============================================================================
    // SYSTEM FUNCTIONS (Upgrade hooks)
    // ============================================================================

    system func preupgrade() {
        trailsEntries := Iter.toArray(trails.entries());
        conversationHistoryEntries := Iter.toArray(conversationHistories.entries());
    };

    system func postupgrade() {
        trails := HashMap.fromIter<Text, Trail>(trailsEntries.vals(), 10, Text.equal, Text.hash);
        conversationHistories := HashMap.fromIter<Text, [ChatMessage]>(conversationHistoryEntries.vals(), 10, Text.equal, Text.hash);
        trailsEntries := [];
        conversationHistoryEntries := [];
        
        // Initialize sample data if empty
        if (trails.size() == 0) {
            initializeSampleTrails();
        };
    };

    // ============================================================================
    // ORIGINAL TEMPLATE FUNCTIONS (Preserved)
    // ============================================================================

    // Greeting function that the frontend uses
    public query func greet(name : Text) : async Text {
        return "Hello, " # name # "!";
    };

    // Get the current counter value
    public query func get_count() : async Nat64 {
        return counter;
    };

    // Increment the counter and return the new value
    public func increment() : async Nat64 {
        counter += 1;
        return counter;
    };

    // Set the counter to a specific value
    public func set_count(value : Nat64) : async Nat64 {
        counter := value;
        return counter;
    };

    // Mock LLM function for testing
    public func prompt(prompt : Text) : async Text {
        Debug.print("Received prompt: " # prompt);
        
        // Simple mock responses based on prompt content
        if (Text.contains(prompt, #text "hello")) {
            return "Hello! I'm a mock LLM running on the Internet Computer. How can I help you today?";
        } else if (Text.contains(prompt, #text "how are you")) {
            return "I'm doing great! I'm a mock LLM implementation for testing purposes. Thanks for asking!";
        } else if (Text.contains(prompt, #text "what")) {
            return "I'm a mock LLM implementation. In a real deployment, this would connect to the actual LLM canister on the Internet Computer network.";
        } else if (Text.contains(prompt, #text "test")) {
            return "Test successful! The LLM integration is working properly. This is a mock response for testing purposes.";
        } else {
            return "I received your message: \"" # prompt # "\". This is a mock LLM response. In production, this would be handled by the actual LLM canister.";
        }
    };

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    // Convert text to lowercase for case-insensitive comparison
    private func toLower(text: Text) : Text {
        let chars = Text.toIter(text);
        var result = "";
        for (c in chars) {
            let lower = if (c >= 'A' and c <= 'Z') {
                Char.fromNat32(Char.toNat32(c) + 32);
            } else {
                c;
            };
            result := result # Char.toText(lower);
        };
        result
    };

    // Check if text contains a substring (case-insensitive)
    private func containsIgnoreCase(text: Text, search: Text) : Bool {
        Text.contains(toLower(text), #text toLower(search))
    };

    // Validate coordinates
    private func validateCoordinates(lat: Float, lng: Float) : Bool {
        // Check general coordinate bounds
        if (lat < -90.0 or lat > 90.0 or lng < -180.0 or lng > 180.0) {
            return false;
        };
        
        // Check Bulgaria bounds
        if (lat < 41.2 or lat > 44.2 or lng < 22.3 or lng > 28.6) {
            return false;
        };
        
        true
    };

    // Build context from trails for AI response
    private func buildContextFromTrails(foundTrails: [Trail]) : Text {
        if (foundTrails.size() == 0) {
            return "В момента няма намерени маршрути в базата данни, отговарящи на критериите за търсене.";
        };
        
        var context = "НАЛИЧНИ ЕКОПЪТЕКИ В БАЗАТА ДАННИ:\n==================================================\n";
        var index = 1;
        
        for (trail in foundTrails.vals()) {
            context := context # "\n" # Nat.toText(index) # ". " # trail.name # "\n";
            context := context # "   Регион: " # trail.location.region # "\n";
            context := context # "   Трудност: " # trail.trail_details.difficulty # "\n";
            context := context # "   Продължителност: " # trail.trail_details.duration # "\n";
            context := context # "   Описание: " # trail.description # "\n";
            context := context # "----------------------------------------\n";
            index += 1;
        };
        
        context
    };

    // ============================================================================
    // ECO-TRAILS FUNCTIONS
    // ============================================================================

    // Search trails by keyword
    public query func searchTrails(query: Text) : async SearchResult {
        if (Text.size(query) == 0) {
            return {
                success = false;
                trails = [];
                count = 0;
            };
        };

        let normalizedQuery = toLower(Text.trim(query, #text " "));
        let resultBuffer = Buffer.Buffer<Trail>(0);

        for ((id, trail) in trails.entries()) {
            // Search in name
            if (containsIgnoreCase(trail.name, normalizedQuery)) {
                resultBuffer.add(trail);
                continue;
            };

            // Search in description
            if (containsIgnoreCase(trail.description, normalizedQuery)) {
                resultBuffer.add(trail);
                continue;
            };

            // Search in region
            if (containsIgnoreCase(trail.location.region, normalizedQuery)) {
                resultBuffer.add(trail);
                continue;
            };

            // Search in keywords
            let keywordMatch = Array.find<Text>(trail.location.keywords, func(keyword) {
                containsIgnoreCase(keyword, normalizedQuery)
            });
            if (Option.isSome(keywordMatch)) {
                resultBuffer.add(trail);
                continue;
            };

            // Search in difficulty
            if (containsIgnoreCase(trail.trail_details.difficulty, normalizedQuery)) {
                resultBuffer.add(trail);
                continue;
            };
        };

        let results = Buffer.toArray(resultBuffer);
        {
            success = true;
            trails = results;
            count = results.size();
        }
    };

    // Get trail by ID
    public query func getTrailById(trailId: Text) : async ?Trail {
        trails.get(trailId)
    };

    // List all trails
    public query func listAllTrails() : async [Trail] {
        Iter.toArray(trails.vals())
    };

    // Advanced search with multiple criteria
    public query func advancedSearch(region: ?Text, difficulty: ?Text, season: ?Text) : async SearchResult {
        let resultBuffer = Buffer.Buffer<Trail>(0);

        for ((id, trail) in trails.entries()) {
            var matches = true;

            // Filter by region
            switch (region) {
                case (?r) {
                    if (not containsIgnoreCase(trail.location.region, r)) {
                        matches := false;
                    };
                };
                case null { };
            };

            // Filter by difficulty
            if (matches) {
                switch (difficulty) {
                    case (?d) {
                        if (not containsIgnoreCase(trail.trail_details.difficulty, d)) {
                            matches := false;
                        };
                    };
                    case null { };
                };
            };

            // Filter by season
            if (matches) {
                switch (season) {
                    case (?s) {
                        let seasonMatch = Array.find<Text>(trail.best_season, func(trailSeason) {
                            Text.equal(trailSeason, s)
                        });
                        if (Option.isNull(seasonMatch)) {
                            matches := false;
                        };
                    };
                    case null { };
                };
            };

            if (matches) {
                resultBuffer.add(trail);
            };
        };

        let results = Buffer.toArray(resultBuffer);
        {
            success = true;
            trails = results;
            count = results.size();
        }
    };

    // Query data - main chatbot endpoint
    public func queryData(userId: Text, message: Text) : async ChatResponse {
        Debug.print("📨 Received message from user " # userId # ": " # message);

        // Search for relevant trails
        let searchResult = await searchTrails(message);
        Debug.print("🔍 Found " # Nat.toText(searchResult.count) # " trails");

        // Build context for response
        let context = buildContextFromTrails(searchResult.trails);

        // Generate a simple response (in production, this would call an LLM)
        var response = "Здравейте! ";
        
        if (searchResult.count > 0) {
            response := response # "Намерих " # Nat.toText(searchResult.count) # " подходящи екопътеки за вас:\n\n";
            response := response # context;
            
            // Return first trail's coordinates if available
            if (searchResult.trails.size() > 0) {
                let firstTrail = searchResult.trails[0];
                return {
                    response = response;
                    coords = ?firstTrail.location.coordinates;
                };
            };
        } else {
            response := response # "Съжалявам, не намерих маршрути, отговарящи на вашето запитване. Можете ли да уточните какво търсите?";
        };

        {
            response = response;
            coords = null;
        }
    };

    // Add a new trail
    public func addTrail(trail: Trail) : async Bool {
        trails.put(trail.id, trail);
        Debug.print("✅ Added trail: " # trail.name);
        true
    };

    // Initialize sample trails
    private func initializeSampleTrails() {
        let trail1: Trail = {
            id = "trail001";
            name = "Екопътека Витоша - Златни мостове";
            description = "Красива екопътека в сърцето на Витоша с уникални скални образувания";
            location = {
                region = "София";
                keywords = ["витоша", "златни мостове", "софия", "планина"];
                coordinates = {
                    lat = 42.5833;
                    lng = 23.2667;
                };
            };
            trail_details = {
                difficulty = "средна";
                duration = "3-4 часа";
                length = "8 км";
                elevation = "+300м";
            };
            best_season = ["пролет", "лято", "есен"];
        };

        let trail2: Trail = {
            id = "trail002";
            name = "Екопътека Рилски манастир - Седемте езера";
            description = "Незабравима екопътека от Рилския манастир до прочутите Седем рилски езера";
            location = {
                region = "Рила";
                keywords = ["рила", "седем езера", "рилски манастир", "езера"];
                coordinates = {
                    lat = 42.1333;
                    lng = 23.3400;
                };
            };
            trail_details = {
                difficulty = "средна";
                duration = "5-6 часа";
                length = "12 км";
                elevation = "+800м";
            };
            best_season = ["лято", "есен"];
        };

        let trail3: Trail = {
            id = "trail003";
            name = "Екопътека Белинташ";
            description = "Мистична екопътека до тракийското светилище Белинташ в Родопите";
            location = {
                region = "Родопи";
                keywords = ["родопи", "белинташ", "тракийско светилище"];
                coordinates = {
                    lat = 41.7833;
                    lng = 25.3167;
                };
            };
            trail_details = {
                difficulty = "лесна";
                duration = "2-3 часа";
                length = "5 км";
                elevation = "+150м";
            };
            best_season = ["пролет", "лято", "есен"];
        };

        trails.put(trail1.id, trail1);
        trails.put(trail2.id, trail2);
        trails.put(trail3.id, trail3);

        Debug.print("✅ Initialized " # Nat.toText(trails.size()) # " sample trails");
    };

    // Initialize on first deployment
    if (trails.size() == 0) {
        initializeSampleTrails();
    };
};

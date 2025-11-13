import Nat64 "mo:base/Nat64";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";
import Debug "mo:base/Debug";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Float "mo:base/Float";
import Nat "mo:base/Nat";
import Buffer "mo:base/Buffer";
import Char "mo:base/Char";
import TrieMap "mo:base/TrieMap";
import Hash "mo:base/Hash";
import Blob "mo:base/Blob";
import Cycles "mo:base/ExperimentalCycles";
import LLM "mo:llm";

// Note: To use OpenAI GPT-3.5-turbo via HTTP outcalls, you would need:
// 1. IC HTTP outcalls (requires management canister interface)
// 2. API key management (stored securely)
// 3. JSON encoding/decoding library
// For now, using the ICP LLM canister which provides similar functionality
// See OPENAI_MIGRATION.md for implementing direct OpenAI integration

persistent actor {
    // ============================================================================
    // TYPE DEFINITIONS
    // ============================================================================

    // Coordinates type for geographic locations (Float, Float)
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

    // Main TrailRecord data structure
    public type TrailRecord = {
        id: Nat;
        name: Text;
        description: Text;
        location: Location;
        trail_details: TrailDetails;
        best_season: [Text];
    };

    // Search result with optional trail data
    public type SearchResult = {
        success: Bool;
        trails: [TrailRecord];
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
    // CONSTANTS
    // ============================================================================

    // System prompt for the AI assistant (in Bulgarian)
    private let SYSTEM_PROMPT : Text = 
        "Ти си експертен туристически асистент, специализиран в екопътеки и природен туризъм в България.\n\n" #
        "ТВОЯТА РОЛЯ:\n" #
        "- Помагаш на потребителите да открият подходящи екопътеки според техните предпочитания\n" #
        "- Предоставяш точна и полезна информация за маршрути, трудност, сезонност\n" #
        "- Даваш практични съвети за подготовка и безопасност\n\n" #
        "ФОРМАТ НА ОТГОВОРА:\n" #
        "Когато потребителят спомене конкретно място или маршрут, отговори с валиден JSON:\n" #
        "{\n" #
        "  \"response\": \"Описателен текст без координати в него\",\n" #
        "  \"coords\": { \"lat\": <latitude>, \"lng\": <longitude> }\n" #
        "}\n\n" #
        "ВАЖНИ ПРАВИЛА:\n" #
        "- НЕ добавяй текст преди или след JSON\n" #
        "- НЕ използвай markdown форматиране\n" #
        "- Ако не знаеш координатите, върни само: { \"response\": \"...\" }\n" #
        "- Бъди точен, полезен и насърчаващ\n\n" #
        "СТИЛ НА КОМУНИКАЦИЯ:\n" #
        "- Приятелски и професионален тон\n" #
        "- Използвай български език\n" #
        "- Давай конкретни и практични съвети";

    // FAQ content to provide context to the AI (abbreviated version)
    private let FAQ_CONTENT : Text =
        "ЧЕСТО ЗАДАВАНИ ВЪПРОСИ ЗА ЕКОПЪТЕКИТЕ В БЪЛГАРИЯ\n\n" #
        "🌿 ОСНОВНА ИНФОРМАЦИЯ\n\n" #
        "❓ Какво представлява екопътеката?\n" #
        "Екопътеката е специално обозначен маршрут в природата, проектиран да минимизира " #
        "въздействието върху околната среда.\n\n" #
        "🎯 ИЗБОР НА МАРШРУТ\n\n" #
        "❓ Как да избера подходяща екопътека?\n" #
        "- Оценете физическата си подготовка\n" #
        "- Проверете дължината и денивелацията\n" #
        "- Вижте маркировката за трудност\n" #
        "- Съобразете се със сезона и времето\n\n" #
        "🎒 ПОДГОТОВКА И ЕКИПИРОВКА\n\n" #
        "❓ Каква екипировка е необходима?\n" #
        "ЗАДЪЛЖИТЕЛНО:\n" #
        "- Удобни туристически обувки\n" #
        "- Достатъчно вода (минимум 1л на човек)\n" #
        "- Лека храна и закуски\n" #
        "- Първа помощ\n" #
        "- Мобилен телефон с GPS";

    // ============================================================================
    // STATE VARIABLES
    // ============================================================================

    // Counter variable to keep track of count (from original template)
    private var counter : Nat64 = 0;

    // Stable storage for trails using TrieMap<Nat, TrailRecord>
    // Note: Using stable var with TrieMap entries for persistence
    private var trailMapEntries : [(Nat, TrailRecord)] = [];
    private transient var trailMap = TrieMap.TrieMap<Nat, TrailRecord>(Nat.equal, func(n: Nat) : Hash.Hash { 
        Text.hash(Nat.toText(n)) 
    });
    
    // Auto-incrementing ID counter for trails
    private var nextTrailId : Nat = 1;

    // ============================================================================
    // SYSTEM FUNCTIONS (Upgrade hooks)
    // ============================================================================

    system func preupgrade() {
        trailMapEntries := Iter.toArray(trailMap.entries());
    };

    system func postupgrade() {
        trailMap := TrieMap.fromEntries<Nat, TrailRecord>(trailMapEntries.vals(), Nat.equal, func(n: Nat) : Hash.Hash { 
            Text.hash(Nat.toText(n)) 
        });
        trailMapEntries := [];
        
        // Initialize sample data if empty
        if (trailMap.size() == 0) {
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
    public func prompt(promptText : Text) : async Text {
        Debug.print("Received prompt: " # promptText);
        
        // Simple mock responses based on prompt content
        if (Text.contains(promptText, #text "hello")) {
            return "Hello! I'm a mock LLM running on the Internet Computer. How can I help you today?";
        } else if (Text.contains(promptText, #text "how are you")) {
            return "I'm doing great! I'm a mock LLM implementation for testing purposes. Thanks for asking!";
        } else if (Text.contains(promptText, #text "what")) {
            return "I'm a mock LLM implementation. In a real deployment, this would connect to the actual LLM canister on the Internet Computer network.";
        } else if (Text.contains(promptText, #text "test")) {
            return "Test successful! The LLM integration is working properly. This is a mock response for testing purposes.";
        } else {
            return "I received your message: \"" # promptText # "\". This is a mock LLM response. In production, this would be handled by the actual LLM canister.";
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
        let lowerText = toLower(text);
        let lowerSearch = toLower(search);
        Text.contains(lowerText, #text lowerSearch)
    };

    // Validate coordinates (currently unused but available for future use)
    private func _validateCoordinates(lat: Float, lng: Float) : Bool {
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
    private func buildContextFromTrails(foundTrails: [TrailRecord]) : Text {
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

    // Search trails by keyword - implements Python search_trails logic
    // Searches in: name, description, region, keywords, difficulty
    public query func searchTrails(searchQuery: Text) : async [TrailRecord] {
        // Валидация на входните данни
        if (Text.size(searchQuery) == 0) {
            return [];
        };

        // Нормализиране на заявката за търсене
        let normalizedQuery = toLower(Text.trim(searchQuery, #text " "));
        
        if (Text.size(normalizedQuery) == 0) {
            return [];
        };

        Debug.print("🔍 Търсене на маршрути за: '" # searchQuery # "'");
        
        let resultBuffer = Buffer.Buffer<TrailRecord>(0);

        // Търсене в всички маршрути
        for ((id, trail) in trailMap.entries()) {
            var foundMatch = false;
            
            // Проверка в името на маршрута
            if (not foundMatch and containsIgnoreCase(trail.name, normalizedQuery)) {
                foundMatch := true;
            };

            // Проверка в описанието
            if (not foundMatch and containsIgnoreCase(trail.description, normalizedQuery)) {
                foundMatch := true;
            };

            // Проверка в региона
            if (not foundMatch and containsIgnoreCase(trail.location.region, normalizedQuery)) {
                foundMatch := true;
            };

            // Проверка в ключовите думи за местоположение
            if (not foundMatch) {
                let keywordMatch = Array.find<Text>(trail.location.keywords, func(keyword) {
                    containsIgnoreCase(keyword, normalizedQuery)
                });
                if (Option.isSome(keywordMatch)) {
                    foundMatch := true;
                };
            };

            // Проверка в детайлите за маршрута (difficulty)
            if (not foundMatch and containsIgnoreCase(trail.trail_details.difficulty, normalizedQuery)) {
                foundMatch := true;
            };
            
            if (foundMatch) {
                resultBuffer.add(trail);
            };
        };

        let results = Buffer.toArray(resultBuffer);
        Debug.print("✅ Намерени " # Nat.toText(results.size()) # " маршрута за '" # searchQuery # "'");
        results
    };

    // Get trail by ID
    public query func getTrailById(trailId: Nat) : async ?TrailRecord {
        trailMap.get(trailId)
    };

    // List all trails
    public query func listAllTrails() : async [TrailRecord] {
        Iter.toArray(trailMap.vals())
    };

    // Advanced search with multiple criteria
    public query func advancedSearch(region: ?Text, difficulty: ?Text, season: ?Text) : async [TrailRecord] {
        let resultBuffer = Buffer.Buffer<TrailRecord>(0);

        for ((id, trail) in trailMap.entries()) {
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

        Buffer.toArray(resultBuffer)
    };

    // Query data - main chatbot endpoint
    public func queryData(userId: Text, message: Text) : async ChatResponse {
        Debug.print("📨 Received message from user " # userId # ": " # message);

        // Search for relevant trails
        let foundTrails = await searchTrails(message);
        Debug.print("🔍 Found " # Nat.toText(foundTrails.size()) # " trails");

        // Build context for response
        let trailsContext = buildContextFromTrails(foundTrails);

        // Build the full system prompt with trails context and FAQ
        let fullSystemPrompt = SYSTEM_PROMPT # "\n\n" # trailsContext # "\n\n" # FAQ_CONTENT;

        // Create the chat messages
        let messages : [LLM.ChatMessage] = [
            #system_({ content = fullSystemPrompt }),
            #user({ content = message })
        ];

        Debug.print("🤖 Generating response using LLM...");
        
        // Call the LLM canister
        let llmResponse = await LLM.chat(#Llama3_1_8B)
            .withMessages(messages)
            .send();

        // Extract the response content
        let responseContent = switch (llmResponse.message.content) {
            case (?text) { text };
            case null { "Съжалявам, не мога да генерирам отговор в момента." };
        };

        Debug.print("✅ LLM response received: " # Nat.toText(Text.size(responseContent)) # " characters");

        // Parse the response to extract coordinates if present
        parseGptResponse(responseContent, foundTrails)
    };

    // Parse GPT response and extract coordinates
    private func parseGptResponse(content: Text, trails: [TrailRecord]) : ChatResponse {
        // Try to parse JSON response
        // Expected format: { "response": "...", "coords": { "lat": X, "lng": Y } }
        
        // Simple JSON parsing - look for response and coords fields
        let hasCoords = Text.contains(content, #text "\"coords\"");
        
        if (hasCoords) {
            // Try to extract coordinates using simple text parsing
            let coords = extractCoordinatesFromJson(content);
            switch (coords) {
                case (?c) {
                    // Extract response text
                    let responseText = extractResponseFromJson(content);
                    return {
                        response = responseText;
                        coords = ?c;
                    };
                };
                case null {
                    // Coordinates mentioned but couldn't parse
                    return {
                        response = content;
                        coords = null;
                    };
                };
            };
        } else {
            // No coordinates in response
            let responseText = extractResponseFromJson(content);
            
            // If we found trails and no coords in response, use first trail's coords
            if (trails.size() > 0) {
                return {
                    response = responseText;
                    coords = ?trails[0].location.coordinates;
                };
            };
            
            return {
                response = responseText;
                coords = null;
            };
        };
    };

    // Extract response field from JSON
    private func extractResponseFromJson(json: Text) : Text {
        // Look for "response": "..."
        let responseStart = textIndexOf(json, "\"response\"");
        
        switch (responseStart) {
            case (?start) {
                // Find the opening quote after "response":
                let afterResponse = textSliceFrom(json, start + 11); // length of "response"
                let colonIdx = textIndexOf(afterResponse, ":");
                
                switch (colonIdx) {
                    case (?ci) {
                        let afterColon = textSliceFrom(afterResponse, ci + 1);
                        let quoteIdx = textIndexOf(afterColon, "\"");
                        
                        switch (quoteIdx) {
                            case (?qi) {
                                // Find the closing quote
                                let textContent = textSliceFrom(afterColon, qi + 1);
                                let textEnd = findClosingQuote(textContent);
                                
                                switch (textEnd) {
                                    case (?te) {
                                        return textSliceTo(textContent, te);
                                    };
                                    case null { return json; };
                                };
                            };
                            case null { return json; };
                        };
                    };
                    case null { return json; };
                };
            };
            case null {
                // No response field, return the whole content
                return json;
            };
        };
    };

    // Extract coordinates from JSON
    private func extractCoordinatesFromJson(json: Text) : ?Coordinates {
        // Look for "lat" and "lng" fields
        let latStart = textIndexOf(json, "\"lat\"");
        let lngStart = textIndexOf(json, "\"lng\"");
        
        switch (latStart, lngStart) {
            case (?ls, ?lngs) {
                let lat = extractFloatValue(json, ls + 5);
                let lng = extractFloatValue(json, lngs + 5);
                
                switch (lat, lng) {
                    case (?latVal, ?lngVal) {
                        return ?{
                            lat = latVal;
                            lng = lngVal;
                        };
                    };
                    case _ { return null; };
                };
            };
            case _ { return null; };
        };
    };

    // Extract float value from JSON text
    private func extractFloatValue(json: Text, startPos: Nat) : ?Float {
        // Skip whitespace and colon
        let afterStart = textSliceFrom(json, startPos);
        
        // Skip whitespace and colon
        var skipCount = 0;
        label skipLoop for (c in afterStart.chars()) {
            if (c == ' ' or c == ':' or c == '\t') {
                skipCount += 1;
            } else {
                break skipLoop;
            };
        };
        
        let afterColon = textSliceFrom(afterStart, skipCount);
        
        // Extract number characters
        var numText = "";
        var foundDigit = false;
        
        label numLoop for (c in afterColon.chars()) {
            if (Char.isDigit(c) or c == '.' or c == '-') {
                numText := numText # Char.toText(c);
                foundDigit := true;
            } else {
                if (foundDigit) {
                    break numLoop;
                };
            };
        };
        
        // Parse the number
        if (numText.size() > 0) {
            switch (textToFloat(numText)) {
                case (?f) { ?f };
                case null { null };
            };
        } else {
            null
        };
    };

    // Helper: Simple float parser
    private func textToFloat(text: Text) : ?Float {
        var result : Float = 0.0;
        var decimalPart : Float = 0.0;
        var afterDecimal = false;
        var decimalPlaces : Float = 1.0;
        var isNegative = false;
        
        for (c in text.chars()) {
            if (c == '-') {
                isNegative := true;
            } else if (c == '.') {
                afterDecimal := true;
            } else if (Char.isDigit(c)) {
                let digitNat32 = Char.toNat32(c) - Char.toNat32('0');
                let digit = Nat32.toNat(digitNat32);
                if (afterDecimal) {
                    decimalPlaces := decimalPlaces * 10.0;
                    decimalPart := decimalPart + Float.fromInt(digit) / decimalPlaces;
                } else {
                    result := result * 10.0 + Float.fromInt(digit);
                };
            };
        };
        
        var finalResult = result + decimalPart;
        if (isNegative) {
            finalResult := -finalResult;
        };
        
        ?finalResult
    };

    // Helper: Get substring from index
    private func textSliceFrom(text: Text, start: Nat) : Text {
        let chars = Text.toArray(text);
        if (start >= chars.size()) {
            return "";
        };
        
        var result = "";
        var i = 0;
        for (c in chars.vals()) {
            if (i >= start) {
                result := result # Char.toText(c);
            };
            i += 1;
        };
        result
    };

    // Helper: Get substring to index
    private func textSliceTo(text: Text, end: Nat) : Text {
        let chars = Text.toArray(text);
        var result = "";
        var i = 0;
        
        for (c in chars.vals()) {
            if (i >= end) {
                return result;
            };
            result := result # Char.toText(c);
            i += 1;
        };
        result
    };

    // Helper: Find substring index
    private func textIndexOf(text: Text, pattern: Text) : ?Nat {
        let textChars = Text.toArray(text);
        let patternChars = Text.toArray(pattern);
        
        if (patternChars.size() == 0) {
            return ?0;
        };
        
        let textLen = textChars.size();
        let patternLen = patternChars.size();
        
        if (textLen < patternLen) {
            return null;
        };
        
        var i = 0;
        
        while (i + patternLen <= textLen) {
            var match = true;
            var j = 0;
            
            while (j < patternLen and match) {
                if (textChars[i + j] != patternChars[j]) {
                    match := false;
                };
                j += 1;
            };
            
            if (match) {
                return ?i;
            };
            
            i += 1;
        };
        
        null
    };

    // Helper: Find closing quote accounting for escapes
    private func findClosingQuote(text: Text) : ?Nat {
        var i = 0;
        var escaped = false;
        let quoteChar : Char = '\"';
        let backslashChar : Char = '\\';
        
        for (c in text.chars()) {
            if (escaped) {
                escaped := false;
            } else if (c == backslashChar) {
                escaped := true;
            } else if (c == quoteChar) {
                return ?i;
            };
            i += 1;
        };
        
        null
    };

    // Add a new trail
    public func addTrail(trail: TrailRecord) : async Bool {
        trailMap.put(trail.id, trail);
        Debug.print("✅ Added trail: " # trail.name);
        
        // Update nextTrailId if necessary
        if (trail.id >= nextTrailId) {
            nextTrailId := trail.id + 1;
        };
        
        true
    };

    // Initialize sample trails
    private func initializeSampleTrails() {
        let trail1: TrailRecord = {
            id = 1;
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

        let trail2: TrailRecord = {
            id = 2;
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

        let trail3: TrailRecord = {
            id = 3;
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

        trailMap.put(trail1.id, trail1);
        trailMap.put(trail2.id, trail2);
        trailMap.put(trail3.id, trail3);
        
        nextTrailId := 4; // Set next ID after the 3 sample trails

        Debug.print("✅ Initialized " # Nat.toText(trailMap.size()) # " sample trails");
    };

    // Initialize on first deployment
    if (trailMap.size() == 0) {
        initializeSampleTrails();
    };
};

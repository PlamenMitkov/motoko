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
    // ECO-TRAILS SEARCH AND QUERY FUNCTIONS
    // ============================================================================

    // Internal search function (reusable logic)
    private func searchTrailsInternal(searchQuery: Text) : [TrailRecord] {
        if (Text.size(searchQuery) == 0) {
            return [];
        };

        let normalizedQuery = toLower(Text.trim(searchQuery, #text " "));
        
        if (Text.size(normalizedQuery) == 0) {
            return [];
        };

        let resultBuffer = Buffer.Buffer<TrailRecord>(0);

        for ((id, trail) in trailMap.entries()) {
            var foundMatch = false;
            
            if (not foundMatch and containsIgnoreCase(trail.name, normalizedQuery)) {
                foundMatch := true;
            };

            if (not foundMatch and containsIgnoreCase(trail.description, normalizedQuery)) {
                foundMatch := true;
            };

            if (not foundMatch and containsIgnoreCase(trail.location.region, normalizedQuery)) {
                foundMatch := true;
            };

            if (not foundMatch) {
                let keywordMatch = Array.find<Text>(trail.location.keywords, func(keyword) {
                    containsIgnoreCase(keyword, normalizedQuery)
                });
                if (Option.isSome(keywordMatch)) {
                    foundMatch := true;
                };
            };

            if (not foundMatch and containsIgnoreCase(trail.trail_details.difficulty, normalizedQuery)) {
                foundMatch := true;
            };

            if (foundMatch) {
                resultBuffer.add(trail);
            };
        };

        Buffer.toArray(resultBuffer)
    };

    // Search trails by keyword - implements Python search_trails logic
    // Searches in: name, description, region, keywords, difficulty
    public query func searchTrails(searchQuery: Text) : async [TrailRecord] {
        Debug.print("🔍 Търсене на маршрути за: '" # searchQuery # "'");
        let results = searchTrailsInternal(searchQuery);
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

        // Search for relevant trails (using internal function to avoid inter-canister call)
        let foundTrails = searchTrailsInternal(message);
        Debug.print("🔍 Found " # Nat.toText(foundTrails.size()) # " trails");

        // Build response based on found trails (simple rule-based for now)
        let responseContent = if (foundTrails.size() > 0) {
            buildTrailResponse(foundTrails, message)
        } else {
            buildGeneralResponse(message)
        };

        Debug.print("✅ Response generated: " # Nat.toText(Text.size(responseContent)) # " characters");

        // Parse the response to extract coordinates if present
        parseGptResponse(responseContent, foundTrails)
    };

    // Build response when trails are found
    private func buildTrailResponse(trails: [TrailRecord], _userMessage: Text) : Text {
        if (trails.size() == 1) {
            let trail = trails[0];
            "Намерих чудесна екопътека за вас! " # trail.name # 
            " се намира в регион " # trail.location.region # 
            ". Маршрутът е с " # trail.trail_details.difficulty # " трудност и е дълъг " # 
            trail.trail_details.length # ". " # trail.description
        } else {
            var response = "Намерих " # Nat.toText(trails.size()) # " екопътеки за вас:\n\n";
            var count = 0;
            for (trail in trails.vals()) {
                count += 1;
                if (count <= 3) { // Limit to first 3
                    response #= Nat.toText(count) # ". " # trail.name # " (" # trail.location.region # 
                    ") - " # trail.trail_details.difficulty # " трудност, " # 
                    trail.trail_details.length # "\n";
                };
            };
            response
        }
    };

    // Build general response when no trails found
    private func buildGeneralResponse(userMessage: Text) : Text {
        if (containsIgnoreCase(userMessage, "здравей") or containsIgnoreCase(userMessage, "hello") or containsIgnoreCase(userMessage, "hi")) {
            "Здравейте! 👋 Аз съм вашият асистент за екопътеки в България. Как мога да ви помогна днес? Можете да търсите маршрути по регион, име или трудност."
        } else if (containsIgnoreCase(userMessage, "помощ") or containsIgnoreCase(userMessage, "help")) {
            "Радо ще ви помогна! 🌿\n\nМоже да:\n- Търсите екопютеки по регион (напр. 'Витоша', 'Рила')\n- Питате за конкретна пътека\n- Търсите по трудност ('лека', 'умерена', 'трудна')\n\nКакво ви интересува?"
        } else {
            "За съжаление не намерих екопютеки, съответстващи на '" # userMessage # 
            "'. Моля опитайте с:\n- Име на регион (София, Рила, Родопи)\n- Име на планина\n- Ниво на трудност\n\nИмаме " # 
            Nat.toText(trailMap.size()) # " екопютеки в базата данни."
        }
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

    // Initialize sample trails (keeping original 3 for demo purposes)
    // In production, you would load all 226 trails from eco.json via an import mechanism
    private func initializeSampleTrails() {
        // Add first 10 trails from eco.json for demonstration
        let trail1: TrailRecord = {
            id = 1;
            name = "Екопютека \"Манастира\"";
            description = "Маршрутът започва от Перущица и преминава през Историческия музей, Дановото училище, Калугерския Харман (Табиите), паметника на Кочо Честименски и манастира \"Св. Тодор\". Пютеката продължава към каменна чешма в защитена местност \"Перестица\" и по римски път стига до параклиса \"Св. Петка\", откъдето се връща в града.";
            location = {
                region = "Пловдив";
                keywords = ["манастир", "Перущица", "паметници", "природа", "Св. Петка"];
                coordinates = {
                    lat = 42.057517;
                    lng = 24.5479535;
                };
            };
            trail_details = {
                difficulty = "трудна";
                duration = "5-6 часа";
                length = "16 км";
                elevation = "неизвестна";
            };
            best_season = ["Пролет", "Лято", "Есен"];
        };

        let trail2: TrailRecord = {
            id = 2;
            name = "Алея на Боснешкия карст";
            description = "Алеята започва от покрайнините на село Боснек, изкачва се на север срещу течението на река Добри дол – десен приток на река Струма, продължава на запад, а после на юг и завършва отново в село Боснек.";
            location = {
                region = "Перник";
                keywords = ["Боснек", "карст", "Витоша", "Добри дол", "природни местообитания"];
                coordinates = {
                    lat = 42.4995;
                    lng = 23.1783;
                };
            };
            trail_details = {
                difficulty = "умерена";
                duration = "3-4 часа";
                length = "10 км";
                elevation = "неизвестна";
            };
            best_season = ["Пролет", "Лято", "Есен"];
        };

        let trail3: TrailRecord = {
            id = 3;
            name = "Алея на туриста до м. Струилица – Девин";
            description = "Алеята представлява участък от асфалтов път западно от гр. Девин (от параклис Св. Георги до м. Струилица), по който са обособени места за отдих с маси, пейки, чешми и паркинги за автомобили.";
            location = {
                region = "Девин";
                keywords = ["tourism", "nature", "relaxation"];
                coordinates = {
                    lat = 41.6744;
                    lng = 24.0800;
                };
            };
            trail_details = {
                difficulty = "лека";
                duration = "около 1 часа";
                length = "1.6 км";
                elevation = "неизвестна";
            };
            best_season = ["Пролет", "Лято"];
        };

        // Add more trails from eco.json
        let trail4: TrailRecord = {
            id = 4;
            name = "Ботаническа алея за незрящи";
            description = "Разположена е в местността Дендрариума. Дължината ѝ е 610 метра, а представените растителни видове са 26 на брой, като за всеки един от тях е дадено описание и на брайлово писмо.";
            location = {
                region = "Дендрариум";
                keywords = ["accessible", "botanical", "sightless", "tourism"];
                coordinates = {
                    lat = 42.6583;
                    lng = 23.3323;
                };
            };
            trail_details = {
                difficulty = "лека";
                duration = "около 1 часа";
                length = "0.61 км";
                elevation = "неизвестна";
            };
            best_season = ["Пролет", "Лято", "Есен"];
        };

        let trail5: TrailRecord = {
            id = 5;
            name = "Вазова екопютека";
            description = "Туристическата дестинация \"Вазова екопютека\" е единствената, по която може да се отиде до природната забележителност водопад \"Скакля\".";
            location = {
                region = "Искърско дефиле";
                keywords = ["исторически", "природа", "водопад"];
                coordinates = {
                    lat = 42.8321;
                    lng = 23.4019;
                };
            };
            trail_details = {
                difficulty = "умерена";
                duration = "1 час 30 минути";
                length = "не е посочена км";
                elevation = "неизвестна";
            };
            best_season = ["Пролет", "Лято", "Есен"];
        };

        trailMap.put(trail1.id, trail1);
        trailMap.put(trail2.id, trail2);
        trailMap.put(trail3.id, trail3);
        trailMap.put(trail4.id, trail4);
        trailMap.put(trail5.id, trail5);
        
        nextTrailId := 6; // Set next ID after sample trails

        Debug.print("✅ Initialized " # Nat.toText(trailMap.size()) # " sample trails from eco.json");
    };

    // Administrative function to reset and reload all trail data
    public func resetAndLoadTrails() : async Text {
        // Clear all existing trails
        for ((id, _) in trailMap.entries()) {
            trailMap.delete(id);
        };
        
        // Reload sample trails
        initializeSampleTrails();
        
        return "✅ Reset complete. Loaded " # Nat.toText(trailMap.size()) # " trails.";
    };

    // Initialize on first deployment
    if (trailMap.size() == 0) {
        initializeSampleTrails();
    };
};

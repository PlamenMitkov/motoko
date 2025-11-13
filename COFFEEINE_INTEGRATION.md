# Coffeeine AI Integration Guide

## 📖 What is Coffeeine?

**Coffeeine** is an AI inference platform that can provide access to various Large Language Models (LLMs) including:

- **GPT-3.5-turbo** (OpenAI)
- **GPT-4** (OpenAI)
- **Claude** (Anthropic)
- **Llama models** (Meta)
- **Mistral models**
- **Custom fine-tuned models**

### Key Features:

1. **Multiple Model Access**: Single API for various LLM providers
2. **Cost Optimization**: Often cheaper than direct provider APIs
3. **Unified Interface**: Same API structure across different models
4. **Load Balancing**: Automatic failover between providers
5. **Rate Limiting**: Built-in rate limit management
6. **Caching**: Response caching to reduce costs

## 🔑 Why Use Coffeeine Instead of Direct OpenAI?

| Feature              | Direct OpenAI    | Coffeeine            |
| -------------------- | ---------------- | -------------------- |
| **Models Available** | OpenAI only      | Multiple providers   |
| **Cost**             | Standard pricing | Often 20-40% cheaper |
| **Rate Limits**      | Per account      | Pooled/managed       |
| **Fallback**         | Manual           | Automatic            |
| **API Keys**         | OpenAI account   | Single Coffeeine key |
| **Setup**            | OpenAI account   | Coffeeine account    |

## 🚀 Integration Options

### Option 1: Coffeeine HTTP API (Recommended)

Coffeeine typically provides an OpenAI-compatible API, so you can use the same integration with minor changes:

#### Step 1: Get Coffeeine API Key

```bash
# Sign up at coffeeine.ai (or your provider's site)
# Get your API key from dashboard
COFFEEINE_API_KEY="cof_..."
```

#### Step 2: Create Coffeeine Integration Module

```motoko
// coffeeine_integration.mo
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Cycles "mo:base/ExperimentalCycles";

module {
    private var apiKey : Text = "";

    // Coffeeine API endpoint (OpenAI-compatible)
    private let COFFEEINE_URL = "https://api.coffeeine.ai/v1/chat/completions";

    public func setApiKey(key : Text) : () {
        apiKey := key;
    };

    public func chat(
        userMessage : Text,
        systemPrompt : Text,
        model : Text  // "gpt-3.5-turbo", "gpt-4", "claude-2", etc.
    ) : async Text {

        let requestBody = buildRequest(userMessage, systemPrompt, model);

        let request = {
            url = COFFEEINE_URL;
            max_response_bytes = ?2048;
            headers = [
                { name = "Content-Type"; value = "application/json" },
                { name = "Authorization"; value = "Bearer " # apiKey },
                { name = "X-Provider"; value = "coffeeine" }  // Optional
            ];
            body = ?Text.encodeUtf8(requestBody);
            method = #post;
            transform = null;
        };

        Cycles.add(13_000_000_000);
        let response = await ic.http_request(request);

        parseResponse(response)
    };

    private func buildRequest(
        message : Text,
        prompt : Text,
        model : Text
    ) : Text {
        "{" #
        "\"model\": \"" # model # "\"," #
        "\"messages\": [" #
            "{\"role\": \"system\", \"content\": \"" # escapeJson(prompt) # "\"}," #
            "{\"role\": \"user\", \"content\": \"" # escapeJson(message) # "\"}" #
        "]," #
        "\"temperature\": 0.0," #
        "\"max_tokens\": 384," #
        "\"stream\": false" #
        "}"
    };
};
```

#### Step 3: Use in Your Backend

```motoko
import Coffeeine "./coffeeine_integration";

persistent actor {
    // Set API key
    public shared(msg) func setCoffeeineKey(key: Text) : async () {
        assert(isOwner(msg.caller));
        Coffeeine.setApiKey(key);
    };

    // Use Coffeeine for chat
    public func queryData(userId: Text, message: Text) : async ChatResponse {
        let foundTrails = await searchTrails(message);
        let context = buildContextFromTrails(foundTrails);
        let fullPrompt = SYSTEM_PROMPT # "\n\n" # context;

        // Call Coffeeine with your preferred model
        let aiResponse = await Coffeeine.chat(
            message,
            fullPrompt,
            "gpt-3.5-turbo"  // or "gpt-4", "claude-2", etc.
        );

        parseGptResponse(aiResponse, foundTrails)
    };
}
```

### Option 2: Coffeeine SDK (If Available)

Some AI platforms provide SDKs. If Coffeeine has a Motoko SDK:

```bash
# Add to mops.toml
[dependencies]
coffeeine = "1.0.0"
```

```motoko
import Coffeeine "mo:coffeeine";

let client = Coffeeine.Client({
    apiKey = "cof_...",
    model = "gpt-3.5-turbo"
});

let response = await client.complete({
    prompt = userMessage,
    systemPrompt = SYSTEM_PROMPT,
    temperature = 0.0,
    maxTokens = 384
});
```

## 🔧 Configuration Options

### Available Models via Coffeeine

```motoko
// Model options
public type CoffeeineModel = {
    #GPT35Turbo;      // Fast, cheap
    #GPT4;            // High quality
    #GPT4Turbo;       // Fast GPT-4
    #Claude2;         // Anthropic Claude
    #Claude3;         // Latest Claude
    #Llama2_70B;      // Meta Llama
    #Mistral7B;       // Mistral AI
    #Custom : Text;   // Your fine-tuned model
};

public func modelToText(model : CoffeeineModel) : Text {
    switch (model) {
        case (#GPT35Turbo) { "gpt-3.5-turbo" };
        case (#GPT4) { "gpt-4" };
        case (#GPT4Turbo) { "gpt-4-turbo-preview" };
        case (#Claude2) { "claude-2" };
        case (#Claude3) { "claude-3-opus" };
        case (#Llama2_70B) { "llama-2-70b" };
        case (#Mistral7B) { "mistral-7b-instruct" };
        case (#Custom(name)) { name };
    };
};
```

### Advanced Configuration

```motoko
public type CoffeeineConfig = {
    model : Text;
    temperature : Float;     // 0.0 - 2.0 (creativity)
    maxTokens : Nat;        // Response length
    topP : ?Float;          // Nucleus sampling
    frequencyPenalty : ?Float;  // Reduce repetition
    presencePenalty : ?Float;   // Encourage new topics
    stop : ?[Text];        // Stop sequences
    caching : Bool;        // Enable response caching
    fallbackModel : ?Text; // Fallback if primary fails
};

public func chatAdvanced(
    message : Text,
    prompt : Text,
    config : CoffeeineConfig
) : async Text {
    let requestBody = buildAdvancedRequest(message, prompt, config);
    // ... make HTTP call
};
```

## 💰 Cost Comparison

### Per 1,000 Requests (Example Pricing)

| Model             | Direct Price     | Coffeeine Price | Savings |
| ----------------- | ---------------- | --------------- | ------- |
| **GPT-3.5-turbo** | $0.50            | $0.35           | 30%     |
| **GPT-4**         | $15.00           | $11.00          | 27%     |
| **Claude-2**      | $8.00            | $6.00           | 25%     |
| **Llama-2-70B**   | Free (self-host) | $2.00           | N/A     |

**Plus IC Cycles**: ~13M cycles per request (~13B cycles for 1,000 requests)

### Cost Calculator

```motoko
public func estimateMonthlyCost(
    requestsPerDay : Nat,
    model : CoffeeineModel
) : (cycles: Nat, usd: Float) {
    let requestsPerMonth = requestsPerDay * 30;
    let cycles = requestsPerMonth * 13_000_000_000;

    let usdPerRequest = switch (model) {
        case (#GPT35Turbo) { 0.00035 };
        case (#GPT4) { 0.011 };
        case (#Claude2) { 0.006 };
        case (#Llama2_70B) { 0.002 };
        case (_) { 0.001 };
    };

    let usd = Float.fromInt(requestsPerMonth) * usdPerRequest;

    (cycles, usd)
};
```

## 🔐 Security Best Practices

### 1. API Key Management

```motoko
private stable var encryptedApiKey : Blob = "";

public shared(msg) func setCoffeeineKey(key: Text) : async () {
    assert(msg.caller == owner);
    // In production, encrypt the key
    encryptedApiKey := encryptKey(key);
};

private func getCoffeeineKey() : Text {
    // Decrypt when needed
    decryptKey(encryptedApiKey)
};
```

### 2. Rate Limiting

```motoko
private var requestCount : Nat = 0;
private var lastReset : Int = Time.now();

public func checkRateLimit() : async Bool {
    let now = Time.now();
    let oneHour = 3_600_000_000_000; // nanoseconds

    if (now - lastReset > oneHour) {
        requestCount := 0;
        lastReset := now;
    };

    if (requestCount >= 100) { // 100 requests per hour
        return false;
    };

    requestCount += 1;
    true
};
```

### 3. Request Validation

```motoko
public func validateRequest(message : Text) : Bool {
    // Check length
    if (Text.size(message) > 2000) {
        return false;
    };

    // Check for malicious content
    if (Text.contains(message, #text "IGNORE PREVIOUS")) {
        return false;
    };

    true
};
```

## 🎯 Use Cases for Different Models

### GPT-3.5-turbo (Best for Eco-Trails)

```motoko
// Fast, cheap, good for straightforward queries
let response = await Coffeeine.chat(
    "Търся лека екопътека в София",
    SYSTEM_PROMPT,
    "gpt-3.5-turbo"
);
```

**Pros**: Fast, cheap, good Bulgarian support  
**Cons**: Less creative, shorter context

### GPT-4 (Premium)

```motoko
// High quality, complex reasoning
let response = await Coffeeine.chat(
    "Препоръчай ми 3-дневна програма за планинско катерене",
    SYSTEM_PROMPT,
    "gpt-4"
);
```

**Pros**: Best quality, long context, excellent reasoning  
**Cons**: Expensive, slower

### Claude-2/3 (Alternative)

```motoko
// Good alternative to GPT-4
let response = await Coffeeine.chat(
    userMessage,
    SYSTEM_PROMPT,
    "claude-3-opus"
);
```

**Pros**: Good quality, different perspective, safer  
**Cons**: Moderate cost, may be slower

### Llama-2-70B (Open Source)

```motoko
// Open source, cost-effective
let response = await Coffeeine.chat(
    userMessage,
    SYSTEM_PROMPT,
    "llama-2-70b"
);
```

**Pros**: Cheap, no vendor lock-in  
**Cons**: Lower quality than GPT-4

## 🔄 Model Switching Strategy

### Smart Model Selection

```motoko
public func selectOptimalModel(
    message : Text,
    complexity : Nat  // 1-10 scale
) : Text {
    if (complexity <= 3) {
        "gpt-3.5-turbo"  // Simple queries
    } else if (complexity <= 7) {
        "claude-2"       // Medium complexity
    } else {
        "gpt-4"          // Complex reasoning
    }
};

public func queryDataSmart(userId: Text, message: Text) : async ChatResponse {
    let complexity = analyzeComplexity(message);
    let model = selectOptimalModel(message, complexity);

    let response = await Coffeeine.chat(message, SYSTEM_PROMPT, model);
    parseGptResponse(response, foundTrails)
};
```

### Fallback Chain

```motoko
public func queryDataWithFallback(
    userId: Text,
    message: Text
) : async ChatResponse {
    // Try primary model
    try {
        return await Coffeeine.chat(message, SYSTEM_PROMPT, "gpt-3.5-turbo");
    } catch (e1) {
        Debug.print("GPT-3.5 failed, trying Claude...");

        // Fallback to Claude
        try {
            return await Coffeeine.chat(message, SYSTEM_PROMPT, "claude-2");
        } catch (e2) {
            Debug.print("Claude failed, using ICP LLM...");

            // Final fallback to free ICP LLM
            let llmResp = await LLM.chat(#Llama3_1_8B)
                .withMessages([...])
                .send();
            return parseLLMResponse(llmResp);
        };
    };
};
```

## 📊 Performance Monitoring

```motoko
private var modelStats : TrieMap.TrieMap<Text, Stats> = TrieMap.TrieMap(Text.equal, Text.hash);

public type Stats = {
    requests : Nat;
    successes : Nat;
    failures : Nat;
    avgResponseTime : Nat;  // milliseconds
    totalCost : Float;      // USD
};

public func trackModelUsage(
    model : Text,
    success : Bool,
    responseTime : Nat,
    cost : Float
) : () {
    // Update statistics
    // ... implementation
};

public query func getModelStats(model : Text) : ?Stats {
    modelStats.get(model)
};
```

## 🚀 Quick Start Example

```motoko
// 1. Import Coffeeine module
import Coffeeine "./coffeeine_integration";

// 2. Set API key (one time)
public shared(msg) func setupCoffeeine() : async () {
    await Coffeeine.setApiKey("cof_your_api_key_here");
};

// 3. Use in your chatbot
public func queryData(userId: Text, message: Text) : async ChatResponse {
    let trails = await searchTrails(message);
    let context = buildContextFromTrails(trails);

    // Call Coffeeine
    let aiResponse = await Coffeeine.chat(
        message,
        SYSTEM_PROMPT # "\n\n" # context,
        "gpt-3.5-turbo"  // or any other model
    );

    parseGptResponse(aiResponse, trails)
};
```

## 🆚 Final Comparison

| Feature            | ICP LLM      | OpenAI Direct        | Coffeeine            |
| ------------------ | ------------ | -------------------- | -------------------- |
| **Setup**          | ✅ Ready now | 🔧 Add HTTP outcalls | 🔧 Add HTTP outcalls |
| **Cost**           | 🆓 Free      | 💵 $0.50/1k          | 💵 $0.35/1k          |
| **Models**         | Llama 3.1 8B | GPT-3.5/4 only       | Multiple options     |
| **Quality**        | Good         | Excellent            | Excellent            |
| **Speed**          | Fast         | Fast                 | Fast                 |
| **Decentralized**  | ✅ Yes       | ⚠️ Hybrid            | ⚠️ Hybrid            |
| **Vendor Lock-in** | None         | OpenAI only          | Flexible             |
| **Fallback**       | N/A          | Manual               | Built-in             |

## 📝 Recommendation

**For Development**: Use ICP LLM (free, simple)  
**For Production**: Use Coffeeine (flexible, cost-effective)  
**For Premium**: Use OpenAI Direct (best quality)

## 🔗 Resources

- Coffeeine API Documentation: `https://docs.coffeeine.ai`
- OpenAI API Docs: `https://platform.openai.com/docs`
- ICP HTTP Outcalls: `https://internetcomputer.org/docs`
- Motoko Base Library: `https://internetcomputer.org/docs/motoko`

---

**Next Steps**:

1. Sign up for Coffeeine account
2. Get API key
3. Import `coffeeine_integration.mo` module
4. Configure your preferred model
5. Deploy and test!

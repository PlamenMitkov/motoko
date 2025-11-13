# Using GPT-3.5-turbo (OpenAI) with Motoko Backend

## Overview

To use OpenAI's GPT-3.5-turbo (or similar models from Coffeeine/OpenAI) in your Motoko backend, you have several options:

## Option 1: Direct OpenAI HTTP Outcalls (Recommended for Production)

### Requirements:

- IC HTTP outcalls feature
- OpenAI API key
- Cycles for HTTP requests (~13M cycles per request)

### Implementation Steps:

#### 1. Add Management Canister Interface

```motoko
import IC "mo:base/ExperimentalInternetComputer";

// Management canister for HTTP outcalls
let ic : IC.Self = actor "aaaaa-aa";
```

#### 2. Create HTTP Request Function

```motoko
public func callOpenAI(prompt: Text, context: Text) : async Text {
    let apiKey = "YOUR_API_KEY_HERE"; // In production, use environment variables

    // Construct JSON request body
    let requestBody =
        "{" #
        "\"model\": \"gpt-3.5-turbo\"," #
        "\"messages\": [" #
            "{\"role\": \"system\", \"content\": \"" # escapeJson(context) # "\"}," #
            "{\"role\": \"user\", \"content\": \"" # escapeJson(prompt) # "\"}" #
        "]," #
        "\"temperature\": 0.0," #
        "\"max_tokens\": 384" #
        "}";

    let request : IC.http_request_args = {
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

    // Add cycles for the HTTP request
    Cycles.add(13_000_000_000);

    let response = await ic.http_request(request);

    // Parse response
    let responseText = switch (Text.decodeUtf8(response.body)) {
        case null { "" };
        case (?text) { text };
    };

    // Extract content from JSON response
    extractContentFromResponse(responseText)
};
```

#### 3. Security Considerations

**⚠️ IMPORTANT**: Never hardcode API keys in canister code!

**Solutions:**:

a) **Use Canister Settings**:

```bash
# Set API key via dfx
dfx canister call backend setApiKey '("sk-...")'
```

b) **Environment Variables** (local development):

```motoko
// Read from environment during deployment
let apiKey = Option.get(getEnv("OPENAI_API_KEY"), "");
```

c) **Encrypted Storage**:

```motoko
private stable var encryptedApiKey : Text = "";

public shared(msg) func setApiKey(key: Text) : async () {
    // Only allow owner to set API key
    assert(msg.caller == owner);
    encryptedApiKey := encrypt(key);
};
```

## Option 2: Use ICP LLM Canister (Current Implementation)

**Pros**:

- ✅ No API keys needed
- ✅ Fully on-chain
- ✅ No cycles cost for API calls
- ✅ No external dependencies

**Cons**:

- ⚠️ Uses Llama 3.1 8B instead of GPT-3.5-turbo
- ⚠️ May have different response quality

**Current Code** (already implemented):

```motoko
import LLM "mo:llm";

let response = await LLM.chat(#Llama3_1_8B)
    .withMessages([
        #system_({ content = SYSTEM_PROMPT }),
        #user({ content = userMessage })
    ])
    .send();
```

## Option 3: Hybrid Approach

Use ICP LLM for local development and OpenAI for production:

```motoko
let USE_OPENAI = true; // Configure based on environment

public func queryData(userId: Text, message: Text) : async ChatResponse {
    let aiResponse = if (USE_OPENAI) {
        await callOpenAI(message, context)
    } else {
        await callICPLLM(message, context)
    };

    parseGptResponse(aiResponse, foundTrails)
};
```

## Option 4: Use Coffeeine API (if available)

If Coffeeine provides a compatible API:

```motoko
public func callCoffeeine(prompt: Text, context: Text) : async Text {
    let apiKey = getCoffeeineApiKey();

    let request : IC.http_request_args = {
        url = "https://api.coffeeine.ai/v1/chat/completions"; // Example URL
        max_response_bytes = ?2048;
        headers = [
            { name = "Content-Type"; value = "application/json" },
            { name = "Authorization"; value = "Bearer " # apiKey }
        ];
        body = ?Text.encodeUtf8(buildCoffeeineRequest(prompt, context));
        method = #post;
        transform = null;
    };

    Cycles.add(13_000_000_000);
    let response = await ic.http_request(request);
    parseResponse(response)
};
```

## Comparison Table

| Feature              | ICP LLM      | OpenAI GPT-3.5    | Coffeeine         |
| -------------------- | ------------ | ----------------- | ----------------- |
| **API Key**          | Not needed   | Required          | Required          |
| **Cycles Cost**      | Free         | ~13M per call     | ~13M per call     |
| **On-chain**         | Yes          | No (HTTP outcall) | No (HTTP outcall) |
| **Model**            | Llama 3.1 8B | GPT-3.5-turbo     | Varies            |
| **Response Quality** | Good         | Excellent         | Varies            |
| **Setup Complexity** | Simple       | Medium            | Medium            |
| **Decentralization** | Fully        | Hybrid            | Hybrid            |

## Recommended Implementation Path

### For Development:

```motoko
// Use ICP LLM - simple, no setup required
import LLM "mo:llm";
```

### For Production with OpenAI:

1. **Add HTTP outcalls support**:

```bash
# Update mops.toml
# No additional packages needed - use base library
```

2. **Implement API key management**:

```motoko
private stable var apiKey : Text = "";

public shared(msg) func setOpenAIKey(key: Text) : async () {
    assert(isOwner(msg.caller));
    apiKey := key;
};
```

3. **Add HTTP request function** (see Option 1)

4. **Deploy and configure**:

```bash
dfx deploy backend
dfx canister call backend setOpenAIKey '("sk-your-key-here")'
```

## Cost Estimation

### ICP LLM Canister:

- **Per Request**: ~0 cycles (handled by LLM canister)
- **Monthly (1000 requests)**: ~0 cycles

### OpenAI HTTP Outcalls:

- **Per Request**: ~13M cycles + OpenAI API cost ($0.0005-0.002)
- **Monthly (1000 requests)**: ~13B cycles + $0.50-$2.00 USD

## Next Steps

1. **Choose your approach** based on requirements
2. **Implement HTTP outcalls** if using OpenAI/Coffeeine
3. **Set up API key management** securely
4. **Test thoroughly** before production deployment
5. **Monitor costs** (cycles + API costs)

## Example: Complete OpenAI Integration

See `src/backend/openai_integration.mo` (to be created) for a complete working example with:

- Secure API key storage
- HTTP outcall implementation
- JSON encoding/decoding
- Error handling
- Response parsing

## Questions?

- For ICP LLM: Works out of the box (current implementation)
- For OpenAI: Requires HTTP outcalls implementation
- For Coffeeine: Similar to OpenAI, adjust endpoints accordingly

---

**Current Status**: Using ICP LLM Canister (Llama 3.1 8B)  
**To Switch**: Implement HTTP outcalls as described in Option 1

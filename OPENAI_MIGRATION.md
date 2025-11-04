# OpenAI API Migration to Motoko

## Overview

This document explains how the OpenAI API chatbot functionality has been migrated from Python to Motoko for the Internet Computer.

## Implementation Approach

### Current Implementation: LLM Canister

The current implementation uses the **ICP LLM Canister** (`w36hm-eqaaa-aaaal-qr76a-cai`) which provides on-chain AI inference capabilities.

**Key Features:**

- ✅ Fully on-chain AI processing
- ✅ No external API keys required
- ✅ Integrated with Internet Computer's architecture
- ✅ Uses Llama 3.1 8B model
- ✅ Simple async/await interface

**Limitations:**

- ⚠️ Different model than Python (Llama 3.1 vs GPT-4o)
- ⚠️ May have different response characteristics

### Python vs Motoko Comparison

| Feature              | Python (Original)    | Motoko (Current)                |
| -------------------- | -------------------- | ------------------------------- |
| **AI Provider**      | OpenAI GPT-4o        | ICP LLM Canister (Llama 3.1 8B) |
| **API Key**          | Required (from .env) | Not required                    |
| **Model**            | gpt-4o               | llama3.1:8b                     |
| **Temperature**      | 0.0                  | Default                         |
| **Max Tokens**       | 384                  | Default                         |
| **Response Format**  | JSON with coords     | JSON with coords                |
| **System Prompt**    | ✅ Migrated          | ✅ Migrated                     |
| **FAQ Content**      | ✅ Migrated          | ✅ Migrated (abbreviated)       |
| **Context Building** | ✅ Migrated          | ✅ Migrated                     |
| **JSON Parsing**     | Python json.loads()  | Custom Motoko implementation    |

## Code Structure

### 1. Constants

The SYSTEM_PROMPT and FAQ_CONTENT have been migrated as Motoko constants:

```motoko
private let SYSTEM_PROMPT : Text =
    "Ти си експертен туристически асистент, специализиран в екопътеки и природен туризъм в България.\n\n" #
    "ТВОЯТА РОЛЯ:\n" #
    // ... full prompt migrated
```

### 2. Query Function

The main `queryData` function implements the chatbot logic:

```motoko
public func queryData(userId: Text, message: Text) : async ChatResponse
```

**Flow:**

1. Receives user message
2. Searches for relevant trails in the database
3. Builds context from found trails
4. Constructs system prompt with context + FAQ
5. Calls LLM canister with messages
6. Parses response to extract text and coordinates
7. Returns ChatResponse with response text and optional coordinates

### 3. JSON Parsing

Since Motoko doesn't have a built-in JSON parser in the standard library, custom parsing functions were implemented:

- `parseGptResponse()` - Main parser for LLM responses
- `extractResponseFromJson()` - Extracts "response" field
- `extractCoordinatesFromJson()` - Extracts "coords" object
- `extractFloatValue()` - Parses float values
- `textToFloat()` - Converts text to Float
- `textIndexOf()` - Finds substring positions
- Helper text manipulation functions

## Future Migration to OpenAI HTTP Outcalls

If you need to use OpenAI's GPT models directly, you'll need to implement HTTP outcalls:

### Required Steps:

1. **Add HTTP Outcall Types**

   ```motoko
   import IC "mo:base/ExperimentalInternetComputer";
   ```

2. **Implement HTTP Request**

   ```motoko
   let request : IC.http_request_args = {
       url = "https://api.openai.com/v1/chat/completions";
       max_response_bytes = ?1024;
       headers = [
           { name = "Content-Type"; value = "application/json" },
           { name = "Authorization"; value = "Bearer YOUR_API_KEY" }
       ];
       body = ?Text.encodeUtf8(requestBody);
       method = #post;
       transform = null;
   };
   ```

3. **Handle Cycles for HTTP Outcalls**

   - HTTP outcalls on ICP require cycles
   - Must add cycles before making the request
   - Typical cost: ~1M cycles per request

4. **Security Considerations**
   - API keys cannot be stored in canister code (visible on-chain)
   - Consider using a separate backend canister with encrypted storage
   - Or use environment variables in development

### Trade-offs

| Approach                 | Pros                                                              | Cons                                                                        |
| ------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **ICP LLM Canister**     | ✅ Fully on-chain<br>✅ No API keys<br>✅ No cycles for API calls | ⚠️ Different model<br>⚠️ Limited customization                              |
| **OpenAI HTTP Outcalls** | ✅ Use GPT-4o<br>✅ More control                                  | ⚠️ Requires API key management<br>⚠️ Costs cycles<br>⚠️ External dependency |

## Testing

To test the current implementation:

```bash
# Deploy the canister
dfx deploy

# Test the queryData function
dfx canister call backend queryData '("user1", "Търся лека екопътека в София")'
```

Expected response:

```
(
  record {
    response = "...";
    coords = opt record { lat = 42.5833; lng = 23.2667 }
  }
)
```

## Response Format

Both implementations return the same structure:

```motoko
type ChatResponse = {
    response: Text;        // The AI-generated response text
    coords: ?Coordinates;  // Optional coordinates if a trail is mentioned
};
```

## Conversation History

⚠️ **Note:** The current implementation does NOT maintain conversation history per user.

The Python version uses Flask sessions to store conversation history. To implement this in Motoko, you would need to:

1. Create a stable TrieMap to store user conversations
2. Implement a conversation history management system
3. Include previous messages in the LLM context

Example structure:

```motoko
private var userConversations = TrieMap.TrieMap<Text, [ChatMessage]>(Text.equal, Text.hash);
```

## Conclusion

The current implementation provides a working chatbot using the ICP LLM Canister, which is the most IC-native approach. If OpenAI GPT models are required, the HTTP outcall approach can be implemented, but requires additional infrastructure for API key management and cycle costs.

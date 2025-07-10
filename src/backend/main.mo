import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";
import Debug "mo:base/Debug";

actor {
    // Counter variable to keep track of count
    private stable var counter : Nat64 = 0;

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

    // Mock chat function (for future use)
    public func chat(messages : [Text]) : async Text {
        if (messages.size() == 0) {
            return "No messages provided.";
        };
        
        let lastMessage = messages[messages.size() - 1];
        return "Chat response to: " # lastMessage;
    };
};

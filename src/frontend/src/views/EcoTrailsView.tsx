import { useState, useEffect } from "react";
import { Button, TextArea, Card } from "../components";
import {
  backendService,
  Trail,
  ChatResponse,
  Coordinates,
} from "../services/backendService";

interface EcoTrailsViewProps {
  onError: (error: string) => void;
  setLoading: (loading: boolean) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  coords?: Coordinates;
}

export const EcoTrailsView = ({ onError, setLoading }: EcoTrailsViewProps) => {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [userId] = useState(
    () => `user_${Math.random().toString(36).substr(2, 9)}`,
  );

  // Load all trails on mount
  useEffect(() => {
    loadAllTrails();
  }, []);

  const loadAllTrails = async () => {
    try {
      setLoading(true);
      const allTrails = await backendService.listAllTrails();
      setTrails(allTrails);
    } catch (error) {
      onError(`Failed to load trails: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      onError("Please enter a message");
      return;
    }

    try {
      setLoading(true);
      onError(""); // Clear previous errors

      // Add user message to history
      const userMessage: Message = {
        role: "user",
        content: message,
      };
      setChatHistory((prev) => [...prev, userMessage]);

      // Send to backend
      const response: ChatResponse = await backendService.queryData(
        userId,
        message,
      );

      // Add assistant response to history
      const assistantMessage: Message = {
        role: "assistant",
        content: response.response,
        coords: response.coords || undefined,
      };
      setChatHistory((prev) => [...prev, assistantMessage]);

      // Clear input
      setMessage("");
    } catch (error) {
      onError(`Error sending message: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTrailClick = (trail: Trail) => {
    setSelectedTrail(trail);
  };

  return (
    <Card
      title="🌿 Екопътеки България - Туристически Асистент"
      className="space-y-4"
    >
      <div className="border-b border-gray-600 pb-4">
        <p className="mt-2 text-sm text-gray-400">
          Туристически асистент за екопътеки в България
        </p>
      </div>

      {/* Available Trails List */}
      <div className="border-b border-gray-600 pb-4">
        <h4 className="mb-2 text-lg font-semibold text-gray-300">
          Налични Маршрути ({trails.length})
        </h4>
        <div className="max-h-40 space-y-2 overflow-y-auto">
          {trails.map((trail) => (
            <div
              key={trail.id}
              onClick={() => handleTrailClick(trail)}
              className="cursor-pointer rounded bg-gray-700 p-2 transition-colors hover:bg-gray-600"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-green-400">{trail.name}</p>
                  <p className="text-xs text-gray-400">
                    {trail.location.region} • {trail.trail_details.difficulty} •{" "}
                    {trail.trail_details.duration}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Trail Details */}
      {selectedTrail && (
        <div className="bg-gray-750 rounded border border-green-500 p-4">
          <div className="mb-2 flex items-start justify-between">
            <h4 className="text-lg font-bold text-green-400">
              {selectedTrail.name}
            </h4>
            <button
              onClick={() => setSelectedTrail(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="mb-2 text-sm text-gray-300">
            {selectedTrail.description}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Регион:</span>{" "}
              <span className="text-white">
                {selectedTrail.location.region}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Трудност:</span>{" "}
              <span className="text-white">
                {selectedTrail.trail_details.difficulty}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Дължина:</span>{" "}
              <span className="text-white">
                {selectedTrail.trail_details.length}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Време:</span>{" "}
              <span className="text-white">
                {selectedTrail.trail_details.duration}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Денивелация:</span>{" "}
              <span className="text-white">
                {selectedTrail.trail_details.elevation}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Координати:</span>{" "}
              <span className="text-xs text-white">
                {selectedTrail.location.coordinates.lat.toFixed(4)},{" "}
                {selectedTrail.location.coordinates.lng.toFixed(4)}
              </span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xs text-gray-400">Сезони:</span>{" "}
            <span className="text-xs text-white">
              {selectedTrail.best_season.join(", ")}
            </span>
          </div>
        </div>
      )}

      {/* Chat History */}
      <div className="border-b border-gray-600 pb-4">
        <h4 className="mb-2 text-lg font-semibold text-gray-300">Разговор</h4>
        <div className="max-h-60 space-y-3 overflow-y-auto rounded bg-gray-900 p-3">
          {chatHistory.length === 0 ? (
            <p className="text-center text-sm text-gray-500">
              Започнете разговор като зададете въпрос...
            </p>
          ) : (
            chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`rounded p-3 ${
                  msg.role === "user" ? "ml-8 bg-blue-900" : "mr-8 bg-green-900"
                }`}
              >
                <p className="mb-1 text-xs font-bold">
                  {msg.role === "user" ? "Вие" : "Асистент"}
                </p>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.coords && (
                  <p className="mt-2 text-xs text-gray-400">
                    📍 Координати: {msg.coords.lat.toFixed(4)},{" "}
                    {msg.coords.lng.toFixed(4)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message Input */}
      <div className="space-y-2">
        <TextArea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Например: Покажи ми лесни маршрути във Витоша..."
          rows={3}
        />
        <div className="flex gap-2">
          <Button onClick={handleSendMessage} className="flex-1">
            Изпрати
          </Button>
          <Button
            onClick={() => {
              setChatHistory([]);
              setMessage("");
            }}
            className="bg-gray-600 hover:bg-gray-500"
          >
            Изчисти
          </Button>
        </div>
      </div>

      <div className="text-center text-xs text-gray-500">
        <p>User ID: {userId}</p>
        <p>Въпроси: Опитайте "Витоша", "лесни маршрути", "Рила" и др.</p>
      </div>
    </Card>
  );
};

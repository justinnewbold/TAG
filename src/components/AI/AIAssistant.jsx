import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, ChevronDown, Loader2, Trash2 } from 'lucide-react';
import { aiService } from '../../services/ai';

const SUGGESTED_QUESTIONS = [
  "How do I play TAG?",
  "What are the different game modes?",
  "How do power-ups work?",
  "Tips for being a good runner?",
  "How do I tag someone?",
  "What is the skill rating system?",
];

export default function AIAssistant({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Hey there! 👋 I'm your TAG! assistant. Ask me anything about the game - rules, strategies, power-ups, or tips to become a tagging champion! 🏃‍♂️",
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text = input) => {
    if (!text.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      const response = await aiService.askAssistant(text.trim());
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: response,
      }]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: "Oops! I'm having trouble connecting right now. Try asking again in a moment! 🔄",
      }]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: "Chat cleared! 🧹 What would you like to know about TAG?",
    }]);
    setShowSuggestions(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Chat Window */}
      <div className="relative w-full sm:max-w-lg h-[85vh] sm:h-[600px] bg-gradient-to-b from-dark-800 to-dark-900 sm:rounded-2xl border-t sm:border border-white/10 flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-neon-purple/10 to-neon-cyan/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2 bg-gradient-to-br from-neon-purple to-neon-cyan rounded-xl">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-800" />
            </div>
            <div>
              <h3 className="font-bold text-lg">TAG! Assistant</h3>
              <p className="text-xs text-white/50 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-neon-cyan" />
                Powered by AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-5 h-5 text-white/50" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-br-md'
                    : 'bg-white/10 text-white rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 p-3 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-2 text-white/50">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {showSuggestions && messages.length <= 2 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-white/40 mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-white/10 bg-dark-900/50">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about TAG!..."
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-neon-purple to-neon-cyan rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

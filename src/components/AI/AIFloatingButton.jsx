import { useState } from 'react';
import { Bot, X, Sparkles } from 'lucide-react';
import AIAssistant from './AIAssistant';

export default function AIFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewFeature, setHasNewFeature] = useState(true);

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewFeature(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-24 right-4 z-40 group"
        >
          {/* Pulse animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full animate-ping opacity-20" />
          
          {/* Button */}
          <div className="relative p-4 bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full shadow-lg shadow-neon-purple/30 hover:shadow-neon-cyan/40 transition-all hover:scale-110">
            <Bot className="w-6 h-6 text-white" />
            
            {/* New badge */}
            {hasNewFeature && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-black rounded-full flex items-center gap-0.5">
                <Sparkles className="w-2 h-2" />
                AI
              </span>
            )}
          </div>

          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-dark-800 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10">
            Ask AI Assistant
          </div>
        </button>
      )}

      {/* Chat Modal */}
      <AIAssistant isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

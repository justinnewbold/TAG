import React, { useState, memo, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * GameCodeCard - Displays the game code with copy functionality
 */
const GameCodeCard = memo(function GameCodeCard({ code, onVibrate }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code || '');
      setCopied(true);
      onVibrate?.([50]);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code || '';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code, onVibrate]);

  return (
    <div className="px-4 py-3">
      <button
        onClick={handleCopy}
        className="w-full p-4 bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 border border-white/10 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-transform"
      >
        <div>
          <p className="text-xs text-white/50 mb-1">GAME CODE</p>
          <p className="text-3xl font-display font-bold tracking-[0.3em] text-neon-cyan">
            {code}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {copied ? (
            <div className="flex items-center gap-1 text-green-400 text-sm">
              <Check className="w-5 h-5" />
              <span>Copied!</span>
            </div>
          ) : (
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Copy className="w-5 h-5 text-white/70" />
            </div>
          )}
        </div>
      </button>
    </div>
  );
});

export default GameCodeCard;

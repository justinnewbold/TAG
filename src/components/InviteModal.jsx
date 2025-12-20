import React, { useState } from 'react';
import { X, Copy, Share2, Mail, MessageSquare, Check, Send } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useStore, GAME_MODES } from '../store';

function InviteModal({ gameCode, onClose }) {
  const { sendInvite, currentGame } = useStore();
  const [copied, setCopied] = useState(false);
  const [inviteMethod, setInviteMethod] = useState('link');
  const [contactValue, setContactValue] = useState('');
  const [sent, setSent] = useState(false);
  
  const gameUrl = `${window.location.origin}/join?code=${gameCode}`;
  const gameMode = currentGame?.gameMode || 'classic';
  const modeConfig = GAME_MODES[gameMode] || GAME_MODES.classic;
  const tagRadius = currentGame?.settings?.tagRadius || 20;
  const duration = currentGame?.settings?.duration ? Math.floor(currentGame.settings.duration / 60000) : 30;
  
  const shareText = `${modeConfig.icon} Join my ${modeConfig.name} game on TAG!\n\n🎯 ${tagRadius}m tag radius\n⏱️ ${duration} min game\n\n📍 Game Code: ${gameCode}\n\n👉 Join: ${gameUrl}`;
  const shortShareText = `${modeConfig.icon} TAG Game: ${gameCode}\n${tagRadius}m • ${duration}min • ${modeConfig.name}\n${gameUrl}`;
  
  const handleCopy = async () => {
    try {
      const textToCopy = inviteMethod === 'link' ? gameUrl : gameCode;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for non-HTTPS contexts
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Copy failed:', err);
    }
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my TAG game!',
          text: shareText,
          url: gameUrl,
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };
  
  const handleSendInvite = () => {
    if (!contactValue.trim()) return;
    
    const isEmail = contactValue.includes('@');
    const contact = {
      type: isEmail ? 'email' : 'sms',
      value: contactValue,
    };
    
    sendInvite(contact, gameCode);
    
    if (isEmail) {
      const subject = encodeURIComponent('Join my TAG game! 🏃‍♂️');
      const body = encodeURIComponent(shareText);
      window.open(`mailto:${contactValue}?subject=${subject}&body=${body}`);
    } else {
      const body = encodeURIComponent(shareText);
      window.open(`sms:${contactValue}?body=${body}`);
    }
    
    setSent(true);
    setContactValue('');
    setTimeout(() => setSent(false), 3000);
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="card-glow w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-display font-bold">Invite Friends</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 text-center bg-gradient-to-b from-neon-cyan/10 to-transparent">
          <p className="text-sm text-white/50 mb-2">Game Code</p>
          <div className="text-4xl font-display font-bold tracking-widest text-neon-cyan">
            {gameCode}
          </div>
        </div>
        
        <div className="p-4 flex justify-center">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG value={gameUrl} size={160} level="H" includeMargin={false} />
          </div>
        </div>
        <p className="text-center text-xs text-white/40 mb-4">Scan to join instantly</p>
        
        <div className="px-4 pb-4">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setInviteMethod('link')}
              className={`flex-1 p-2 rounded-lg text-sm font-medium transition-all ${
                inviteMethod === 'link' 
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50' 
                  : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              Link
            </button>
            <button
              onClick={() => setInviteMethod('code')}
              className={`flex-1 p-2 rounded-lg text-sm font-medium transition-all ${
                inviteMethod === 'code' 
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50' 
                  : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              Code Only
            </button>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1 p-3 bg-white/5 rounded-lg text-sm text-white/60 truncate">
              {inviteMethod === 'link' ? gameUrl : gameCode}
            </div>
            <button
              onClick={handleCopy}
              className={`p-3 rounded-lg transition-all ${
                copied ? 'bg-green-500/20 text-green-400' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        <div className="px-4 pb-4">
          <button onClick={handleShare} className="btn-primary w-full flex items-center justify-center gap-2 mb-3">
            <Share2 className="w-5 h-5" />
            Share Invite
          </button>
          
          {/* Quick Share Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shortShareText)}`, '_blank')}
              className="flex flex-col items-center gap-1 p-3 bg-green-500/20 hover:bg-green-500/30 rounded-xl transition-colors"
              aria-label="Share via WhatsApp"
            >
              <span className="text-xl">💬</span>
              <span className="text-xs text-green-400">WhatsApp</span>
            </button>
            <button
              onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent(shortShareText)}`, '_blank')}
              className="flex flex-col items-center gap-1 p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl transition-colors"
              aria-label="Share via Telegram"
            >
              <span className="text-xl">✈️</span>
              <span className="text-xs text-blue-400">Telegram</span>
            </button>
            <button
              onClick={() => window.open(`sms:?body=${encodeURIComponent(shortShareText)}`, '_self')}
              className="flex flex-col items-center gap-1 p-3 bg-neon-cyan/20 hover:bg-neon-cyan/30 rounded-xl transition-colors"
              aria-label="Share via iMessage/SMS"
            >
              <span className="text-xl">💭</span>
              <span className="text-xs text-neon-cyan">iMessage</span>
            </button>
            <button
              onClick={() => {
                const subject = encodeURIComponent(`${modeConfig.icon} Join my TAG game!`);
                const body = encodeURIComponent(shareText);
                window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
              }}
              className="flex flex-col items-center gap-1 p-3 bg-neon-purple/20 hover:bg-neon-purple/30 rounded-xl transition-colors"
              aria-label="Share via Email"
            >
              <span className="text-xl">📧</span>
              <span className="text-xs text-neon-purple">Email</span>
            </button>
          </div>
        </div>
        
        <div className="p-4 border-t border-white/10">
          <h3 className="text-sm font-medium mb-3">Send Direct Invite</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              placeholder="Email or phone number"
              className="input-field flex-1"
              aria-label="Email or phone number"
            />
            <button
              onClick={handleSendInvite}
              disabled={!contactValue.trim()}
              className="btn-secondary px-4 disabled:opacity-50 flex items-center gap-2"
              aria-label="Send invite"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
          
          {sent && (
            <p className="text-sm text-green-400 flex items-center gap-2 mt-2">
              <Check className="w-4 h-4" /> Invite sent!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default InviteModal;

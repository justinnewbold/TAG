import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LeaveConfirmModal - Confirmation dialog for leaving a game
 */
const LeaveConfirmModal = memo(function LeaveConfirmModal({
  isOpen,
  isHost,
  isLeaving,
  onLeave,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
      <div className="bg-dark-800 border border-white/10 rounded-3xl p-6 w-full max-w-md animate-slide-up pb-safe">
        <h2 className="text-xl font-bold mb-2 text-center">Leave Game?</h2>
        <p className="text-white/60 mb-6 text-center">
          {isHost ? "You're the host. The game will be cancelled." : "You can rejoin with the code."}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onLeave}
            disabled={isLeaving}
            className="w-full h-14 bg-red-500 rounded-xl text-lg font-bold flex items-center justify-center"
          >
            {isLeaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Leave Game'}
          </button>
          <button
            onClick={onCancel}
            className="w-full h-14 bg-white/10 rounded-xl text-lg"
          >
            Stay
          </button>
        </div>
      </div>
    </div>
  );
});

export default LeaveConfirmModal;

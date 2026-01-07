import React, { memo, useState } from 'react';
import { MapPin, Loader2, MoreVertical, UserX, Ban, Check, X, UserPlus, UserCheck } from 'lucide-react';
import Avatar from '../Avatar';

/**
 * PlayersList - Displays all players in the lobby with host actions
 */
const PlayersList = memo(function PlayersList({
  players,
  pendingPlayers,
  currentUserId,
  hostId,
  isHost,
  minPlayers,
  isKicking,
  onInvite,
  onKick,
  onBan,
  onApprove,
  onReject,
}) {
  const [playerMenuId, setPlayerMenuId] = useState(null);
  const playerCount = players?.length || 0;

  return (
    <div className="px-4 pb-32">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">
          Players ({playerCount})
        </h3>
        <button
          onClick={onInvite}
          className="flex items-center gap-2 text-neon-cyan text-sm px-3 py-1.5 bg-neon-cyan/10 rounded-full"
        >
          <UserPlus className="w-4 h-4" />
          Invite
        </button>
      </div>

      <div className="space-y-2">
        {players?.map((player) => (
          <div
            key={player.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
              player.id === currentUserId
                ? 'bg-neon-cyan/10 border border-neon-cyan/30'
                : 'bg-white/5'
            }`}
          >
            <Avatar user={player} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{player.name}</p>
                {player.id === currentUserId && <span className="text-xs text-neon-cyan">(You)</span>}
                {player.id === hostId && <span className="text-xs">👑</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40">
                {player.location ? (
                  <span className="flex items-center gap-1 text-green-400">
                    <MapPin className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> GPS...
                  </span>
                )}
              </div>
            </div>

            {/* Host Actions */}
            {isHost && player.id !== currentUserId && (
              <div className="relative">
                <button
                  onClick={() => setPlayerMenuId(playerMenuId === player.id ? null : player.id)}
                  className="p-2 hover:bg-white/10 rounded-lg"
                >
                  <MoreVertical className="w-4 h-4 text-white/50" />
                </button>
                {playerMenuId === player.id && (
                  <div className="absolute right-0 top-full mt-1 bg-dark-800 border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden min-w-[140px]">
                    <button
                      onClick={() => {
                        onKick(player.id);
                        setPlayerMenuId(null);
                      }}
                      disabled={isKicking}
                      className="w-full px-4 py-3 text-left text-amber-400 hover:bg-amber-400/10 flex items-center gap-2 text-sm"
                    >
                      <UserX className="w-4 h-4" />
                      Remove
                    </button>
                    <button
                      onClick={() => {
                        onBan(player.id);
                        setPlayerMenuId(null);
                      }}
                      disabled={isKicking}
                      className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-400/10 flex items-center gap-2 border-t border-white/5 text-sm"
                    >
                      <Ban className="w-4 h-4" />
                      Ban
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Pending Players */}
        {isHost && pendingPlayers?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-sm text-amber-400 mb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Pending ({pendingPlayers.length})
            </p>
            {pendingPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 mb-2"
              >
                <Avatar user={player} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{player.name}</p>
                  <p className="text-xs text-white/40">Wants to join</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onApprove(player.id)}
                    className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onReject(player.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty Slots */}
        {playerCount < minPlayers && [...Array(minPlayers - playerCount)].map((_, i) => (
          <button
            key={`empty-${i}`}
            onClick={onInvite}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border-2 border-dashed border-white/10 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg text-white/30">+</div>
            <div className="flex-1 text-left">
              <p className="text-white/40 font-medium">Invite player</p>
            </div>
          </button>
        ))}
      </div>

      {/* Warning */}
      {playerCount < minPlayers && (
        <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
          <p className="text-amber-400 text-sm">
            Need {minPlayers - playerCount} more player{minPlayers - playerCount > 1 ? 's' : ''} to start
          </p>
        </div>
      )}
    </div>
  );
});

export default PlayersList;

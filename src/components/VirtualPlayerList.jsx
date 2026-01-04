/**
 * Virtual Scrolling Player List Component
 * Phase 1: Implements virtual scrolling for player lists over 20 items
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { getDistance } from '../../shared/utils';

// Memoized player list item
const PlayerListItem = memo(function PlayerListItem({
  player,
  isIT,
  isCurrentUser,
  currentUserLocation,
  showDistance,
  onSelect,
  onTag,
  style,
}) {
  // Memoize distance calculation
  const distance = useMemo(() => {
    if (!showDistance || !currentUserLocation || !player.location) {
      return null;
    }
    return getDistance(
      currentUserLocation.lat,
      currentUserLocation.lng,
      player.location.lat,
      player.location.lng
    );
  }, [
    showDistance,
    currentUserLocation?.lat,
    currentUserLocation?.lng,
    player.location?.lat,
    player.location?.lng,
  ]);

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div
      style={style}
      className={`
        flex items-center justify-between p-3 border-b border-white/10
        ${isCurrentUser ? 'bg-neon-cyan/10' : ''}
        ${isIT ? 'bg-red-500/10 border-l-2 border-l-red-500' : ''}
        ${player.isEliminated ? 'opacity-50' : ''}
        ${player.isFrozen ? 'bg-blue-500/10' : ''}
        hover:bg-white/5 cursor-pointer transition-colors
      `}
      onClick={() => onSelect?.(player)}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{player.avatar || '👤'}</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {player.name}
              {isCurrentUser && <span className="text-neon-cyan ml-1">(You)</span>}
            </span>
            {isIT && <span className="text-red-400 text-xs font-bold">IT</span>}
            {player.isFrozen && <span className="text-blue-400 text-xs">❄️ Frozen</span>}
            {player.isEliminated && <span className="text-gray-400 text-xs">💀 Out</span>}
          </div>
          {showDistance && distance !== null && (
            <span className="text-sm text-white/50">
              {formatDistance(distance)} away
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {player.tagCount > 0 && (
          <span className="text-sm bg-white/10 px-2 py-0.5 rounded">
            {player.tagCount} tags
          </span>
        )}
        {!player.isOnline && (
          <span className="text-xs text-yellow-400">Offline</span>
        )}
        {onTag && !isCurrentUser && !player.isEliminated && !player.isFrozen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTag(player);
            }}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm font-bold transition-colors"
          >
            TAG!
          </button>
        )}
      </div>
    </div>
  );
});

/**
 * Virtual Scrolling Player List
 * Uses windowing technique to render only visible items
 */
export function VirtualPlayerList({
  players = [],
  currentUserId,
  currentUserLocation,
  itPlayerId,
  showDistance = true,
  itemHeight = 64,
  overscan = 5,
  onPlayerSelect,
  onTag,
  emptyMessage = 'No players',
  maxHeight = 400,
  virtualizationThreshold = 20,
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(maxHeight);

  // Sort players: current user first, then IT, then by name
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      if (a.id === itPlayerId) return -1;
      if (b.id === itPlayerId) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [players, currentUserId, itPlayerId]);

  // Only use virtualization if we have many players
  const useVirtualization = sortedPlayers.length > virtualizationThreshold;

  // Calculate visible range
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    if (!useVirtualization) {
      return {
        startIndex: 0,
        endIndex: sortedPlayers.length,
        visibleItems: sortedPlayers.map((player, index) => ({
          player,
          index,
          style: {},
        })),
      };
    }

    const totalHeight = sortedPlayers.length * itemHeight;
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      sortedPlayers.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const items = [];
    for (let i = start; i < end; i++) {
      items.push({
        player: sortedPlayers[i],
        index: i,
        style: {
          position: 'absolute',
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        },
      });
    }

    return {
      startIndex: start,
      endIndex: end,
      visibleItems: items,
    };
  }, [sortedPlayers, scrollTop, containerHeight, itemHeight, overscan, useVirtualization]);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Update container height on resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (sortedPlayers.length === 0) {
    return (
      <div className="text-center py-8 text-white/50">
        {emptyMessage}
      </div>
    );
  }

  const totalHeight = sortedPlayers.length * itemHeight;

  if (!useVirtualization) {
    // Render all items for small lists
    return (
      <div
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        {sortedPlayers.map((player) => (
          <PlayerListItem
            key={player.id}
            player={player}
            isIT={player.id === itPlayerId}
            isCurrentUser={player.id === currentUserId}
            currentUserLocation={currentUserLocation}
            showDistance={showDistance}
            onSelect={onPlayerSelect}
            onTag={onTag}
            style={{}}
          />
        ))}
      </div>
    );
  }

  // Virtualized rendering for large lists
  return (
    <div
      ref={containerRef}
      className="overflow-y-auto"
      style={{ height: Math.min(totalHeight, maxHeight) }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ player, index, style }) => (
          <PlayerListItem
            key={player.id}
            player={player}
            isIT={player.id === itPlayerId}
            isCurrentUser={player.id === currentUserId}
            currentUserLocation={currentUserLocation}
            showDistance={showDistance}
            onSelect={onPlayerSelect}
            onTag={onTag}
            style={style}
          />
        ))}
      </div>
    </div>
  );
}

// Export memoized version
export default memo(VirtualPlayerList);

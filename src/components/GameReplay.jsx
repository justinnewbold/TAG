/**
 * Game Replay & Sharing Component
 * Records game sessions, allows playback, and sharing to social media
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Rewind,
  Share2,
  Download,
  Maximize2,
  Minimize2,
  Video,
  Camera,
  Scissors,
  Clock,
  Calendar,
  Trophy,
  Zap,
  Users,
  MapPin,
  Star,
  Heart,
  MessageCircle,
  Link2,
  Twitter,
  Facebook,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  Film,
} from 'lucide-react';

// Playback speeds
const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2, 4];

// Format duration
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Format date
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Timeline marker component
function TimelineMarker({ event, position, onClick, isActive }) {
  const colors = {
    TAG: 'bg-yellow-500',
    POWERUP: 'bg-pink-500',
    ACHIEVEMENT: 'bg-cyan-500',
    ELIMINATION: 'bg-red-500',
  };

  return (
    <button
      onClick={onClick}
      className={`absolute top-0 w-2 h-full transform -translate-x-1/2 transition-all ${
        isActive ? 'scale-150 z-10' : 'hover:scale-125'
      }`}
      style={{ left: `${position}%` }}
      title={event.description}
    >
      <div className={`w-2 h-2 rounded-full ${colors[event.type] || 'bg-gray-500'}`} />
    </button>
  );
}

// Highlight clip component
function HighlightClip({ clip, onPlay, onDelete, isPlaying }) {
  return (
    <div
      className={`relative bg-gray-800/50 rounded-lg overflow-hidden border transition-colors ${
        isPlaying ? 'border-cyan-500' : 'border-transparent hover:border-gray-600'
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-900 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="w-8 h-8 text-gray-600" />
        </div>
        {/* Duration badge */}
        <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-xs text-white">
          {formatDuration(clip.duration)}
        </div>
      </div>

      {/* Info */}
      <div className="p-2">
        <div className="text-sm font-medium text-white truncate">{clip.title}</div>
        <div className="text-xs text-gray-400">{formatDate(clip.timestamp)}</div>
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          onClick={() => onPlay(clip)}
          className="p-1.5 bg-black/60 rounded-full hover:bg-cyan-500/30 transition-colors"
        >
          <Play className="w-3 h-3 text-white" fill="white" />
        </button>
        <button
          onClick={() => onDelete(clip.id)}
          className="p-1.5 bg-black/60 rounded-full hover:bg-red-500/30 transition-colors"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      </div>
    </div>
  );
}

// Share modal component
function ShareModal({ replay, onClose, onShare }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `https://taggame.app/replay/${replay.id}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareToSocial = (platform) => {
    const text = `Check out this epic tag game replay! 🏃‍♂️⚡`;
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    };

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
    onShare?.(platform);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Share Replay</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Preview */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Video className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="font-medium text-white">{replay.title || 'Game Replay'}</div>
              <div className="text-sm text-gray-400">
                {formatDuration(replay.duration)} • {replay.playerCount} players
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-gray-400">{replay.tagCount} tags</span>
              </div>
            </div>
          </div>
        </div>

        {/* Social buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => shareToSocial('twitter')}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 text-[#1DA1F2] rounded-xl transition-colors"
          >
            <Twitter className="w-5 h-5" />
            Twitter
          </button>
          <button
            onClick={() => shareToSocial('facebook')}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#4267B2]/20 hover:bg-[#4267B2]/30 text-[#4267B2] rounded-xl transition-colors"
          >
            <Facebook className="w-5 h-5" />
            Facebook
          </button>
        </div>

        {/* Copy link */}
        <div className="flex items-center gap-2 bg-gray-800 rounded-xl p-2">
          <div className="flex-1 px-3 py-2 text-sm text-gray-400 truncate">{shareUrl}</div>
          <button
            onClick={copyToClipboard}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              copied
                ? 'bg-green-500/20 text-green-400'
                : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 inline mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 inline mr-1" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main GameReplay component
export default function GameReplay({
  replay,
  events = [],
  players = [],
  onClose,
  onSaveHighlight,
  className = '',
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [clipStart, setClipStart] = useState(null);
  const [isClipping, setIsClipping] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(Date.now());

  const duration = replay?.duration || 0;

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = () => {
      const now = Date.now();
      const delta = (now - lastTimeRef.current) * playbackSpeed;
      lastTimeRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + delta;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = Date.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, duration]);

  // Get current state at playback time
  const currentState = useMemo(() => {
    // Find all events up to current time
    const activeEvents = events.filter((e) => e.timestamp <= currentTime);
    const lastEvent = activeEvents[activeEvents.length - 1];

    // Build player positions at current time
    const playerStates = new Map();
    players.forEach((p) => {
      playerStates.set(p.id, {
        ...p,
        location: p.initialLocation,
        isIt: p.wasInitialIt,
        isEliminated: false,
      });
    });

    // Apply events
    activeEvents.forEach((event) => {
      if (event.type === 'LOCATION_UPDATE') {
        const player = playerStates.get(event.playerId);
        if (player) {
          player.location = event.location;
        }
      } else if (event.type === 'TAG') {
        const tagger = playerStates.get(event.taggerId);
        const tagged = playerStates.get(event.taggedId);
        if (tagger) tagger.isIt = false;
        if (tagged) tagged.isIt = true;
      } else if (event.type === 'ELIMINATION') {
        const player = playerStates.get(event.playerId);
        if (player) player.isEliminated = true;
      }
    });

    return {
      players: Array.from(playerStates.values()),
      lastEvent,
    };
  }, [currentTime, events, players]);

  // Timeline markers for key events
  const timelineMarkers = useMemo(() => {
    return events
      .filter((e) => ['TAG', 'POWERUP', 'ACHIEVEMENT', 'ELIMINATION'].includes(e.type))
      .map((e) => ({
        ...e,
        position: (e.timestamp / duration) * 100,
      }));
  }, [events, duration]);

  // Handle timeline seek
  const handleSeek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    setCurrentTime(percent * duration);
  }, [duration]);

  // Skip forward/backward
  const skip = useCallback((seconds) => {
    setCurrentTime((prev) => Math.max(0, Math.min(duration, prev + seconds * 1000)));
  }, [duration]);

  // Jump to event
  const jumpToEvent = useCallback((event) => {
    setCurrentTime(event.timestamp);
    setIsPlaying(false);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Start/stop clipping
  const handleClip = useCallback(() => {
    if (!isClipping) {
      setClipStart(currentTime);
      setIsClipping(true);
    } else {
      const clipEnd = currentTime;
      const newHighlight = {
        id: `clip-${Date.now()}`,
        title: `Highlight ${highlights.length + 1}`,
        startTime: Math.min(clipStart, clipEnd),
        endTime: Math.max(clipStart, clipEnd),
        duration: Math.abs(clipEnd - clipStart),
        timestamp: Date.now(),
      };
      setHighlights((prev) => [...prev, newHighlight]);
      setIsClipping(false);
      setClipStart(null);
      onSaveHighlight?.(newHighlight);
    }
  }, [isClipping, currentTime, clipStart, highlights.length, onSaveHighlight]);

  // Delete highlight
  const deleteHighlight = useCallback((id) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // Play highlight
  const playHighlight = useCallback((clip) => {
    setCurrentTime(clip.startTime);
    setIsPlaying(true);
  }, []);

  // Save replay
  const saveReplay = useCallback(() => {
    setIsSaved(true);
    // In real implementation, save to backend
    setTimeout(() => setIsSaved(false), 2000);
  }, []);

  // Cycle playback speed
  const cycleSpeed = useCallback(() => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    setPlaybackSpeed(PLAYBACK_SPEEDS[nextIndex]);
  }, [playbackSpeed]);

  if (!replay) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 rounded-2xl p-8 ${className}`}>
        <div className="text-center text-gray-500">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No replay data available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Video className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-bold text-white">{replay.title || 'Game Replay'}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              {formatDate(replay.timestamp)}
              <span>•</span>
              <Users className="w-3 h-3" />
              {players.length} players
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={saveReplay}
            className={`p-2 rounded-lg transition-colors ${
              isSaved ? 'bg-green-500/20 text-green-400' : 'hover:bg-white/10 text-gray-400'
            }`}
          >
            {isSaved ? (
              <BookmarkCheck className="w-5 h-5" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main view area */}
      <div className="relative aspect-video bg-gray-800">
        {/* Map/game view would render here with currentState */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500">Game map view</p>
            <p className="text-xs text-gray-600 mt-1">
              {currentState.players.filter((p) => !p.isEliminated).length} active players
            </p>
          </div>
        </div>

        {/* Current event overlay */}
        {currentState.lastEvent && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-full px-4 py-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-white">{currentState.lastEvent.description}</span>
            </div>
          </div>
        )}

        {/* Clip indicator */}
        {isClipping && (
          <div className="absolute top-4 right-4 bg-red-500/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full" />
            <span className="text-xs text-white font-medium">Recording clip...</span>
          </div>
        )}

        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-4 right-4 p-2 bg-black/60 rounded-lg hover:bg-black/80"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-white" />
          ) : (
            <Maximize2 className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3 bg-gray-800/50">
        <div
          className="relative h-8 bg-gray-700 rounded-full cursor-pointer group"
          onClick={handleSeek}
        >
          {/* Progress bar */}
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />

          {/* Clip range indicator */}
          {isClipping && clipStart !== null && (
            <div
              className="absolute top-0 h-full bg-red-500/30 border-l-2 border-r-2 border-red-500"
              style={{
                left: `${(Math.min(clipStart, currentTime) / duration) * 100}%`,
                width: `${(Math.abs(currentTime - clipStart) / duration) * 100}%`,
              }}
            />
          )}

          {/* Event markers */}
          <div className="absolute inset-0">
            {timelineMarkers.map((event, i) => (
              <TimelineMarker
                key={i}
                event={event}
                position={event.position}
                onClick={() => jumpToEvent(event)}
                isActive={Math.abs(event.timestamp - currentTime) < 1000}
              />
            ))}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 group-hover:scale-125 transition-transform"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        {/* Time display */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
        {/* Left controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => skip(-10)}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400"
            title="Rewind 10s"
          >
            <Rewind className="w-5 h-5" />
          </button>
          <button
            onClick={() => skip(-5)}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400"
            title="Skip back 5s"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {/* Play/pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 bg-cyan-500 rounded-full hover:bg-cyan-600 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" fill="white" />
            ) : (
              <Play className="w-6 h-6 text-white" fill="white" />
            )}
          </button>

          <button
            onClick={() => skip(5)}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400"
            title="Skip forward 5s"
          >
            <SkipForward className="w-5 h-5" />
          </button>
          <button
            onClick={() => skip(10)}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400"
            title="Fast forward 10s"
          >
            <FastForward className="w-5 h-5" />
          </button>
        </div>

        {/* Center - speed control */}
        <button
          onClick={cycleSpeed}
          className="px-3 py-1.5 bg-gray-700 rounded-lg text-sm text-white hover:bg-gray-600 transition-colors"
        >
          {playbackSpeed}x
        </button>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleClip}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isClipping
                ? 'bg-red-500/20 text-red-400 border border-red-500'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            <Scissors className="w-4 h-4" />
            {isClipping ? 'End Clip' : 'Clip'}
          </button>

          <button
            onClick={() => setShowHighlights(!showHighlights)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              showHighlights ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            <Star className="w-4 h-4" />
            Highlights ({highlights.length})
            {showHighlights ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Highlights panel */}
      {showHighlights && (
        <div className="px-4 py-3 border-t border-gray-700 bg-gray-800/50">
          {highlights.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <Scissors className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No highlights yet</p>
              <p className="text-xs">Use the clip button to create highlights</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {highlights.map((clip) => (
                <HighlightClip
                  key={clip.id}
                  clip={clip}
                  onPlay={playHighlight}
                  onDelete={deleteHighlight}
                  isPlaying={currentTime >= clip.startTime && currentTime <= clip.endTime}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Share modal */}
      {showShareModal && (
        <ShareModal
          replay={replay}
          onClose={() => setShowShareModal(false)}
          onShare={(platform) => console.log(`Shared to ${platform}`)}
        />
      )}
    </div>
  );
}

// Hook for game recording
export function useGameRecorder(socket, gameId) {
  const [isRecording, setIsRecording] = useState(false);
  const [events, setEvents] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const eventsRef = useRef([]);

  // Start recording
  const startRecording = useCallback(() => {
    setIsRecording(true);
    setStartTime(Date.now());
    setEvents([]);
    eventsRef.current = [];
  }, []);

  // Stop recording and return replay data
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    const duration = Date.now() - startTime;
    return {
      id: `replay-${Date.now()}`,
      gameId,
      timestamp: startTime,
      duration,
      events: eventsRef.current,
    };
  }, [gameId, startTime]);

  // Record an event
  const recordEvent = useCallback((event) => {
    if (!isRecording) return;

    const recordedEvent = {
      ...event,
      timestamp: Date.now() - startTime,
    };

    eventsRef.current.push(recordedEvent);
    setEvents((prev) => [...prev, recordedEvent]);
  }, [isRecording, startTime]);

  // Socket event listeners for auto-recording
  useEffect(() => {
    if (!socket || !isRecording) return;

    const handlers = {
      'game:locationUpdate': (data) => recordEvent({ type: 'LOCATION_UPDATE', ...data }),
      'game:tag': (data) => recordEvent({ type: 'TAG', ...data }),
      'game:powerup': (data) => recordEvent({ type: 'POWERUP', ...data }),
      'game:elimination': (data) => recordEvent({ type: 'ELIMINATION', ...data }),
      'game:achievement': (data) => recordEvent({ type: 'ACHIEVEMENT', ...data }),
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.keys(handlers).forEach((event) => {
        socket.off(event, handlers[event]);
      });
    };
  }, [socket, isRecording, recordEvent]);

  return {
    isRecording,
    events,
    eventCount: events.length,
    duration: startTime ? Date.now() - startTime : 0,
    startRecording,
    stopRecording,
    recordEvent,
  };
}

// Hook for loading saved replays
export function useSavedReplays(userId) {
  const [replays, setReplays] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadReplays = useCallback(async () => {
    setIsLoading(true);
    try {
      // In real implementation, fetch from backend
      const response = await fetch(`/api/replays?userId=${userId}`);
      const data = await response.json();
      setReplays(data.replays || []);
    } catch (err) {
      console.error('Failed to load replays:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const deleteReplay = useCallback(async (replayId) => {
    try {
      await fetch(`/api/replays/${replayId}`, { method: 'DELETE' });
      setReplays((prev) => prev.filter((r) => r.id !== replayId));
    } catch (err) {
      console.error('Failed to delete replay:', err);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadReplays();
    }
  }, [userId, loadReplays]);

  return {
    replays,
    isLoading,
    loadReplays,
    deleteReplay,
  };
}

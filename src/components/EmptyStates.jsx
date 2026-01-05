/**
 * Empty State Components
 * Phase 2: Add empty state designs for no games, no friends, no achievements
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Gamepad2, Users, Trophy, History, Bell, MapPin,
  Plus, UserPlus, Target, Search, Calendar, MessageSquare
} from 'lucide-react';

/**
 * Base Empty State Component
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  actionTo,
  secondaryAction,
  secondaryActionLabel,
  className = '',
}) {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-white/40" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/60 text-sm max-w-xs mx-auto mb-6">{description}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {actionTo ? (
          <Link
            to={actionTo}
            className="px-6 py-2 bg-neon-cyan text-dark-900 rounded-lg font-semibold hover:bg-neon-cyan/90 transition-colors inline-flex items-center gap-2"
          >
            {action && <action.icon className="w-4 h-4" />}
            {actionLabel}
          </Link>
        ) : action ? (
          <button
            onClick={action}
            className="px-6 py-2 bg-neon-cyan text-dark-900 rounded-lg font-semibold hover:bg-neon-cyan/90 transition-colors inline-flex items-center gap-2"
          >
            {actionLabel}
          </button>
        ) : null}
        {secondaryAction && (
          <button
            onClick={secondaryAction}
            className="px-6 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * No Games Empty State
 */
export function NoGamesEmptyState({ onCreateGame }) {
  return (
    <EmptyState
      icon={Gamepad2}
      title="No Active Games"
      description="Start a new game or join an existing one to begin playing TAG!"
      actionTo="/create"
      actionLabel="Create Game"
      action={{ icon: Plus }}
      secondaryAction={() => window.location.href = '/join'}
      secondaryActionLabel="Join Game"
    />
  );
}

/**
 * No Public Games Empty State
 */
export function NoPublicGamesEmptyState() {
  return (
    <EmptyState
      icon={Search}
      title="No Public Games Found"
      description="There are no public games available right now. Create your own or check back later!"
      actionTo="/create"
      actionLabel="Create Public Game"
      action={{ icon: Plus }}
    />
  );
}

/**
 * No Friends Empty State
 */
export function NoFriendsEmptyState() {
  return (
    <EmptyState
      icon={Users}
      title="No Friends Yet"
      description="Add friends to play together and see their stats. Share your friend code to get started!"
      actionLabel="Add Friends"
      action={{ icon: UserPlus }}
    />
  );
}

/**
 * No Achievements Empty State
 */
export function NoAchievementsEmptyState() {
  return (
    <EmptyState
      icon={Trophy}
      title="No Achievements Yet"
      description="Play games and complete challenges to unlock achievements and earn rewards!"
      actionTo="/"
      actionLabel="Start Playing"
      action={{ icon: Target }}
    />
  );
}

/**
 * No Game History Empty State
 */
export function NoGameHistoryEmptyState() {
  return (
    <EmptyState
      icon={History}
      title="No Game History"
      description="Your completed games will appear here. Start playing to build your history!"
      actionTo="/"
      actionLabel="Play a Game"
      action={{ icon: Gamepad2 }}
    />
  );
}

/**
 * No Notifications Empty State
 */
export function NoNotificationsEmptyState() {
  return (
    <EmptyState
      icon={Bell}
      title="All Caught Up!"
      description="You have no notifications. We'll let you know when something happens!"
    />
  );
}

/**
 * No Location Permission Empty State
 */
export function NoLocationEmptyState({ onRequestPermission }) {
  return (
    <EmptyState
      icon={MapPin}
      title="Location Access Required"
      description="TAG needs access to your location to show you on the map and enable gameplay."
      action={onRequestPermission}
      actionLabel="Enable Location"
    />
  );
}

/**
 * No Search Results Empty State
 */
export function NoSearchResultsEmptyState({ query }) {
  return (
    <EmptyState
      icon={Search}
      title="No Results Found"
      description={`We couldn't find anything matching "${query}". Try a different search term.`}
    />
  );
}

/**
 * No Players in Lobby Empty State
 */
export function NoPlayersEmptyState() {
  return (
    <EmptyState
      icon={Users}
      title="Waiting for Players"
      description="Share the game code with friends to invite them to join!"
    />
  );
}

/**
 * No Upcoming Games Empty State
 */
export function NoScheduledGamesEmptyState() {
  return (
    <EmptyState
      icon={Calendar}
      title="No Scheduled Games"
      description="You don't have any upcoming scheduled games. Create one to play later!"
      actionTo="/create"
      actionLabel="Schedule Game"
      action={{ icon: Plus }}
    />
  );
}

/**
 * No Messages Empty State
 */
export function NoMessagesEmptyState() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No Messages"
      description="Start a conversation! Send a message to get the chat going."
    />
  );
}

/**
 * Offline Empty State
 */
export function OfflineEmptyState({ onRetry }) {
  return (
    <EmptyState
      icon={MapPin}
      title="You're Offline"
      description="Please check your internet connection and try again."
      action={onRetry}
      actionLabel="Retry Connection"
    />
  );
}

/**
 * Error Empty State
 */
export function ErrorEmptyState({ error, onRetry }) {
  return (
    <EmptyState
      icon={Target}
      title="Something Went Wrong"
      description={error || "An unexpected error occurred. Please try again."}
      action={onRetry}
      actionLabel="Try Again"
    />
  );
}

export default {
  EmptyState,
  NoGamesEmptyState,
  NoPublicGamesEmptyState,
  NoFriendsEmptyState,
  NoAchievementsEmptyState,
  NoGameHistoryEmptyState,
  NoNotificationsEmptyState,
  NoLocationEmptyState,
  NoSearchResultsEmptyState,
  NoPlayersEmptyState,
  NoScheduledGamesEmptyState,
  NoMessagesEmptyState,
  OfflineEmptyState,
  ErrorEmptyState,
};

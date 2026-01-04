/**
 * Skeleton Loading Screens
 * Phase 2: Add skeleton screens for game lists and profile
 */

import React from 'react';

/**
 * Base skeleton pulse animation
 */
const Skeleton = ({ className = '', children }) => (
  <div className={`animate-pulse ${className}`}>
    {children}
  </div>
);

/**
 * Skeleton box element
 */
const SkeletonBox = ({ className = '' }) => (
  <div className={`bg-white/10 rounded ${className}`} />
);

/**
 * Skeleton circle element
 */
const SkeletonCircle = ({ size = 'w-10 h-10' }) => (
  <div className={`bg-white/10 rounded-full ${size}`} />
);

/**
 * Skeleton text line
 */
const SkeletonText = ({ width = 'w-full', height = 'h-4' }) => (
  <div className={`bg-white/10 rounded ${width} ${height}`} />
);

/**
 * Game List Item Skeleton
 */
export function GameListItemSkeleton() {
  return (
    <Skeleton className="bg-dark-800/50 rounded-xl p-4 border border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonCircle size="w-12 h-12" />
          <div className="space-y-2">
            <SkeletonText width="w-32" />
            <SkeletonText width="w-20" height="h-3" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox className="w-16 h-8 rounded-lg" />
        </div>
      </div>
    </Skeleton>
  );
}

/**
 * Game List Skeleton
 */
export function GameListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <GameListItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Player List Item Skeleton
 */
export function PlayerListItemSkeleton() {
  return (
    <Skeleton className="flex items-center justify-between p-3 border-b border-white/10">
      <div className="flex items-center gap-3">
        <SkeletonCircle size="w-10 h-10" />
        <div className="space-y-2">
          <SkeletonText width="w-24" />
          <SkeletonText width="w-16" height="h-3" />
        </div>
      </div>
      <SkeletonBox className="w-12 h-6 rounded" />
    </Skeleton>
  );
}

/**
 * Player List Skeleton
 */
export function PlayerListSkeleton({ count = 8 }) {
  return (
    <div className="divide-y divide-white/10">
      {Array.from({ length: count }).map((_, i) => (
        <PlayerListItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Profile Header Skeleton
 */
export function ProfileHeaderSkeleton() {
  return (
    <Skeleton className="text-center py-8">
      <SkeletonCircle size="w-24 h-24 mx-auto" />
      <div className="mt-4 space-y-2">
        <SkeletonText width="w-32 mx-auto" height="h-6" />
        <SkeletonText width="w-48 mx-auto" height="h-4" />
      </div>
    </Skeleton>
  );
}

/**
 * Stats Grid Skeleton
 */
export function StatsGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="bg-dark-800/50 rounded-xl p-4 border border-white/5">
          <SkeletonCircle size="w-8 h-8" />
          <div className="mt-3 space-y-2">
            <SkeletonText width="w-16" height="h-6" />
            <SkeletonText width="w-20" height="h-3" />
          </div>
        </Skeleton>
      ))}
    </div>
  );
}

/**
 * Achievement Card Skeleton
 */
export function AchievementCardSkeleton() {
  return (
    <Skeleton className="bg-dark-800/50 rounded-xl p-4 border border-white/5">
      <div className="flex items-center gap-3">
        <SkeletonCircle size="w-12 h-12" />
        <div className="flex-1 space-y-2">
          <SkeletonText width="w-24" />
          <SkeletonText width="w-full" height="h-3" />
        </div>
      </div>
    </Skeleton>
  );
}

/**
 * Achievements Grid Skeleton
 */
export function AchievementsGridSkeleton({ count = 9 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <AchievementCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Friend Card Skeleton
 */
export function FriendCardSkeleton() {
  return (
    <Skeleton className="bg-dark-800/50 rounded-xl p-4 border border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonCircle size="w-12 h-12" />
          <div className="space-y-2">
            <SkeletonText width="w-24" />
            <SkeletonText width="w-16" height="h-3" />
          </div>
        </div>
        <div className="flex gap-2">
          <SkeletonBox className="w-8 h-8 rounded-lg" />
          <SkeletonBox className="w-8 h-8 rounded-lg" />
        </div>
      </div>
    </Skeleton>
  );
}

/**
 * Friends List Skeleton
 */
export function FriendsListSkeleton({ count = 6 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <FriendCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Leaderboard Row Skeleton
 */
export function LeaderboardRowSkeleton({ showRank = true }) {
  return (
    <Skeleton className="flex items-center gap-4 p-3 border-b border-white/10">
      {showRank && <SkeletonBox className="w-8 h-8 rounded" />}
      <SkeletonCircle size="w-10 h-10" />
      <div className="flex-1 space-y-2">
        <SkeletonText width="w-32" />
        <SkeletonText width="w-20" height="h-3" />
      </div>
      <SkeletonText width="w-16" height="h-5" />
    </Skeleton>
  );
}

/**
 * Leaderboard Skeleton
 */
export function LeaderboardSkeleton({ count = 10 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <LeaderboardRowSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Game History Item Skeleton
 */
export function GameHistoryItemSkeleton() {
  return (
    <Skeleton className="bg-dark-800/50 rounded-xl p-4 border border-white/5">
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-2">
          <SkeletonText width="w-32" height="h-5" />
          <SkeletonText width="w-24" height="h-3" />
        </div>
        <SkeletonBox className="w-16 h-6 rounded" />
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCircle key={i} size="w-8 h-8" />
        ))}
        <SkeletonText width="w-8" height="h-4" />
      </div>
    </Skeleton>
  );
}

/**
 * Game History Skeleton
 */
export function GameHistorySkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <GameHistoryItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Notification Item Skeleton
 */
export function NotificationItemSkeleton() {
  return (
    <Skeleton className="flex items-start gap-3 p-4 border-b border-white/10">
      <SkeletonCircle size="w-10 h-10" />
      <div className="flex-1 space-y-2">
        <SkeletonText width="w-full" />
        <SkeletonText width="w-3/4" height="h-3" />
        <SkeletonText width="w-16" height="h-3" />
      </div>
    </Skeleton>
  );
}

/**
 * Notifications List Skeleton
 */
export function NotificationsListSkeleton({ count = 5 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <NotificationItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Map Skeleton
 */
export function MapSkeleton() {
  return (
    <Skeleton className="w-full h-64 bg-dark-800/50 rounded-xl border border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <SkeletonText width="w-24" className="mx-auto" />
        </div>
      </div>
    </Skeleton>
  );
}

/**
 * Settings Section Skeleton
 */
export function SettingsSectionSkeleton() {
  return (
    <Skeleton className="space-y-4">
      <SkeletonText width="w-32" height="h-5" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <SkeletonCircle size="w-8 h-8" />
              <div className="space-y-1">
                <SkeletonText width="w-24" />
                <SkeletonText width="w-32" height="h-3" />
              </div>
            </div>
            <SkeletonBox className="w-12 h-6 rounded-full" />
          </div>
        ))}
      </div>
    </Skeleton>
  );
}

/**
 * Full Page Skeleton
 */
export function FullPageSkeleton({ title = true }) {
  return (
    <div className="p-4 space-y-6">
      {title && (
        <div className="flex items-center gap-3">
          <SkeletonBox className="w-8 h-8 rounded-lg" />
          <SkeletonText width="w-32" height="h-6" />
        </div>
      )}
      <StatsGridSkeleton count={4} />
      <div className="space-y-3">
        <SkeletonText width="w-24" height="h-5" />
        <GameListSkeleton count={3} />
      </div>
    </div>
  );
}

export default {
  Skeleton,
  SkeletonBox,
  SkeletonCircle,
  SkeletonText,
  GameListSkeleton,
  GameListItemSkeleton,
  PlayerListSkeleton,
  PlayerListItemSkeleton,
  ProfileHeaderSkeleton,
  StatsGridSkeleton,
  AchievementsGridSkeleton,
  AchievementCardSkeleton,
  FriendsListSkeleton,
  FriendCardSkeleton,
  LeaderboardSkeleton,
  LeaderboardRowSkeleton,
  GameHistorySkeleton,
  GameHistoryItemSkeleton,
  NotificationsListSkeleton,
  NotificationItemSkeleton,
  MapSkeleton,
  SettingsSectionSkeleton,
  FullPageSkeleton,
};

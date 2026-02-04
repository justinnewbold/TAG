import React from 'react';

/**
 * Loading skeleton components for better perceived performance
 */

// Base skeleton pulse animation
const pulseClass = "animate-pulse bg-dark-700";

// Generic skeleton box
export function SkeletonBox({ className = "" }) {
  return <div className={`${pulseClass} rounded-lg ${className}`} />;
}

// Text line skeleton
export function SkeletonText({ width = "w-full", className = "" }) {
  return <div className={`${pulseClass} h-4 rounded ${width} ${className}`} />;
}

// Avatar/circle skeleton
export function SkeletonAvatar({ size = "w-10 h-10" }) {
  return <div className={`${pulseClass} rounded-full ${size}`} />;
}

// Card skeleton
export function SkeletonCard({ className = "" }) {
  return (
    <div className={`bg-dark-800 rounded-xl border border-dark-700 p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <SkeletonAvatar />
        <div className="flex-1 space-y-2">
          <SkeletonText width="w-1/3" />
          <SkeletonText width="w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonText />
        <SkeletonText width="w-3/4" />
      </div>
    </div>
  );
}

// Game card skeleton
export function GameCardSkeleton() {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <SkeletonAvatar size="w-12 h-12" />
          <div className="space-y-2">
            <SkeletonText width="w-24" />
            <SkeletonText width="w-16" />
          </div>
        </div>
        <SkeletonBox className="w-16 h-6" />
      </div>
      <div className="flex items-center gap-4">
        <SkeletonBox className="w-12 h-4" />
        <SkeletonBox className="w-12 h-4" />
        <SkeletonBox className="w-12 h-4" />
      </div>
    </div>
  );
}

// Player list skeleton
export function PlayerListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-dark-800 rounded-xl">
          <SkeletonAvatar />
          <div className="flex-1 space-y-1">
            <SkeletonText width="w-24" />
            <SkeletonText width="w-16" className="h-3" />
          </div>
          <SkeletonBox className="w-16 h-8" />
        </div>
      ))}
    </div>
  );
}

// Stats grid skeleton
export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-dark-800 rounded-xl p-4 text-center">
          <SkeletonText width="w-8 mx-auto" className="h-8 mb-2" />
          <SkeletonText width="w-16 mx-auto" />
        </div>
      ))}
    </div>
  );
}

// Map skeleton
export function MapSkeleton() {
  return (
    <div className="relative w-full h-64 bg-dark-800 rounded-xl overflow-hidden">
      <div className={`${pulseClass} absolute inset-0`} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Loading map...</p>
        </div>
      </div>
    </div>
  );
}

// Friends list skeleton
export function FriendsListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-dark-800 rounded-xl border border-dark-700">
          <SkeletonAvatar size="w-12 h-12" />
          <div className="flex-1 space-y-2">
            <SkeletonText width="w-32" />
            <SkeletonText width="w-20" className="h-3" />
          </div>
          <SkeletonBox className="w-20 h-8" />
        </div>
      ))}
    </div>
  );
}

// Settings section skeleton
export function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-dark-800 rounded-xl">
          <div className="flex items-center gap-3">
            <SkeletonBox className="w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <SkeletonText width="w-24" />
              <SkeletonText width="w-32" className="h-3" />
            </div>
          </div>
          <SkeletonBox className="w-12 h-6 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// Full page loading
export function PageLoadingSkeleton({ title }) {
  return (
    <div className="min-h-screen bg-dark-900 p-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <SkeletonBox className="w-10 h-10" />
          <SkeletonText width="w-32" className="h-6" />
        </div>
        
        {/* Content */}
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

// Bounty card skeleton
export function BountyCardSkeleton() {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <SkeletonAvatar size="w-10 h-10" />
          <div className="space-y-1">
            <SkeletonText width="w-24" />
            <SkeletonText width="w-16" className="h-3" />
          </div>
        </div>
        <SkeletonBox className="w-16 h-8 rounded-lg" />
      </div>
      <div className="flex items-center justify-between">
        <SkeletonText width="w-20" />
        <SkeletonBox className="w-24 h-8 rounded-lg" />
      </div>
    </div>
  );
}

// Bounty list skeleton
export function BountyListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <BountyCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Contract card skeleton
export function ContractCardSkeleton() {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
      <div className="flex items-center gap-3 mb-3">
        <SkeletonBox className="w-12 h-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <SkeletonText width="w-32" />
          <SkeletonText width="w-full" className="h-3" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <SkeletonText width="w-16" className="h-3" />
          <SkeletonText width="w-12" className="h-3" />
        </div>
        <SkeletonBox className="w-full h-2 rounded-full" />
      </div>
      <div className="flex items-center justify-between mt-3">
        <SkeletonText width="w-20" />
        <SkeletonBox className="w-16 h-6 rounded" />
      </div>
    </div>
  );
}

// Contract list skeleton
export function ContractListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <ContractCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Turf zone skeleton
export function TurfZoneSkeleton() {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <SkeletonBox className="w-10 h-10 rounded-lg" />
          <div className="space-y-1">
            <SkeletonText width="w-28" />
            <SkeletonText width="w-20" className="h-3" />
          </div>
        </div>
        <SkeletonBox className="w-20 h-6 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <SkeletonBox className="h-12 rounded-lg" />
        <SkeletonBox className="h-12 rounded-lg" />
        <SkeletonBox className="h-12 rounded-lg" />
      </div>
    </div>
  );
}

// Kill feed skeleton
export function KillFeedSkeleton({ count = 5 }) {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-2 bg-dark-800 rounded-lg">
          <SkeletonAvatar size="w-6 h-6" />
          <SkeletonText width="w-40" className="h-3" />
          <SkeletonText width="w-12" className="h-3 ml-auto" />
        </div>
      ))}
    </div>
  );
}

// Prestige card skeleton
export function PrestigeCardSkeleton() {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
      <div className="text-center mb-4">
        <SkeletonBox className="w-20 h-20 rounded-full mx-auto mb-3" />
        <SkeletonText width="w-32 mx-auto" className="h-6 mb-2" />
        <SkeletonText width="w-24 mx-auto" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <SkeletonText width="w-16" className="h-3" />
          <SkeletonText width="w-24" className="h-3" />
        </div>
        <SkeletonBox className="w-full h-3 rounded-full" />
      </div>
    </div>
  );
}

// Nemesis card skeleton
export function NemesisCardSkeleton() {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
      <div className="flex items-center gap-4">
        <SkeletonAvatar size="w-14 h-14" />
        <div className="flex-1 space-y-2">
          <SkeletonText width="w-28" />
          <SkeletonText width="w-40" className="h-3" />
          <div className="flex gap-4">
            <SkeletonText width="w-16" className="h-3" />
            <SkeletonText width="w-16" className="h-3" />
          </div>
        </div>
        <SkeletonBox className="w-12 h-12 rounded-lg" />
      </div>
    </div>
  );
}

// Home base skeleton
export function HomeBaseSkeleton() {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
      <div className="flex items-center gap-3 mb-4">
        <SkeletonBox className="w-16 h-16 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonText width="w-32" className="h-5" />
          <SkeletonText width="w-24" />
          <SkeletonText width="w-20" className="h-3" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SkeletonBox className="h-16 rounded-lg" />
        <SkeletonBox className="h-16 rounded-lg" />
        <SkeletonBox className="h-16 rounded-lg" />
        <SkeletonBox className="h-16 rounded-lg" />
      </div>
    </div>
  );
}

// Leaderboard skeleton
export function LeaderboardSkeleton({ count = 10 }) {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-dark-800 rounded-xl">
          <SkeletonBox className="w-8 h-8 rounded" />
          <SkeletonAvatar />
          <div className="flex-1 space-y-1">
            <SkeletonText width="w-24" />
            <SkeletonText width="w-16" className="h-3" />
          </div>
          <SkeletonText width="w-16" />
        </div>
      ))}
    </div>
  );
}

// Shop item skeleton
export function ShopItemSkeleton() {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
      <SkeletonBox className="w-full h-32 rounded-lg mb-3" />
      <SkeletonText width="w-24" className="mb-2" />
      <SkeletonText width="w-full" className="h-3 mb-3" />
      <div className="flex items-center justify-between">
        <SkeletonText width="w-16" />
        <SkeletonBox className="w-20 h-8 rounded-lg" />
      </div>
    </div>
  );
}

// Shop grid skeleton
export function ShopGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[...Array(count)].map((_, i) => (
        <ShopItemSkeleton key={i} />
      ))}
    </div>
  );
}

// Tournament bracket skeleton
export function TournamentBracketSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <SkeletonText width="w-32" className="h-6" />
        <SkeletonBox className="w-24 h-8 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-dark-800 rounded-xl border border-dark-700 p-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <SkeletonAvatar size="w-8 h-8" />
                <SkeletonText width="w-20" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonAvatar size="w-8 h-8" />
                <SkeletonText width="w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Inline loading spinner
export function InlineSpinner({ size = 'w-5 h-5', className = '' }) {
  return (
    <div className={`${size} border-2 border-primary-500 border-t-transparent rounded-full animate-spin ${className}`} />
  );
}

// Button loading state
export function ButtonLoading({ children, isLoading, disabled, className = '', ...props }) {
  return (
    <button
      className={`relative ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <InlineSpinner size="w-4 h-4" />
        </span>
      )}
      <span className={isLoading ? 'opacity-0' : ''}>{children}</span>
    </button>
  );
}

// Empty state with loading
export function LoadingOrEmpty({ isLoading, isEmpty, loadingSkeleton, emptyMessage, children }) {
  if (isLoading) {
    return loadingSkeleton;
  }
  if (isEmpty) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage || 'No data available'}
      </div>
    );
  }
  return children;
}

// Error state
export function ErrorState({ error, onRetry, className = '' }) {
  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="text-red-400 mb-2">
        {error?.message || 'Something went wrong'}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// Full async state handler
export function AsyncStateHandler({
  isLoading,
  error,
  data,
  loadingSkeleton,
  emptyMessage = 'No data available',
  onRetry,
  children,
}) {
  if (isLoading && !data) {
    return loadingSkeleton;
  }

  if (error && !data) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return typeof children === 'function' ? children(data) : children;
}

export default {
  SkeletonBox,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  GameCardSkeleton,
  PlayerListSkeleton,
  StatsGridSkeleton,
  MapSkeleton,
  FriendsListSkeleton,
  SettingsSkeleton,
  PageLoadingSkeleton,
  BountyCardSkeleton,
  BountyListSkeleton,
  ContractCardSkeleton,
  ContractListSkeleton,
  TurfZoneSkeleton,
  KillFeedSkeleton,
  PrestigeCardSkeleton,
  NemesisCardSkeleton,
  HomeBaseSkeleton,
  LeaderboardSkeleton,
  ShopItemSkeleton,
  ShopGridSkeleton,
  TournamentBracketSkeleton,
  InlineSpinner,
  ButtonLoading,
  LoadingOrEmpty,
  ErrorState,
  AsyncStateHandler,
};

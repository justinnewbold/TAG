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
};

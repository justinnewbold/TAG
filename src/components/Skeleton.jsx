import React from 'react';

// Skeleton loading components for better perceived performance

export function Skeleton({ className = '', variant = 'rectangle' }) {
  const baseClass = 'animate-pulse bg-white/10 rounded';
  
  if (variant === 'circle') {
    return <div className={`${baseClass} rounded-full ${className}`} />;
  }
  
  if (variant === 'text') {
    return <div className={`${baseClass} h-4 ${className}`} />;
  }
  
  return <div className={`${baseClass} ${className}`} />;
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circle" className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-32" />
          <Skeleton variant="text" className="w-20 h-3" />
        </div>
      </div>
      <Skeleton className="w-full h-20" />
    </div>
  );
}

export function SkeletonGameCard() {
  return (
    <div className="card p-4 border-l-4 border-l-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" className="w-10 h-10" />
          <div className="space-y-2">
            <Skeleton variant="text" className="w-28" />
            <Skeleton variant="text" className="w-16 h-3" />
          </div>
        </div>
        <Skeleton className="w-20 h-6 rounded-full" />
      </div>
      <div className="grid grid-cols-4 gap-3 mb-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <div className="flex justify-between">
        <Skeleton variant="text" className="w-24" />
        <Skeleton variant="text" className="w-20" />
      </div>
    </div>
  );
}

export function SkeletonPlayerRow() {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
      <Skeleton variant="text" className="w-6" />
      <Skeleton variant="circle" className="w-10 h-10" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-24" />
        <Skeleton variant="text" className="w-16 h-3" />
      </div>
      <Skeleton variant="text" className="w-12" />
    </div>
  );
}

export function SkeletonLobbyPlayer() {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
      <Skeleton className="w-12 h-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-28" />
        <Skeleton variant="text" className="w-20 h-3" />
      </div>
    </div>
  );
}

export default Skeleton;

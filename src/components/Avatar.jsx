import React, { useState } from 'react';

/**
 * Avatar Component - Handles both emoji and URL-based avatars
 * Supports Google OAuth profile pictures and emoji avatars
 */
export default function Avatar({
  user,
  size = 'md', // sm, md, lg, xl
  className = '',
  showBorder = false,
  onClick = null,
  style = {}
}) {
  // Determine avatar type - URL (from OAuth like Google) or emoji
  const avatarUrl = user?.avatarUrl || user?.avatar_url || user?.picture;
  const isUrlAvatar = avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('//'));
  const emojiAvatar = user?.avatar || '👤';

  // Track if image failed to load
  const [imageFailed, setImageFailed] = useState(false);

  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-xl',
    lg: 'w-14 h-14 text-2xl',
    xl: 'w-20 h-20 text-4xl',
  };

  const Component = onClick ? 'button' : 'div';
  const showEmoji = !isUrlAvatar || imageFailed;

  return (
    <Component
      onClick={onClick}
      className={`
        ${sizeClasses[size] || sizeClasses.md}
        rounded-full flex items-center justify-center overflow-hidden
        ${showBorder ? 'ring-2 ring-white/20' : ''}
        ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}
        ${showEmoji ? 'bg-gradient-to-br from-neon-cyan to-neon-purple' : ''}
        ${className}
      `}
      style={style}
    >
      {isUrlAvatar && !imageFailed ? (
        <img
          src={avatarUrl}
          alt={user?.name || 'User'}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{emojiAvatar}</span>
      )}
    </Component>
  );
}

// Also export a simple helper to check if user has a URL avatar
export const hasUrlAvatar = (user) => {
  const avatarUrl = user?.avatarUrl || user?.avatar_url || user?.picture;
  return avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('//'));
};


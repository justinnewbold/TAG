import React, { useState, useRef, useEffect } from 'react';

/**
 * Radial/Arc Quick Action Menu
 * - Thumb-reachable arc layout
 * - Appears from bottom corner
 * - Haptic feedback on selection
 */
function QuickActionMenu({ 
  isOpen, 
  onClose, 
  actions = [],
  position = 'right', // 'left' or 'right'
  size = 56
}) {
  const menuRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const centerRef = useRef({ x: 0, y: 0 });

  // Calculate arc positions for actions
  const getActionPosition = (index, total) => {
    // Arc from 180° to 270° (left) or 270° to 360° (right)
    const startAngle = position === 'left' ? 180 : 270;
    const endAngle = position === 'left' ? 270 : 360;
    const angleRange = endAngle - startAngle;
    const angleStep = angleRange / (total + 1);
    const angle = startAngle + angleStep * (index + 1);
    const radians = (angle * Math.PI) / 180;
    
    const radius = 120; // Distance from center
    const x = Math.cos(radians) * radius;
    const y = Math.sin(radians) * radius;
    
    return { x, y };
  };

  // Handle touch/drag to select
  const handleTouchStart = (e) => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    centerRef.current = {
      x: position === 'left' ? rect.left : rect.right,
      y: rect.bottom
    };
    setIsDragging(true);
    handleTouchMove(e);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || actions.length === 0) return;
    
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - centerRef.current.x;
    const dy = touch.clientY - centerRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only select if dragged far enough
    if (distance < 50) {
      setSelectedIndex(-1);
      return;
    }

    // Calculate angle and find closest action
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    
    const startAngle = position === 'left' ? 180 : 270;
    const endAngle = position === 'left' ? 270 : 360;
    
    if (angle >= startAngle && angle <= endAngle) {
      const normalizedAngle = angle - startAngle;
      const angleRange = endAngle - startAngle;
      const index = Math.floor((normalizedAngle / angleRange) * actions.length);
      const clampedIndex = Math.max(0, Math.min(actions.length - 1, index));
      
      if (clampedIndex !== selectedIndex) {
        setSelectedIndex(clampedIndex);
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (selectedIndex >= 0 && actions[selectedIndex]) {
      actions[selectedIndex].onAction?.();
      if ('vibrate' in navigator) {
        navigator.vibrate([20, 30, 20]);
      }
    }
    setIsDragging(false);
    setSelectedIndex(-1);
    onClose();
  };

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={menuRef}
      className={`fixed z-50 ${position === 'left' ? 'left-4' : 'right-4'} bottom-24`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={isDragging ? handleTouchMove : undefined}
      onMouseUp={handleTouchEnd}
    >
      {/* Backdrop glow */}
      <div 
        className={`absolute w-64 h-64 rounded-full bg-gradient-radial from-neon-purple/30 to-transparent blur-2xl pointer-events-none`}
        style={{
          bottom: -32,
          [position]: -32
        }}
      />

      {/* Action buttons in arc */}
      {actions.map((action, index) => {
        const pos = getActionPosition(index, actions.length);
        const isSelected = selectedIndex === index;
        
        return (
          <button
            key={action.id || index}
            onClick={() => {
              action.onAction?.();
              if ('vibrate' in navigator) navigator.vibrate(20);
              onClose();
            }}
            className={`absolute flex items-center justify-center rounded-full transition-all duration-200 ${
              isSelected 
                ? 'scale-125 bg-neon-cyan shadow-lg shadow-neon-cyan/50' 
                : 'bg-dark-700 hover:bg-dark-600 border border-white/20'
            }`}
            style={{
              width: size,
              height: size,
              transform: `translate(${pos.x}px, ${pos.y}px)`,
              bottom: 0,
              [position]: 0
            }}
          >
            {action.icon && (
              <action.icon className={`w-6 h-6 ${isSelected ? 'text-dark-900' : 'text-white'}`} />
            )}
            {action.emoji && (
              <span className="text-2xl">{action.emoji}</span>
            )}
          </button>
        );
      })}

      {/* Center trigger button */}
      <div 
        className="w-14 h-14 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center shadow-lg"
        style={{ position: 'absolute', bottom: 0, [position]: 0 }}
      >
        <span className="text-xl">⚡</span>
      </div>

      {/* Selection label */}
      {selectedIndex >= 0 && actions[selectedIndex] && (
        <div 
          className={`absolute bottom-20 ${position === 'left' ? 'left-0' : 'right-0'} px-4 py-2 bg-dark-800 rounded-xl border border-neon-cyan/50 whitespace-nowrap animate-fade-in`}
        >
          <span className="font-medium text-neon-cyan">{actions[selectedIndex].label}</span>
        </div>
      )}
    </div>
  );
}

export default QuickActionMenu;

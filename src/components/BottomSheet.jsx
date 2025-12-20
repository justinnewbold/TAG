import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/**
 * Mobile-first bottom sheet component
 * - Swipe down to dismiss
 * - Snap points for partial/full height
 * - Thumb-friendly close button
 */
function BottomSheet({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  snapPoints = ['50%', '90%'],
  initialSnap = 0,
  showHandle = true,
  showCloseButton = true,
  className = ''
}) {
  const sheetRef = useRef(null);
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // Parse snap point to pixels
  const getSnapHeight = (snapPoint) => {
    if (typeof snapPoint === 'number') return snapPoint;
    if (snapPoint.endsWith('%')) {
      return (parseInt(snapPoint) / 100) * window.innerHeight;
    }
    return parseInt(snapPoint);
  };

  const currentHeight = getSnapHeight(snapPoints[currentSnap]);

  // Handle touch start
  const handleTouchStart = (e) => {
    if (!showHandle) return;
    startY.current = e.touches[0].clientY;
    startHeight.current = currentHeight;
    setIsDragging(true);
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY.current;
    setDragOffset(deltaY);
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // If dragged down more than 100px, close or snap to smaller
    if (dragOffset > 100) {
      if (currentSnap === 0) {
        onClose();
      } else {
        setCurrentSnap(currentSnap - 1);
      }
    } 
    // If dragged up more than 100px, snap to larger
    else if (dragOffset < -100 && currentSnap < snapPoints.length - 1) {
      setCurrentSnap(currentSnap + 1);
    }

    setDragOffset(0);
  };

  // Cycle through snap points on handle double-tap
  const handleDoubleTap = () => {
    setCurrentSnap((currentSnap + 1) % snapPoints.length);
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Reset snap on open
  useEffect(() => {
    if (isOpen) {
      setCurrentSnap(initialSnap);
      setDragOffset(0);
    }
  }, [isOpen, initialSnap]);

  if (!isOpen) return null;

  const sheetHeight = Math.max(100, currentHeight - dragOffset);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        style={{ opacity: Math.min(1, sheetHeight / 300) }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-dark-800 rounded-t-3xl shadow-2xl transition-transform ${
          isDragging ? '' : 'transition-all duration-300'
        } ${className}`}
        style={{ 
          height: `${sheetHeight}px`,
          maxHeight: '95vh',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)'
        }}
      >
        {/* Drag Handle */}
        {showHandle && (
          <div 
            className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleTap}
          >
            <div className="w-12 h-1.5 bg-white/30 rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <h2 className="text-lg font-bold">{title}</h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4" style={{ maxHeight: `calc(${sheetHeight}px - 80px)` }}>
          {children}
        </div>

        {/* Safe area for bottom navigation */}
        <div className="h-6 bg-dark-800" />
      </div>
    </>
  );
}

export default BottomSheet;

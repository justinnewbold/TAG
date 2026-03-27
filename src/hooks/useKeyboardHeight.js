/**
 * useKeyboardHeight
 * Tracks the virtual keyboard height using the visualViewport API and
 * writes it to the CSS custom property `--keyboard-height` on <html>.
 * Components can consume the height via the `.keyboard-push-up` CSS class
 * or by reading the returned value directly.
 */
import { useEffect, useState } from 'react';

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // The gap between the layout viewport and the visual viewport is the
      // keyboard height (approximated). We floor at 0 to ignore any tiny
      // floating-point drift when the keyboard is closed.
      const height = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop
      );
      setKeyboardHeight(height);
      document.documentElement.style.setProperty(
        '--keyboard-height',
        `${height}px`
      );
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      // Reset on unmount
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    };
  }, []);

  return keyboardHeight;
}

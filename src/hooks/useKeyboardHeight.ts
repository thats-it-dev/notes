import { useState, useEffect } from 'react';

/**
 * Hook to detect virtual keyboard height on mobile devices.
 * Uses the Visual Viewport API to calculate the difference between
 * the window height and the visible viewport height.
 * Only reports keyboard height when an input element is focused.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardHeight = () => {
      // Only consider keyboard open if an input/editable element is focused
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable ||
        activeEl.closest('[contenteditable="true"]')
      );

      if (!isInputFocused) {
        setKeyboardHeight(0);
        return;
      }

      // The keyboard height is the difference between window height and viewport height
      // Account for any zoom by using viewport.scale
      const heightDiff = window.innerHeight - viewport.height * viewport.scale;
      // Only consider it a keyboard if the difference is significant (> 150px)
      // This avoids false positives from browser chrome changes (URL bar, etc.)
      setKeyboardHeight(heightDiff > 150 ? heightDiff : 0);
    };

    viewport.addEventListener('resize', updateKeyboardHeight);
    // Listen for focus changes to detect when inputs are focused/blurred
    document.addEventListener('focusin', updateKeyboardHeight);
    document.addEventListener('focusout', updateKeyboardHeight);

    // Initial check
    updateKeyboardHeight();

    return () => {
      viewport.removeEventListener('resize', updateKeyboardHeight);
      document.removeEventListener('focusin', updateKeyboardHeight);
      document.removeEventListener('focusout', updateKeyboardHeight);
    };
  }, []);

  return keyboardHeight;
}

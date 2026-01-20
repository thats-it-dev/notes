import { useRef, useState, useLayoutEffect } from 'react';

interface MarqueeTitleProps {
  title: string;
  isActive: boolean;
}

export function MarqueeTitle({ title, isActive }: MarqueeTitleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLHeadingElement>(null);
  const [scrollDistance, setScrollDistance] = useState(0);
  const [resetting, setResetting] = useState(false);

  const displayTitle = title || 'Untitled';

  // Calculate scroll distance - DOM measurement requires setState in effect
  useLayoutEffect(() => {
    if (containerRef.current && measureRef.current) {
      const textWidth = measureRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      const overflow = textWidth - containerWidth;
      setScrollDistance(overflow > 0 ? overflow + 16 : 0);
    }
  }, [title]);

  // Reset when becoming inactive
  useLayoutEffect(() => {
    if (!isActive && resetting) {
      setResetting(false);
    }
  }, [isActive, resetting]);

  const isOverflowing = scrollDistance > 0;
  const shouldAnimate = isActive && isOverflowing && !resetting;
  const duration = Math.max(2, scrollDistance * 0.02);

  const handleTransitionEnd = () => {
    if (isActive && isOverflowing && !resetting) {
      // Reached the end, pause then hard reset
      setTimeout(() => {
        setResetting(true);
        // Start scrolling again after reset
        setTimeout(() => {
          setResetting(false);
        }, 50);
      }, 1000);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden h-7"
    >
      {/* Hidden element for measuring */}
      <h5 ref={measureRef} className="invisible whitespace-nowrap absolute">{displayTitle}</h5>

      {/* Visible element */}
      <h5
        className={`absolute top-0 left-0 h-full leading-7 ${shouldAnimate ? '' : 'right-0'} ${resetting ? '' : 'transition-transform ease-linear'}`}
        style={{
          transform: shouldAnimate ? `translateX(-${scrollDistance}px)` : 'translateX(0)',
          transitionDuration: shouldAnimate ? `${duration}s` : '0s',
          transitionDelay: shouldAnimate ? '0.5s' : '0s',
          whiteSpace: 'nowrap',
          overflow: shouldAnimate ? 'visible' : 'hidden',
          textOverflow: shouldAnimate ? 'clip' : 'ellipsis',
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {displayTitle}
      </h5>
    </div>
  );
}

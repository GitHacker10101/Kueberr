
/**
 * Utility functions for Apple-inspired scroll animations
 */

// Easing functions for smooth animations
export const easings = {
    easeOutExpo: (x: number): number => {
        return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    },
    easeInOutCubic: (x: number): number => {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    },
    customAppleEase: (x: number): number => {
        return x < 0.5
            ? (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2
            : (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2;
    }
};

// Calculate opacity based on scroll position for fade effects
export const calculateScrollOpacity = (
    scrollY: number,
    start: number,
    end: number
): number => {
    if (scrollY < start) return 0;
    if (scrollY > end) return 1;
    return (scrollY - start) / (end - start);
};

// Calculate scale based on scroll position
export const calculateScrollScale = (
    scrollY: number,
    start: number,
    end: number,
    minScale: number = 0.8,
    maxScale: number = 1
): number => {
    if (scrollY < start) return minScale;
    if (scrollY > end) return maxScale;
    const progress = (scrollY - start) / (end - start);
    return minScale + (maxScale - minScale) * easings.easeOutExpo(progress);
};

// Reveal text character by character
export const splitTextIntoSpans = (text: string, className: string = ''): string => {
    return text
        .split('')
        .map((char, index) => `<span class="${className}" style="animation-delay: ${index * 0.03}s">${char}</span>`)
        .join('');
};

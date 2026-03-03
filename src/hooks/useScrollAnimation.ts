
import { useEffect, useState, useRef } from 'react';

/**
 * Interface for scroll animation configuration
 */
export interface ScrollAnimationConfig {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean;
}

/**
 * Hook to detect when an element enters the viewport
 * @param config IntersectionObserver configuration
 * @returns [ref, isVisible] tuple
 */
export const useScrollAnimation = (config: ScrollAnimationConfig = {}) => {
    const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = config;
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (triggerOnce) {
                        observer.unobserve(element);
                    }
                } else if (!triggerOnce) {
                    setIsVisible(false);
                }
            },
            {
                threshold,
                rootMargin,
            }
        );

        observer.observe(element);

        return () => {
            if (element) {
                observer.unobserve(element);
            }
        };
    }, [threshold, rootMargin, triggerOnce]);

    return { ref, isVisible };
};

/**
 * Hook for parallax scrolling effects
 * @param speed Speed multiplier for parallax effect (negative for reverse direction)
 * @returns ref to attach to the parallax element
 */
export const useParallax = (speed: number = 0.5) => {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!ref.current) return;
            const scrolled = window.scrollY;
            const val = scrolled * speed;
            ref.current.style.transform = `translateY(${val}px)`;
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [speed]);

    return ref;
};

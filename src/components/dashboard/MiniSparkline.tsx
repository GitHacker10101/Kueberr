import { useEffect, useRef } from 'react';

interface MiniSparklineProps {
    data: number[];
    color?: 'success' | 'destructive' | 'primary';
    className?: string;
}

export const MiniSparkline = ({ data, color = 'primary', className = '' }: MiniSparklineProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length < 2) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Calculate dimensions
        const padding = 2;
        const width = rect.width - padding * 2;
        const height = rect.height - padding * 2;

        // Find min and max for scaling
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;

        // Map data points to canvas coordinates
        const points = data.map((value, index) => ({
            x: padding + (index / (data.length - 1)) * width,
            y: padding + height - ((value - min) / range) * height
        }));

        // Set color based on prop
        const colors = {
            success: 'rgba(34, 197, 94, 0.8)',
            destructive: 'rgba(239, 68, 68, 0.8)',
            primary: 'rgba(14, 165, 233, 0.8)'
        };

        const gradientColors = {
            success: 'rgba(34, 197, 94, 0.2)',
            destructive: 'rgba(239, 68, 68, 0.2)',
            primary: 'rgba(14, 165, 233, 0.2)'
        };

        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
        gradient.addColorStop(0, gradientColors[color]);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        // Draw filled area
        ctx.beginPath();
        ctx.moveTo(points[0].x, rect.height - padding);
        points.forEach((point, index) => {
            if (index === 0) {
                ctx.lineTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.lineTo(points[points.length - 1].x, rect.height - padding);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach((point) => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.strokeStyle = colors[color];
        ctx.lineWidth = 1.5;
        ctx.stroke();

    }, [data, color]);

    return (
        <canvas
            ref={canvasRef}
            className={`w-full h-full ${className}`}
            style={{ width: '100%', height: '100%' }}
        />
    );
};

import { createChart, ColorType, IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

interface ChartData {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
}

interface CandlestickChartProps {
  data: ChartData[];
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    upColor?: string;
    downColor?: string;
  };
}

const CandlestickChart = ({ data, colors = {} }: CandlestickChartProps) => {
  const {
    backgroundColor = 'transparent',
    textColor = '#9CA3AF', // muted-foreground
    upColor = '#22c55e', // success
    downColor = '#ef4444', // destructive
  } = colors;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      grid: {
        vertLines: { color: 'rgba(156, 163, 175, 0.1)' },
        horzLines: { color: 'rgba(156, 163, 175, 0.1)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(156, 163, 175, 0.2)',
      },
      timeScale: {
        borderColor: 'rgba(156, 163, 175, 0.2)',
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor,
      downColor,
      borderVisible: false,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });

    // Map data to lightweight-charts format
    const mappedData = data.map(item => ({
      time: item.t as Time,
      open: item.o,
      high: item.h,
      low: item.l,
      close: item.c,
    })).sort((a, b) => (new Date(a.time as string).getTime() - new Date(b.time as string).getTime()));

    candlestickSeries.setData(mappedData);
    chart.timeScale().fitContent();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, backgroundColor, textColor, upColor, downColor]);

  return (
    <div ref={chartContainerRef} className="w-full" />
  );
};

export default CandlestickChart;

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChartCandlestick, ChartLine } from "lucide-react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  LineStyle,
  createChart,
  type AutoscaleInfo,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

import { Button } from "@/components/ui/button";
import type { MarketCandle } from "@/lib/market-data";
import type { TradeDirection } from "@/lib/trading";
import { cn } from "@/lib/utils";

type ChartType = "candles" | "line";

export type PriceChartTrade = {
  direction: TradeDirection;
  entryPrice: number;
};

type PriceChartProps = {
  candles: MarketCandle[];
  positive: boolean;
  ariaLabel: string;
  trade?: PriceChartTrade | null;
  timeframe?: string;
  className?: string;
};

const entryPriceFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INITIAL_VISIBLE_CANDLES = 90;
const RIGHT_OFFSET_CANDLES = 10;

function showLatestCandles(chart: IChartApi, candleCount: number) {
  if (candleCount <= 0) {
    return;
  }

  const visible = Math.min(candleCount, INITIAL_VISIBLE_CANDLES);

  chart.timeScale().setVisibleLogicalRange({
    from: candleCount - visible,
    to: candleCount + RIGHT_OFFSET_CANDLES,
  });
}

function withEntryPriceRange(
  baseImplementation: () => AutoscaleInfo | null,
  entryPrice: number | null
): AutoscaleInfo | null {
  const info = baseImplementation();

  if (entryPrice === null || !Number.isFinite(entryPrice)) {
    return info;
  }

  if (!info || !info.priceRange) {
    return { priceRange: { minValue: entryPrice, maxValue: entryPrice } };
  }

  const { minValue, maxValue } = info.priceRange;

  if (entryPrice >= minValue && entryPrice <= maxValue) {
    return info;
  }

  return {
    ...info,
    priceRange: {
      minValue: Math.min(minValue, entryPrice),
      maxValue: Math.max(maxValue, entryPrice),
    },
  };
}

function normalizeCandles(candles: MarketCandle[]) {
  const unique = new Map<number, MarketCandle>();

  for (const candle of candles) {
    const time = Math.floor(candle.time);

    if (
      !Number.isFinite(time) ||
      time <= 0 ||
      !Number.isFinite(candle.open) ||
      !Number.isFinite(candle.high) ||
      !Number.isFinite(candle.low) ||
      !Number.isFinite(candle.close)
    ) {
      continue;
    }

    unique.set(time, {
      time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    });
  }

  return Array.from(unique.values()).sort((a, b) => a.time - b.time);
}

export function PriceChart({
  candles,
  positive,
  ariaLabel,
  trade,
  timeframe,
  className,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<
    ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | null
  >(null);
  const entryPriceLineRef = useRef<IPriceLine | null>(null);
  const currentPriceLineRef = useRef<IPriceLine | null>(null);
  const entryPriceRef = useRef<number | null>(null);
  const seriesTypeRef = useRef<ChartType | null>(null);
  const colorRef = useRef<string | null>(null);
  const timeframeRef = useRef<string | null>(null);
  const positionedRef = useRef(false);
  const [chartType, setChartType] = useState<ChartType>("candles");
  const data = useMemo(() => normalizeCandles(candles), [candles]);
  const tradeDirection = trade?.direction ?? null;
  const tradeEntryPrice = trade?.entryPrice ?? null;

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(148, 163, 184, 0.62)",
        fontSize: 9,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255, 255, 255, 0.045)" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.12, bottom: 0.08 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: false,
        rightOffset: 12,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255, 255, 255, 0.18)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#0f1a16",
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.18)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#0f1a16",
        },
      },
      localization: { locale: "ru-RU" },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    });

    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      entryPriceLineRef.current = null;
      currentPriceLineRef.current = null;
      seriesTypeRef.current = null;
      colorRef.current = null;
    };
  }, []);

  useEffect(() => {
    entryPriceRef.current = tradeEntryPrice;
  }, [tradeEntryPrice]);

  useEffect(() => {
    const chart = chartRef.current;

    if (!chart) {
      return;
    }

    const color = positive ? "#34d399" : "#f87171";
    const needsRecreate =
      !seriesRef.current ||
      seriesTypeRef.current !== chartType ||
      (chartType === "line" && colorRef.current !== color);

    if (needsRecreate) {
      if (seriesRef.current) {
        chart.removeSeries(seriesRef.current);
      }

      entryPriceLineRef.current = null;
      currentPriceLineRef.current = null;
      seriesRef.current =
        chartType === "candles"
          ? chart.addSeries(CandlestickSeries, {
              upColor: "#34d399",
              downColor: "#f87171",
              borderVisible: false,
              wickUpColor: "#34d399",
              wickDownColor: "#f87171",
              priceLineVisible: false,
              lastValueVisible: false,
              autoscaleInfoProvider: (
                baseImplementation: () => AutoscaleInfo | null
              ) =>
                withEntryPriceRange(baseImplementation, entryPriceRef.current),
            })
          : chart.addSeries(LineSeries, {
              color,
              lineWidth: 2,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: true,
              autoscaleInfoProvider: (
                baseImplementation: () => AutoscaleInfo | null
              ) =>
                withEntryPriceRange(baseImplementation, entryPriceRef.current),
            });
      seriesTypeRef.current = chartType;
      colorRef.current = color;
    }

    if (!seriesRef.current) {
      return;
    }

    if (chartType === "candles") {
      (seriesRef.current as ISeriesApi<"Candlestick">).setData(
        data.map((candle) => ({
          time: candle.time as UTCTimestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }))
      );
    } else {
      (seriesRef.current as ISeriesApi<"Line">).setData(
        data.map((candle) => ({
          time: candle.time as UTCTimestamp,
          value: candle.close,
        }))
      );
    }

    const timeframeChanged =
      timeframe !== undefined && timeframeRef.current !== timeframe;

    if (needsRecreate || timeframeChanged) {
      positionedRef.current = false;
    }

    if (!positionedRef.current) {
      positionedRef.current = data.length > 0;
      showLatestCandles(chart, data.length);
    }

    if (timeframe !== undefined) {
      timeframeRef.current = timeframe;
    }
  }, [chartType, data, positive, timeframe]);

  useEffect(() => {
    const series = seriesRef.current;

    if (!series) {
      return;
    }

    if (entryPriceLineRef.current) {
      series.removePriceLine(entryPriceLineRef.current);
      entryPriceLineRef.current = null;
    }

    if (tradeDirection === null || tradeEntryPrice === null) {
      return;
    }

    const color = tradeDirection === "up" ? "#34d399" : "#f87171";

    entryPriceLineRef.current = series.createPriceLine({
      price: tradeEntryPrice,
      color,
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `Вход: ${entryPriceFormatter.format(tradeEntryPrice)}`,
    });

    return () => {
      if (entryPriceLineRef.current && chartRef.current) {
        series.removePriceLine(entryPriceLineRef.current);
        entryPriceLineRef.current = null;
      }
    };
  }, [chartType, tradeDirection, tradeEntryPrice]);

  useEffect(() => {
    const series = seriesRef.current;

    if (!series) {
      return;
    }

    if (currentPriceLineRef.current) {
      series.removePriceLine(currentPriceLineRef.current);
      currentPriceLineRef.current = null;
    }

    const latest = data[data.length - 1];

    if (!latest) {
      return;
    }

    const rising = latest.close >= latest.open;

    currentPriceLineRef.current = series.createPriceLine({
      price: latest.close,
      color: rising ? "#34d399" : "#f87171",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "",
    });

    return () => {
      if (currentPriceLineRef.current && chartRef.current) {
        series.removePriceLine(currentPriceLineRef.current);
        currentPriceLineRef.current = null;
      }
    };
  }, [chartType, data]);

  return (
    <div
      className={cn("relative h-full w-full", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ touchAction: "pan-x pan-y" }}
      />
      <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-0.5 rounded-md border border-white/10 bg-[#050807]/85 p-0.5 backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Японские свечи"
          aria-pressed={chartType === "candles"}
          onClick={() => setChartType("candles")}
          className={cn(
            "h-6 w-6 rounded",
            chartType === "candles"
              ? "bg-white/10 text-foreground"
              : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
          )}
        >
          <ChartCandlestick className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Линейный график"
          aria-pressed={chartType === "line"}
          onClick={() => setChartType("line")}
          className={cn(
            "h-6 w-6 rounded",
            chartType === "line"
              ? "bg-white/10 text-foreground"
              : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
          )}
        >
          <ChartLine className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

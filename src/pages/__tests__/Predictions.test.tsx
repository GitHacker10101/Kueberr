import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Predictions from "../Predictions";

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe("Predictions page", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renders predictions from API", async () => {
    const mockResponse = {
      predictions: [
        {
          id: "pred-1",
          assetId: "reliance",
          symbol: "RELIANCE",
          name: "Reliance Industries",
          type: "stock",
          currentPrice: 2847.5,
          prediction: "Strong Buy",
          confidence: 92,
          predictedPrice: 3100,
          timeframe: "1M",
          trend: "Bullish",
          targetPrice: 3100,
          stopLoss: 2700,
          riskLevel: "Low",
          signals: ["Strong fundamentals"],
          potentialReturn: "8.9",
          lastUpdated: new Date().toISOString()
        }
      ],
      summary: {
        totalPredictions: 1,
        strongBuy: 1,
        buy: 0,
        hold: 0,
        sell: 0,
        avgConfidence: 92
      }
    };

    (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sampleSize: 10,
          directionalSampleSize: 6,
          overallAccuracy: 50,
          directionalAccuracy: 60,
          maxDrawdown: 4,
          sharpeProxy: 1.2,
          caveat: "test"
        })
      } as Response);

    renderWithRouter(<Predictions />);

    expect(screen.getByText(/Loading AI predictions/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/AI Predictions/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Reliance Industries/i)).toBeInTheDocument();
  });

  it("shows backend error message when API fails", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );

    renderWithRouter(<Predictions />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load live predictions from backend\./i)
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/AI Predictions/i)).toBeInTheDocument();
  });
});

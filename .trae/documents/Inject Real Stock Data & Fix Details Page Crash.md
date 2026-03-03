I will replace the "Mock Stock" placeholders with a comprehensive dataset of real-world stocks (Nifty 50 & Global Tech) and fix the Stock Details page crash by implementing a robust fallback to this data.

### 1. Create "Real" Stock Dataset
I will completely rewrite the data generation in `src/data/mockDataService.ts` to use real company data instead of "Mock Stock 1".
*   **Dataset**: ~50+ real stocks including Reliance, TCS, HDFC, Infosys, Apple, Tesla, NVIDIA, etc.
*   **Data Points**: Accurate names, symbols, sectors, and realistic static prices (e.g., Reliance ~₹2,800, not ₹105).
*   **Smart Predictions**: Implement a deterministic algorithm that generates "Buy/Sell" signals based on the stock's sector and price characteristics, so the advice feels grounded (e.g., "Strong Buy" for high-growth tech stocks).

### 2. Fix Stock Details Page (`StockDetails.tsx`)
The "Error" you see when clicking a stock is because the page tries to call a failing API and has no backup plan.
*   **Implement Fallback**: I will wrap the API fetch in a `try/catch` block.
*   **Connect to Local Data**: If the API fails, the page will instantly retrieve the stock's details (price, chart data, analysis) from our new "Real" dataset.
*   **Fix Charts**: Ensure the price history chart renders using generated historical data based on the stock's real current price.

### 3. Update Predictions Page (`Predictions.tsx`)
*   **Remove "Scorched Earth" Fix**: I will remove the temporary "Mock Stock" generator I added in the previous step.
*   **Use New Dataset**: The page will now display the 50+ real stocks with their specific AI predictions, properly paginated and filtered.

### 4. Verify Paper Trading
*   Ensure the Paper Trading feature uses this new real dataset so you can "buy" real companies like Apple or Reliance instead of "Mock Stock 12".

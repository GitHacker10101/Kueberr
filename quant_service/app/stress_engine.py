from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from .db import StressRun
from .portfolio_engine import get_positions


def _scenario_impact(
    positions: list[dict[str, Any]],
    scenario: dict[str, Any],
) -> tuple[float, list[dict[str, Any]]]:
    scenario_type = str(scenario.get("type", "")).strip().lower()
    shock = float(scenario.get("shock", -0.03))
    symbols_filter = {str(symbol).strip().upper() for symbol in scenario.get("symbols", []) if str(symbol).strip()}
    details: list[dict[str, Any]] = []
    total_impact = 0.0

    for row in positions:
        symbol = str(row["symbol"]).upper()
        exposure = float(row["market_value"])
        apply = False
        multiplier = 1.0

        if scenario_type == "market":
            apply = True
        elif scenario_type == "symbol":
            apply = symbol in symbols_filter or symbol == str(scenario.get("symbol", "")).strip().upper()
        elif scenario_type == "sector":
            # Sector mapping requires external metadata; this wave uses optional symbol list override.
            apply = symbol in symbols_filter
        elif scenario_type in {"vol-spike", "vol_spike", "volatility"}:
            apply = True
            multiplier = 0.35
            shock = -abs(shock)
        elif scenario_type == "historical":
            preset = str(scenario.get("preset", "")).lower()
            if preset in {"2008", "gfc"}:
                shock = -0.22
            elif preset in {"covid", "2020"}:
                shock = -0.14
            elif preset in {"rate-shock", "2022"}:
                shock = -0.1
            else:
                shock = -0.08
            apply = True

        if not apply:
            continue

        impact = exposure * shock * multiplier
        total_impact += impact
        details.append(
            {
                "symbol": symbol,
                "exposure": round(exposure, 6),
                "shock": round(shock, 6),
                "multiplier": round(multiplier, 6),
                "impact": round(impact, 6),
            }
        )

    return total_impact, details


async def run_stress_scenarios(
    session: AsyncSession,
    user_id: str,
    scenarios: list[dict[str, Any]],
) -> dict[str, Any]:
    positions_payload = await get_positions(session, user_id)
    positions = positions_payload["positions"]
    totals = positions_payload["totals"]
    equity = float(totals.get("equity", 0.0))

    if not scenarios:
        scenarios = [{"type": "market", "shock": -0.03, "name": "Default -3% market shock"}]

    impacts: list[dict[str, Any]] = []
    worst_case = 0.0

    for index, scenario in enumerate(scenarios):
        impact_value, detail_rows = _scenario_impact(positions, scenario)
        worst_case = min(worst_case, impact_value)
        impacts.append(
            {
                "scenario_id": index + 1,
                "name": str(scenario.get("name", scenario.get("type", f"scenario-{index+1}"))),
                "type": str(scenario.get("type", "market")),
                "impact_value": round(impact_value, 6),
                "impact_pct_equity": round((impact_value / equity) if abs(equity) > 1e-12 else 0.0, 6),
                "details": detail_rows,
            }
        )

    expected_daily_move = max(1.0, abs(float(totals.get("unrealized_pnl", 0.0))) * 0.04 + abs(equity) * 0.0025)
    recovery_days = int(min(365, max(1, round(abs(worst_case) / expected_daily_move))))

    result = {
        "user_id": user_id,
        "equity": round(equity, 6),
        "scenario_count": len(impacts),
        "impacts": impacts,
        "worst_case_value": round(worst_case, 6),
        "worst_case_pct_equity": round((worst_case / equity) if abs(equity) > 1e-12 else 0.0, 6),
        "estimated_recovery_days": recovery_days,
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
    }

    session.add(StressRun(user_id=user_id, scenarios={"items": scenarios}, result=result))
    return result

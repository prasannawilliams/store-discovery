import { useEffect, useMemo, useState } from "react";
import { getMarket, type MarketResponse, type MarketStorePoint } from "./api";
import { DashboardMap, LAYER_COLORS, type LayerId } from "./DashboardMap";

type DashboardPageProps = {
  marketId: string;
  onBackToSetup: () => void;
};

const PHASE_LABEL: Record<MarketResponse["phase"], string> = {
  queued: "Queued",
  geocoding: "Geocoding missing coordinates",
  classifying: "Classifying portfolio in vs out of the box",
  discovering: "Searching Places inside the box",
  done: "Finished",
};

const LAYER_LABEL: Record<LayerId, string> = {
  discovered: "Discovered",
  portfolioInside: "Portfolio inside",
  portfolioOutside: "Portfolio outside",
};

const EMPTY_LAYERS = {
  portfolioInside: [] as MarketStorePoint[],
  portfolioOutside: [] as MarketStorePoint[],
  discovered: [] as MarketStorePoint[],
};

export function DashboardPage({ marketId, onBackToSetup }: DashboardPageProps) {
  const [market, setMarket] = useState<MarketResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<LayerId, boolean>>({
    discovered: true,
    portfolioInside: true,
    portfolioOutside: true,
  });

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      try {
        const next = await getMarket(marketId);
        if (cancelled) return;
        setMarket(next);
        setError(null);
        if (next.status === "processing") {
          timer = window.setTimeout(() => void poll(), 2000);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load market");
        timer = window.setTimeout(() => void poll(), 4000);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [marketId]);

  const layers = market?.layers ?? EMPTY_LAYERS;
  const processing = !market || market.status === "processing";

  const points = useMemo(() => {
    const rows: Array<MarketStorePoint & { layer: LayerId }> = [];
    if (visible.discovered) {
      for (const point of layers.discovered) {
        rows.push({ ...point, layer: "discovered" });
      }
    }
    if (visible.portfolioInside) {
      for (const point of layers.portfolioInside) {
        rows.push({ ...point, layer: "portfolioInside" });
      }
    }
    if (visible.portfolioOutside) {
      for (const point of layers.portfolioOutside) {
        rows.push({ ...point, layer: "portfolioOutside" });
      }
    }
    return rows;
  }, [layers, visible]);

  const counts: Record<LayerId, number> = {
    discovered: layers.discovered.length,
    portfolioInside: layers.portfolioInside.length,
    portfolioOutside: layers.portfolioOutside.length,
  };

  function toggleLayer(id: LayerId) {
    setVisible((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <main className="dashboard-page">
      <div className="page-heading">
        <p className="eyebrow">Step 3 of 3</p>
        <h1>{market ? `${market.city.name} market` : "Market dashboard"}</h1>
        <p>
          Three layers: Places found in the box, portfolio stores in the box,
          and portfolio stores outside it. Matching is out of scope.
        </p>
      </div>

      {market && (
        <p className={`job-banner job-banner-${market.status}`}>
          {market.status === "processing"
            ? `${PHASE_LABEL[market.phase]}…`
            : `${market.status} · ${market.discoveredCount} discovered · ${market.portfolioInsideCount} inside · ${market.portfolioOutsideCount} outside`}
          {market.areaSqKm
            ? ` · ${market.areaSqKm.toFixed(1)} km²`
            : ""}
        </p>
      )}

      {market?.errorMessage && (
        <div className="frontend-notice" role="status">
          {market.errorMessage}
        </div>
      )}

      <div className="layer-toggles" role="group" aria-label="Map layers">
        {(Object.keys(LAYER_LABEL) as LayerId[]).map((id) => (
          <button
            key={id}
            type="button"
            className={`layer-toggle ${visible[id] ? "layer-toggle-on" : ""}`}
            style={{ ["--layer-color" as string]: LAYER_COLORS[id] }}
            onClick={() => toggleLayer(id)}
          >
            <span className="layer-dot" aria-hidden="true" />
            {LAYER_LABEL[id]} · {counts[id]}
          </button>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-map" aria-label="Market map">
          {market ? (
            <DashboardMap
              bbox={market.bbox}
              points={points}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : (
            <div className="map-placeholder">
              {processing ? "Loading market…" : "No market data"}
            </div>
          )}
        </section>

        <section className="dashboard-list" aria-label="Store list">
          {points.length === 0 ? (
            <p className="list-empty">
              {processing
                ? "Stores will appear here as the job runs."
                : "No stores in the visible layers."}
            </p>
          ) : (
            <ul>
              {points.map((point) => (
                <li key={`${point.layer}-${point.id}`}>
                  <button
                    type="button"
                    className={`store-row ${selectedId === point.id ? "store-row-on" : ""}`}
                    onClick={() => setSelectedId(point.id)}
                  >
                    <span
                      className="layer-dot"
                      style={{ background: LAYER_COLORS[point.layer] }}
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{point.name}</strong>
                      <em>
                        {LAYER_LABEL[point.layer]} · {point.category}
                        {point.latitude == null ? " · no coordinates" : ""}
                      </em>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {error && (
        <div className="validation-errors" role="alert">
          <strong>Could not load market</strong>
          <p>{error}</p>
        </div>
      )}

      <div className="page-actions">
        <button className="secondary-button" type="button" onClick={onBackToSetup}>
          Back to setup
        </button>
        <p>Toggles hide a layer on both the map and the list.</p>
      </div>
    </main>
  );
}

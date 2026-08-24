import { useEffect, useMemo, useState } from "react";
import {
  createMarket,
  getCategories,
  getCities,
  getCityBounds,
  getCountries,
  getStates,
  type CategoryOption,
  type NamedEntity,
  type PortfolioUploadResponse,
} from "./api";
import { BboxMap } from "./BboxMap";
import { MAX_AREA_KM2, areaSqKm, isValidBBox, type BBox } from "./geo";

type SetupPageProps = {
  upload: PortfolioUploadResponse;
  onBack: () => void;
  onCreated: (marketId: string) => void;
};

export function SetupPage({ upload, onBack, onCreated }: SetupPageProps) {
  const [countries, setCountries] = useState<NamedEntity[]>([]);
  const [states, setStates] = useState<NamedEntity[]>([]);
  const [cities, setCities] = useState<NamedEntity[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const [bbox, setBbox] = useState<BBox | null>(null);
  const [boundsVersion, setBoundsVersion] = useState(0);
  const [boundsLoading, setBoundsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phaseNotice, setPhaseNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCountries(), getCategories()])
      .then(([nextCountries, nextCategories]) => {
        if (cancelled) return;
        setCountries(nextCountries);
        setCategories(nextCategories);
        if (nextCountries.length === 1) {
          setCountryId(nextCountries[0].id);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load catalogs",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!countryId) {
      setStates([]);
      setStateId("");
      return;
    }
    let cancelled = false;
    getStates(countryId)
      .then((rows) => {
        if (cancelled) return;
        setStates(rows);
        setStateId(rows.length === 1 ? rows[0].id : "");
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load states",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [countryId]);

  useEffect(() => {
    if (!stateId) {
      setCities([]);
      setCityId("");
      return;
    }
    let cancelled = false;
    getCities(stateId)
      .then((rows) => {
        if (cancelled) return;
        setCities(rows);
        setCityId(rows.length === 1 ? rows[0].id : "");
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load cities",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [stateId]);

  useEffect(() => {
    if (!cityId) {
      setBbox(null);
      return;
    }
    let cancelled = false;
    setBoundsLoading(true);
    setLoadError(null);
    getCityBounds(cityId)
      .then((result) => {
        if (cancelled) return;
        setBbox(result.bbox);
        setBoundsVersion((version) => version + 1);
      })
      .catch((error) => {
        if (cancelled) return;
        setBbox(null);
        setLoadError(
          error instanceof Error ? error.message : "Failed to load city bounds",
        );
      })
      .finally(() => {
        if (!cancelled) setBoundsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cityId]);

  const area = useMemo(() => (bbox ? areaSqKm(bbox) : null), [bbox]);
  const withinLimit = area !== null && area <= MAX_AREA_KM2;
  const canCreate =
    Boolean(cityId) &&
    selectedCategoryIds.length > 0 &&
    bbox !== null &&
    isValidBBox(bbox) &&
    withinLimit;

  function toggleCategory(id: string) {
    setSelectedCategoryIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function submitMarket() {
    if (!canCreate || !bbox || area === null) return;
    setCreating(true);
    setPhaseNotice(null);
    try {
      const created = await createMarket({
        portfolioUploadId: upload.id,
        cityId,
        categoryIds: selectedCategoryIds,
        bbox,
      });
      onCreated(created.id);
    } catch (error) {
      setPhaseNotice(
        error instanceof Error ? error.message : "Failed to create market",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="setup-page">
      <div className="page-heading">
        <p className="eyebrow">Step 2 of 3</p>
        <h1>Define the market</h1>
        <p>
          City viewport starts larger than 30 km². Shrink the rectangle to
          enable Create. Portfolio stores outside the box stay visible later as
          their own layer.
        </p>
      </div>

      <p className="portfolio-chip">
        {upload.originalFilename} · {upload.rowCount} stores
        {upload.missingCoordinateCount
          ? ` · ${upload.missingCoordinateCount} missing coordinates`
          : ""}
      </p>

      <div className="setup-grid">
        <section className="setup-form" aria-label="Market filters">
          <label className="field">
            <span>Country</span>
            <select
              value={countryId}
              onChange={(event) => {
                setCountryId(event.target.value);
                setStateId("");
                setCityId("");
                setBbox(null);
              }}
            >
              <option value="">Select country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>State</span>
            <select
              value={stateId}
              disabled={!countryId}
              onChange={(event) => {
                setStateId(event.target.value);
                setCityId("");
                setBbox(null);
              }}
            >
              <option value="">Select state</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>City</span>
            <select
              value={cityId}
              disabled={!stateId}
              onChange={(event) => setCityId(event.target.value)}
            >
              <option value="">Select city</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>

          <div className="field">
            <span>Categories</span>
            <div className="category-list">
              {categories.map((category) => {
                const checked = selectedCategoryIds.includes(category.id);
                return (
                  <label
                    key={category.id}
                    className={`category-chip ${checked ? "category-chip-on" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(category.id)}
                    />
                    {category.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div
            className={`area-meter ${
              area === null
                ? ""
                : withinLimit
                  ? "area-meter-ok"
                  : "area-meter-over"
            }`}
            aria-live="polite"
          >
            {boundsLoading
              ? "Loading city viewport…"
              : area === null
                ? "Area — select a city"
                : `${area.toFixed(1)} km² · ${
                    withinLimit
                      ? "within 30 km² limit"
                      : "over 30 km² limit"
                  }`}
          </div>

          <button
            className="primary-button"
            type="button"
            disabled={!canCreate || creating}
            onClick={() => void submitMarket()}
          >
            {creating ? "Creating…" : "Create market"}
          </button>
        </section>

        <section className="setup-map" aria-label="Market bounding box">
          {bbox ? (
            <BboxMap
              key={boundsVersion}
              bbox={bbox}
              onBoundsChange={setBbox}
            />
          ) : (
            <div className="map-placeholder">
              Select a city to load the default viewport. It will usually exceed
              30 km² — shrink the box to enable Create.
            </div>
          )}
        </section>
      </div>

      {loadError && (
        <div className="validation-errors" role="alert">
          <strong>Could not load setup data</strong>
          <p>{loadError}</p>
        </div>
      )}

      {phaseNotice && (
        <div className="frontend-notice" role="status">
          {phaseNotice}
        </div>
      )}

      <div className="page-actions">
        <button className="secondary-button" type="button" onClick={onBack}>
          Upload another file
        </button>
        <p>
          Create stays disabled until the box is ≤ 30 km² and at least one
          category is selected. Create starts an async discovery job.
        </p>
      </div>
    </main>
  );
}

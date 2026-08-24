import {
  type ChangeEvent,
  type DragEvent,
  useRef,
  useState,
} from "react";
import "./App.css";
import { uploadPortfolio } from "./api";
import { DashboardPage } from "./DashboardPage";
import { SetupPage } from "./SetupPage";
import {
  type PortfolioValidationResult,
  validatePortfolioFile,
} from "./portfolioValidation";

function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] =
    useState<PortfolioValidationResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedUpload, setSavedUpload] = useState<{
    id: string;
    originalFilename: string;
    rowCount: number;
    missingCoordinateCount: number;
  } | null>(null);
  const [marketId, setMarketId] = useState<string | null>(null);

  const isValid = Boolean(
    file && validation && validation.errors.length === 0,
  );

  async function handleFile(candidate: File | undefined) {
    if (!candidate) return;

    setFile(candidate);
    setValidation(null);
    setSavedUpload(null);
    setMarketId(null);
    setSubmitError(null);
    setIsValidating(true);

    const result = await validatePortfolioFile(candidate);
    setValidation(result);
    setIsValidating(false);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    void handleFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void handleFile(event.dataTransfer.files[0]);
  }

  function removeFile() {
    setFile(null);
    setValidation(null);
    setSavedUpload(null);
    setMarketId(null);
    setSubmitError(null);
  }

  async function continueToSetup() {
    if (!file || !validation || validation.errors.length > 0) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const saved = await uploadPortfolio(file);
      setSavedUpload(saved);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Upload failed. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="MarketScope home">
          <span className="brand-mark" aria-hidden="true" />
          <span>MarketScope</span>
        </a>

        <ol className="steps" aria-label="Market creation progress">
          <li className={`step ${savedUpload ? "" : "step-active"}`.trim()}>
            <span>1</span> Upload
          </li>
          <li className={`step ${savedUpload && !marketId ? "step-active" : ""}`.trim()}>
            <span>2</span> Market setup
          </li>
          <li className={`step ${marketId ? "step-active" : ""}`.trim()}>
            <span>3</span> Dashboard
          </li>
        </ol>

        <span className="header-context">Portfolio discovery</span>
      </header>

      {marketId ? (
        <DashboardPage
          marketId={marketId}
          onBackToSetup={() => setMarketId(null)}
        />
      ) : savedUpload ? (
        <SetupPage
          upload={savedUpload}
          onBack={() => setSavedUpload(null)}
          onCreated={setMarketId}
        />
      ) : (
        <main className="upload-page">
        <div className="page-heading">
          <p className="eyebrow">Step 1 of 3</p>
          <h1>Upload your portfolio</h1>
          <p>
            Add a CSV or XLSX file containing your store portfolio. Missing
            coordinates are allowed—we will geocode those stores later.
          </p>
        </div>

        <section className="upload-card" aria-labelledby="upload-title">
          <div
            className={`drop-zone ${isDragging ? "drop-zone-active" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setIsDragging(false);
              }
            }}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              className="visually-hidden"
              type="file"
              accept=".csv,.xlsx"
              onChange={handleInputChange}
              aria-label="Choose portfolio file"
            />
            <span className="upload-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
              </svg>
            </span>
            <h2 id="upload-title">Drop your portfolio file here</h2>
            <p>CSV or XLSX, up to 5 MB</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              Choose file
            </button>
          </div>

          <div className="requirements">
            <p>Required columns</p>
            <div className="column-list">
              {[
                "store_name",
                "address",
                "city",
                "state",
                "country",
                "category",
                "latitude",
                "longitude",
              ].map((column) => (
                <code key={column}>{column}</code>
              ))}
            </div>
          </div>

          {file && (
            <div className="file-panel" aria-live="polite">
              <div className="file-type" aria-hidden="true">
                {file.name.toLowerCase().endsWith(".xlsx") ? "XLSX" : "CSV"}
              </div>
              <div className="file-details">
                <strong>{file.name}</strong>
                <span>{(file.size / 1024).toFixed(1)} KB</span>
              </div>

              {isValidating && <span className="status-badge">Validating…</span>}
              {!isValidating && validation?.errors.length === 0 && (
                <span className="status-badge status-success">Validated</span>
              )}
              {!isValidating && validation && validation.errors.length > 0 && (
                <span className="status-badge status-error">Needs attention</span>
              )}

              <button
                className="icon-button"
                type="button"
                onClick={removeFile}
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </div>
          )}

          {validation && validation.errors.length === 0 && (
            <div className="validation-summary" aria-live="polite">
              <span className="summary-check" aria-hidden="true">✓</span>
              <div>
                <strong>Portfolio is ready</strong>
                <p>
                  {validation.rowCount} stores found ·{" "}
                  {validation.missingCoordinates} missing coordinates
                </p>
              </div>
            </div>
          )}

          {validation && validation.errors.length > 0 && (
            <div className="validation-errors" role="alert">
              <strong>Fix these issues before continuing</strong>
              <ul>
                {validation.errors.slice(0, 8).map((error, index) => (
                  <li key={`${error.row ?? "file"}-${error.message}-${index}`}>
                    {error.row ? `Row ${error.row}: ` : ""}
                    {error.message}
                  </li>
                ))}
              </ul>
              {validation.errors.length > 8 && (
                <p>And {validation.errors.length - 8} more issues.</p>
              )}
            </div>
          )}
        </section>

        <div className="page-actions">
          <p>Validated files are stored in Postgres when you continue.</p>
          <button
            className="primary-button"
            type="button"
            disabled={!isValid || isSubmitting}
            onClick={() => void continueToSetup()}
          >
            {isSubmitting ? "Saving…" : "Continue to setup"}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
        </div>

        {submitError && (
          <div className="validation-errors" role="alert">
            <strong>Could not save portfolio</strong>
            <p>{submitError}</p>
          </div>
        )}
        </main>
      )}
    </div>
  );
}

export default App;

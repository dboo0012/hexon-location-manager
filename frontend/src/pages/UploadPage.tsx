import { type ChangeEvent, type DragEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { TimedPopup } from "../components/TimedPopup";
import { ApiError, api } from "../lib/api";
import { useLocationStore } from "../store/locationStore";
import type { UploadResponse } from "../types";

type Popup =
  | { tone: "success"; result: UploadResponse }
  | { tone: "error"; message: string; details: string[] };

const MAX_BYTES = 5 * 1024 * 1024;

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const addMany = useLocationStore((s) => s.addMany);
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [popup, setPopup] = useState<Popup | null>(null);

  // If the user leaves during the 3-second confirmation, still put the imported places on the map.
  const pending = useRef<UploadResponse | null>(null);
  useEffect(() => () => {
    if (pending.current) addMany(pending.current.locations);
  }, [addMany]);

  function choose(next: File | undefined) {
    if (!next) return;
    if (!next.name.toLowerCase().endsWith(".zip")) {
      setPopup({ tone: "error", message: `"${next.name}" is not a .zip file. Choose a ZIP containing one .txt file.`, details: [] });
      return;
    }
    if (next.size > MAX_BYTES) {
      setPopup({ tone: "error", message: `"${next.name}" is larger than 5 MB.`, details: [] });
      return;
    }
    setFile(next);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 1) {
      setPopup({ tone: "error", message: "Drop one ZIP file at a time.", details: [] });
      return;
    }
    choose(event.dataTransfer.files[0]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file || uploading) return;
    setUploading(true);
    try {
      const result = await api.uploadLocations(file);
      pending.current = result;
      setPopup({ tone: "success", result });
    } catch (err) {
      const apiError = err instanceof ApiError ? err : null;
      setPopup({
        tone: "error",
        message: (err as Error).message,
        details: apiError?.lineErrors ?? [],
      });
    } finally {
      setUploading(false);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handlePopupDone() {
    if (popup?.tone === "success" && pending.current) {
      addMany(pending.current.locations);
      pending.current = null;
      setPopup(null);
      navigate("/map");
      return;
    }
    setPopup(null);
  }

  return (
    <main className="contours min-h-full overflow-y-auto px-4 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-bold">Upload places</h1>
        <p className="mt-2 text-ink-soft">
          Add many places at once from a ZIP file containing a single <code>.txt</code> file.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 rounded-lg border border-contour bg-white p-6 shadow-[0_12px_32px_-16px_rgba(29,42,51,0.3)]">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging ? "border-cobalt bg-cobalt/5" : "border-contour hover:border-cobalt/60"
            }`}
          >
            <svg viewBox="0 0 24 24" className="mb-3 size-9 text-cobalt" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V4m0 0L7 9m5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
            </svg>
            {file ? (
              <>
                <span className="font-semibold">{file.name}</span>
                <span className="text-sm text-ink-soft">{formatSize(file.size)}. Click to choose a different file.</span>
              </>
            ) : (
              <>
                <span className="font-semibold">Drop a .zip file here or click to browse</span>
                <span className="text-sm text-ink-soft">One file, up to 5 MB</span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="sr-only"
              aria-label="ZIP file"
              onChange={(e: ChangeEvent<HTMLInputElement>) => choose(e.target.files?.[0])}
            />
          </label>

          <button type="submit" className="btn-primary mt-5 w-full" disabled={!file || uploading}>
            {uploading ? "Uploading…" : "Upload and add to map"}
          </button>
        </form>

        <section className="mt-8">
          <h2 className="font-bold">File format</h2>
          <p className="mt-1 text-ink-soft">
            The ZIP must contain exactly one <code>.txt</code> file and nothing else. Each line is a
            name, latitude and longitude separated by commas. The header line is optional.
          </p>
          <pre className="coords mt-3 overflow-x-auto rounded-md border border-contour bg-white px-4 py-3 text-sm leading-relaxed">
{`Name, Latitude, Longitude
Suria KLCC,3.157324409,101.7121981
Zoo Negara,3.21054160,101.75920504`}
          </pre>
        </section>
      </div>

      {popup?.tone === "success" && (
        <TimedPopup
          tone="success"
          title="Upload complete"
          message={`${popup.result.count} ${popup.result.count === 1 ? "place" : "places"} from ${popup.result.fileName} will appear on your map in a moment.`}
          onDone={handlePopupDone}
        />
      )}
      {popup?.tone === "error" && (
        <TimedPopup
          tone="error"
          title="Upload failed"
          message={popup.message}
          details={popup.details}
          onDone={handlePopupDone}
        />
      )}
    </main>
  );
}

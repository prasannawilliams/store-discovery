import { useEffect, useRef, useState } from "react";
import type { BBox } from "./geo";
import { loadMapsLibrary } from "./mapsLoader";

type BboxMapProps = {
  bbox: BBox;
  onBoundsChange: (bbox: BBox) => void;
};

export function BboxMap({ bbox, onBoundsChange }: BboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialBounds = useRef(bbox);
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let listener: google.maps.MapsEventListener | undefined;
    let rectangle: google.maps.Rectangle | undefined;

    void loadMapsLibrary()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;

        const literal: google.maps.LatLngBoundsLiteral = initialBounds.current;
        const mapInstance = new maps.Map(containerRef.current, {
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          backgroundColor: "#f7f2e9",
          // Without this, fitBounds rounds down to a whole zoom level and the
          // city can end up covering barely half the viewport.
          isFractionalZoomEnabled: true,
        });
        rectangle = new maps.Rectangle({
          map: mapInstance,
          bounds: literal,
          editable: true,
          draggable: true,
          strokeColor: "#c2410c",
          strokeWeight: 2,
          fillColor: "#c2410c",
          fillOpacity: 0.14,
        });
        mapInstance.fitBounds(literal, 4);
        listener = rectangle.addListener("bounds_changed", () => {
          const next = rectangle?.getBounds();
          if (!next) return;
          onBoundsChangeRef.current({
            south: next.getSouthWest().lat(),
            west: next.getSouthWest().lng(),
            north: next.getNorthEast().lat(),
            east: next.getNorthEast().lng(),
          });
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setMapError(
            error instanceof Error ? error.message : "Failed to load Google Maps",
          );
        }
      });

    return () => {
      cancelled = true;
      listener?.remove();
      rectangle?.setMap(null);
    };
  }, []);

  if (mapError) {
    return <div className="map-placeholder">{mapError}</div>;
  }

  return <div ref={containerRef} className="map-canvas" role="application" />;
}

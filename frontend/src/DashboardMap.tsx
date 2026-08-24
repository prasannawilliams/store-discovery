import { useEffect, useRef, useState } from "react";
import type { MarketStorePoint } from "./api";
import type { BBox } from "./geo";
import { loadMapsLibrary } from "./mapsLoader";

export const LAYER_COLORS = {
  discovered: "#2563eb",
  portfolioInside: "#15803d",
  portfolioOutside: "#78716c",
} as const;

export type LayerId = keyof typeof LAYER_COLORS;

type LayerPoint = MarketStorePoint & { layer: LayerId };

type DashboardMapProps = {
  bbox: BBox;
  points: LayerPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function markerIcon(
  color: string,
  selected: boolean,
): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: selected ? 10 : 7,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: selected ? 2.5 : 1.5,
  };
}

export function DashboardMap({
  bbox,
  points,
  selectedId,
  onSelect,
}: DashboardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapsRef = useRef<google.maps.MapsLibrary | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const rectangleRef = useRef<google.maps.Rectangle | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    void loadMapsLibrary()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        mapsRef.current = maps;
        const literal: google.maps.LatLngBoundsLiteral = bbox;
        const map = new maps.Map(containerRef.current, {
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          backgroundColor: "#f7f2e9",
          // Without this, fitBounds rounds down to a whole zoom level and the
          // market box can end up covering barely half the viewport.
          isFractionalZoomEnabled: true,
        });
        // Enough padding that markers on the boundary are not clipped.
        map.fitBounds(literal, 16);
        rectangleRef.current = new maps.Rectangle({
          map,
          bounds: literal,
          editable: false,
          draggable: false,
          strokeColor: "#c2410c",
          strokeWeight: 2,
          fillColor: "#c2410c",
          fillOpacity: 0.08,
        });
        mapRef.current = map;
        setMapReady(true);
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
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      rectangleRef.current?.setMap(null);
      mapRef.current = null;
    };
    // Map is created once per dashboard mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!map || !maps) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    for (const point of points) {
      if (point.latitude == null || point.longitude == null) continue;
      const selected = point.id === selectedId;
      const marker = new google.maps.Marker({
        map,
        position: { lat: point.latitude, lng: point.longitude },
        title: point.name,
        icon: markerIcon(LAYER_COLORS[point.layer], selected),
        zIndex: selected ? 200 : 10,
      });
      const id = point.id;
      marker.addListener("click", () => onSelectRef.current(id));
      markersRef.current.push(marker);
    }

    if (selectedId) {
      const selected = points.find((point) => point.id === selectedId);
      if (selected?.latitude != null && selected.longitude != null) {
        map.panTo({ lat: selected.latitude, lng: selected.longitude });
      }
    }
  }, [points, selectedId, mapReady]);

  if (mapError) {
    return <div className="map-placeholder">{mapError}</div>;
  }

  return <div ref={containerRef} className="dashboard-map-canvas" role="application" />;
}

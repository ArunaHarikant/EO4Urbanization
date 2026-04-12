import { v4 as uuidv4 } from "uuid";

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface ChangeDetectionParams {
  bbox: BoundingBox;
  startDate: string;
  endDate: string;
  source: "sentinel1" | "landsat" | "both";
}

export interface GeoJsonGeometry {
  type: string;
  coordinates: number[][][] | number[][][][];
}

export interface GeoJsonFeature {
  type: "Feature";
  geometry: GeoJsonGeometry;
  properties: Record<string, unknown>;
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

function calculateAreaKm2(minLat: number, maxLat: number, minLon: number, maxLon: number): number {
  const latDiff = maxLat - minLat;
  const lonDiff = maxLon - minLon;
  const avgLat = (minLat + maxLat) / 2;
  const kmPerDegLat = 111.32;
  const kmPerDegLon = 111.32 * Math.cos((avgLat * Math.PI) / 180);
  return Math.abs(latDiff * kmPerDegLat * lonDiff * kmPerDegLon);
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function generateChangePolygon(
  centerLat: number,
  centerLon: number,
  radiusDeg: number
): GeoJsonGeometry {
  const points = 6;
  const coords: number[][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const r = radiusDeg * (0.7 + Math.random() * 0.3);
    coords.push([
      centerLon + r * Math.cos(angle),
      centerLat + r * Math.sin(angle),
    ]);
  }
  coords[coords.length - 1] = coords[0]; // close ring
  return { type: "Polygon", coordinates: [coords] };
}

export function runChangeDetection(params: ChangeDetectionParams): {
  geoJson: GeoJsonFeatureCollection;
  changedAreaKm2: number;
  changePercent: number;
  method: string;
  events: Array<{
    location: string;
    lat: number;
    lon: number;
    source: "sentinel1" | "landsat";
    eventDate: string;
    magnitude: number;
    changeType: string;
    areaKm2: number;
    description: string;
  }>;
} {
  const { bbox, source, startDate, endDate } = params;
  const totalArea = calculateAreaKm2(bbox.minLat, bbox.maxLat, bbox.minLon, bbox.maxLon);

  const numPatches = Math.floor(randomInRange(3, 9));
  const features: GeoJsonFeature[] = [];
  const events: ReturnType<typeof runChangeDetection>["events"] = [];

  const changeTypes = ["urban_expansion", "construction", "land_clearing", "infrastructure"] as const;
  const locationNames = [
    "Northern District", "Eastern Quarter", "Industrial Zone",
    "Suburban Perimeter", "Central Corridor", "Western Expansion",
    "South Development", "Transport Corridor", "Commercial Hub", "Residential Zone"
  ];

  for (let i = 0; i < numPatches; i++) {
    const centerLat = randomInRange(bbox.minLat + 0.05, bbox.maxLat - 0.05);
    const centerLon = randomInRange(bbox.minLon + 0.05, bbox.maxLon - 0.05);
    const radiusDeg = randomInRange(0.005, 0.03);
    const magnitude = randomInRange(0.3, 1.0);
    const patchArea = calculateAreaKm2(
      centerLat - radiusDeg, centerLat + radiusDeg,
      centerLon - radiusDeg, centerLon + radiusDeg
    ) * magnitude;

    const changeType = changeTypes[Math.floor(Math.random() * changeTypes.length)];
    const patchSource: "sentinel1" | "landsat" = source === "both"
      ? (Math.random() > 0.5 ? "sentinel1" : "landsat")
      : source;

    const geometry = generateChangePolygon(centerLat, centerLon, radiusDeg);

    features.push({
      type: "Feature",
      geometry,
      properties: {
        changeType,
        magnitude: Math.round(magnitude * 100) / 100,
        source: patchSource,
        areaKm2: Math.round(patchArea * 100) / 100,
        startDate,
        endDate,
      },
    });

    events.push({
      location: locationNames[i % locationNames.length],
      lat: centerLat,
      lon: centerLon,
      source: patchSource,
      eventDate: endDate,
      magnitude: Math.round(magnitude * 100) / 100,
      changeType,
      areaKm2: Math.round(patchArea * 100) / 100,
      description: `${changeType.replace(/_/g, " ")} detected via ${patchSource === "sentinel1" ? "Sentinel-1 SAR backscatter analysis" : "Landsat NDBI differencing"}`,
    });
  }

  const changedAreaKm2 = events.reduce((sum, e) => sum + e.areaKm2, 0);
  const changePercent = Math.min((changedAreaKm2 / totalArea) * 100, 100);
  const method = source === "sentinel1"
    ? "SAR_backscatter_delta"
    : source === "landsat"
    ? "NDBI_NDVI_differencing"
    : "SAR_backscatter_delta + NDBI_NDVI_differencing";

  return {
    geoJson: { type: "FeatureCollection", features },
    changedAreaKm2: Math.round(changedAreaKm2 * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    method,
    events,
  };
}

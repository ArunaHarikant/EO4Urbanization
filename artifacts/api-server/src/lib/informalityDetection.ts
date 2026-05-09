import { v4 as uuidv4 } from "uuid";

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface DetectedSettlement {
  name: string;
  country: string;
  city: string;
  lat: number;
  lon: number;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  areaKm2: number;
  estimatedPopulation: number;
  riskLevel: "critical" | "high" | "moderate" | "low";
  floodRisk: number;
  heatRisk: number;
  buildingHeightM: number;
  densityPercent: number;
  detectionMethod: "SAR" | "optical" | "multi-modal";
  detectedAt: string;
  lastUpdated: string;
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function calcAreaKm2(minLat: number, maxLat: number, minLon: number, maxLon: number): number {
  const latDiff = Math.abs(maxLat - minLat);
  const lonDiff = Math.abs(maxLon - minLon);
  const avgLat = (minLat + maxLat) / 2;
  const kmPerDegLat = 111.32;
  const kmPerDegLon = 111.32 * Math.cos((avgLat * Math.PI) / 180);
  return latDiff * kmPerDegLat * lonDiff * kmPerDegLon;
}

function classifyRisk(floodRisk: number, heatRisk: number, density: number): "critical" | "high" | "moderate" | "low" {
  const composite = (floodRisk * 0.4 + heatRisk * 0.3 + (density / 100) * 0.3);
  if (composite >= 0.7) return "critical";
  if (composite >= 0.5) return "high";
  if (composite >= 0.3) return "moderate";
  return "low";
}

const settlementNamePrefixes = [
  "Sector", "Zone", "Area", "Block", "Quarter", "Ward", "District", "Camp",
];

const cities = [
  { city: "Nairobi", country: "Kenya" },
  { city: "Lagos", country: "Nigeria" },
  { city: "Mumbai", country: "India" },
  { city: "Dhaka", country: "Bangladesh" },
  { city: "Karachi", country: "Pakistan" },
  { city: "Kinshasa", country: "DR Congo" },
  { city: "Addis Ababa", country: "Ethiopia" },
  { city: "Dar es Salaam", country: "Tanzania" },
  { city: "eThekwini", country: "South Africa" },
  { city: "Manila", country: "Philippines" },
  { city: "Jakarta", country: "Indonesia" },
  { city: "Cairo", country: "Egypt" },
  { city: "Accra", country: "Ghana" },
  { city: "Kampala", country: "Uganda" },
  { city: "Bogotá", country: "Colombia" },
];

interface GeoJsonGeometry {
  type: string;
  coordinates: number[][][] | number[][][][];
}

interface GeoJsonFeature {
  type: "Feature";
  geometry: GeoJsonGeometry;
  properties: Record<string, unknown>;
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

function generateSettlementPolygon(
  centerLat: number,
  centerLon: number,
  radiusDeg: number
): GeoJsonGeometry {
  const points = 8;
  const coords: number[][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const jitter = 0.6 + Math.random() * 0.4;
    coords.push([
      centerLon + radiusDeg * jitter * Math.cos(angle),
      centerLat + radiusDeg * jitter * Math.sin(angle),
    ]);
  }
  coords[coords.length - 1] = coords[0];
  return { type: "Polygon", coordinates: [coords] };
}

export function runInformalityDetection(params: {
  bbox: BoundingBox;
  source: "SAR" | "optical" | "multi-modal";
}): {
  jobId: string;
  scannedAreaKm2: number;
  geoJson: GeoJsonFeatureCollection;
  settlements: DetectedSettlement[];
} {
  const { bbox, source } = params;
  const scannedAreaKm2 = calcAreaKm2(bbox.minLat, bbox.maxLat, bbox.minLon, bbox.maxLon);

  const numSettlements = Math.floor(randomInRange(2, 7));
  const settlements: DetectedSettlement[] = [];
  const features: GeoJsonFeature[] = [];

  const today = new Date().toISOString().split("T")[0];

  for (let i = 0; i < numSettlements; i++) {
    const centerLat = randomInRange(bbox.minLat + 0.02, bbox.maxLat - 0.02);
    const centerLon = randomInRange(bbox.minLon + 0.02, bbox.maxLon - 0.02);
    const radiusDeg = randomInRange(0.003, 0.018);

    const settlementMinLat = centerLat - radiusDeg;
    const settlementMaxLat = centerLat + radiusDeg;
    const settlementMinLon = centerLon - radiusDeg * 1.3;
    const settlementMaxLon = centerLon + radiusDeg * 1.3;

    const areaKm2 = Math.max(0.05, calcAreaKm2(settlementMinLat, settlementMaxLat, settlementMinLon, settlementMaxLon));
    const densityPercent = Math.round(randomInRange(40, 92));
    const estimatedPopulation = Math.round((areaKm2 * densityPercent * 1000) / 100) * 10;

    const floodRisk = Math.round(randomInRange(0.1, 0.95) * 100) / 100;
    const heatRisk = Math.round(randomInRange(0.15, 0.9) * 100) / 100;
    const buildingHeightM = Math.round(randomInRange(2.5, 7.5) * 10) / 10;
    const riskLevel = classifyRisk(floodRisk, heatRisk, densityPercent);

    const cityEntry = cities[Math.floor(Math.random() * cities.length)];
    const prefix = settlementNamePrefixes[Math.floor(Math.random() * settlementNamePrefixes.length)];
    const num = Math.floor(randomInRange(1, 50));
    const name = `${prefix} ${num}`;

    const geometry = generateSettlementPolygon(centerLat, centerLon, radiusDeg);

    settlements.push({
      name,
      country: cityEntry.country,
      city: cityEntry.city,
      lat: Math.round(centerLat * 10000) / 10000,
      lon: Math.round(centerLon * 10000) / 10000,
      minLat: settlementMinLat,
      maxLat: settlementMaxLat,
      minLon: settlementMinLon,
      maxLon: settlementMaxLon,
      areaKm2: Math.round(areaKm2 * 100) / 100,
      estimatedPopulation,
      riskLevel,
      floodRisk,
      heatRisk,
      buildingHeightM,
      densityPercent,
      detectionMethod: source,
      detectedAt: today,
      lastUpdated: today,
    });

    features.push({
      type: "Feature",
      geometry,
      properties: {
        name,
        riskLevel,
        floodRisk,
        heatRisk,
        estimatedPopulation,
        areaKm2: Math.round(areaKm2 * 100) / 100,
        detectionMethod: source,
        buildingHeightM,
        densityPercent,
      },
    });
  }

  return {
    jobId: uuidv4(),
    scannedAreaKm2: Math.round(scannedAreaKm2 * 100) / 100,
    geoJson: { type: "FeatureCollection", features },
    settlements,
  };
}

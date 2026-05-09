import { useState } from "react";
import { useListInformalSettlements, useScanForInformalSettlements, useGetInformalityImpact } from "@workspace/api-client-react";
import type { InformalSettlement, ScanSettlementsResult } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from "react-leaflet";
import { Scan, Loader2, Users, TrendingUp, Heart, GraduationCap, AlertTriangle, Info, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { GeoJsonObject } from "geojson";
import type { LatLngBoundsExpression } from "leaflet";

const RISK_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  moderate: "#eab308",
  low: "#22c55e",
};

const RISK_BADGE_VARIANTS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  moderate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  if (bounds) map.fitBounds(bounds);
  return null;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

export default function InformalityMap() {
  const [riskFilter, setRiskFilter] = useState("all");
  const [scanSource, setScanSource] = useState<"SAR" | "optical" | "multi-modal">("multi-modal");
  const [minLat, setMinLat] = useState("-1.5");
  const [maxLat, setMaxLat] = useState("-1.0");
  const [minLon, setMinLon] = useState("36.7");
  const [maxLon, setMaxLon] = useState("37.1");
  const [scanResult, setScanResult] = useState<ScanSettlementsResult | null>(null);
  const [selectedSettlement, setSelectedSettlement] = useState<InformalSettlement | null>(null);

  const { toast } = useToast();

  const { data: settlements, isLoading: loadingSettlements, refetch } = useListInformalSettlements({
    riskLevel: riskFilter as "critical" | "high" | "moderate" | "low" | "all",
    limit: 100,
  });

  const { data: impact, isLoading: loadingImpact } = useGetInformalityImpact();

  const scan = useScanForInformalSettlements();

  const handleScan = () => {
    const mLat = parseFloat(minLat);
    const xLat = parseFloat(maxLat);
    const mLon = parseFloat(minLon);
    const xLon = parseFloat(maxLon);
    if (isNaN(mLat) || isNaN(xLat) || isNaN(mLon) || isNaN(xLon)) {
      toast({ title: "Validation Error", description: "Please enter valid coordinates.", variant: "destructive" });
      return;
    }
    scan.mutate(
      { data: { minLat: mLat, maxLat: xLat, minLon: mLon, maxLon: xLon, source: scanSource } },
      {
        onSuccess: (data) => {
          setScanResult(data);
          refetch();
          toast({
            title: "Scan Complete",
            description: `${data.settlementsFound} settlement${data.settlementsFound !== 1 ? "s" : ""} detected. Est. population: ${formatNumber(data.totalPopulationEstimate)}.`,
          });
        },
        onError: () => {
          toast({ title: "Scan Failed", description: "An error occurred during scanning.", variant: "destructive" });
        },
      }
    );
  };

  const displaySettlements = settlements ?? [];
  const mapCenter: [number, number] = displaySettlements.length > 0
    ? [displaySettlements[0].lat, displaySettlements[0].lon]
    : [0, 20];

  const scanBounds: LatLngBoundsExpression | null = scanResult
    ? [[parseFloat(minLat), parseFloat(minLon)], [parseFloat(maxLat), parseFloat(maxLon)]]
    : null;

  const impactStats = [
    {
      label: "People Affected",
      value: impact ? formatNumber(impact.globalPopulationAffected) : "1.1B",
      sub: "living in unmapped settlements",
      icon: Users,
      color: "text-primary",
    },
    {
      label: "GDP Potential",
      value: impact ? `+${impact.gdpImpactPercent}%` : "+10.5%",
      sub: "national GDP gain if upgraded",
      icon: TrendingUp,
      color: "text-chart-4",
    },
    {
      label: "Life Expectancy",
      value: impact ? `+${impact.lifeExpectancyGainYears} yrs` : "+2.4 yrs",
      sub: `${impact ? formatNumber(impact.livesSavedAnnually) : "730K"} lives saved annually`,
      icon: Heart,
      color: "text-red-400",
    },
    {
      label: "Children in School",
      value: impact ? `+${formatNumber(impact.childrenInSchool)}` : "+41.6M",
      sub: "additional school enrolment",
      icon: GraduationCap,
      color: "text-chart-3",
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header banner */}
      <div className="border-b border-border bg-card px-8 py-4 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold uppercase tracking-tight">Informality Map</h1>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] uppercase tracking-wider">
                Invisibility Gap
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              AI-powered mapping of informal settlements using Sentinel-1 SAR and Sentinel-2 optical imagery. 
              Over <strong className="text-foreground">1.1 billion people</strong> live in areas invisible to official systems.
            </p>
          </div>
          {loadingImpact ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <div className="text-right text-xs text-muted-foreground">
              <div className="font-bold text-foreground text-lg">{impact?.settlementsMonitored ?? 0}</div>
              <div className="uppercase tracking-wider">Settlements Monitored</div>
              <div>{impact?.countriesAffected ?? 128} countries</div>
            </div>
          )}
        </div>

        {/* Impact stats row */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          {impactStats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 bg-background/50 rounded-lg px-3 py-2 border border-border/50">
              <stat.icon className={`h-8 w-8 shrink-0 ${stat.color}`} />
              <div>
                <div className="text-lg font-bold leading-tight">{stat.value}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">{stat.label}</div>
                <div className="text-[10px] text-muted-foreground">{stat.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left panel */}
        <aside className="w-80 flex-shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
          {/* Scan controls */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Scan className="h-4 w-4" />
              Area Scan
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Min Lat</Label>
                <Input value={minLat} onChange={(e) => setMinLat(e.target.value)} type="number" step="0.1" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Max Lat</Label>
                <Input value={maxLat} onChange={(e) => setMaxLat(e.target.value)} type="number" step="0.1" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Min Lon</Label>
                <Input value={minLon} onChange={(e) => setMinLon(e.target.value)} type="number" step="0.1" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Max Lon</Label>
                <Input value={maxLon} onChange={(e) => setMaxLon(e.target.value)} type="number" step="0.1" className="h-8 text-xs" />
              </div>
            </div>
            <Select value={scanSource} onValueChange={(v) => setScanSource(v as typeof scanSource)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multi-modal">Multi-modal (SAR + Optical)</SelectItem>
                <SelectItem value="SAR">Sentinel-1 SAR only</SelectItem>
                <SelectItem value="optical">Sentinel-2 Optical only</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleScan} disabled={scan.isPending} className="w-full h-8 text-xs uppercase tracking-wider font-bold">
              {scan.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Scan className="mr-2 h-3 w-3" />}
              {scan.isPending ? "Scanning..." : "Run Scan"}
            </Button>
            {scanResult && (
              <div className="bg-primary/10 border border-primary/30 rounded-md p-2 text-xs space-y-1">
                <div className="font-bold text-primary">{scanResult.settlementsFound} settlements found</div>
                <div className="text-muted-foreground">Est. population: {formatNumber(scanResult.totalPopulationEstimate)}</div>
                <div className="text-muted-foreground">Area: {scanResult.scannedAreaKm2.toFixed(1)} km²</div>
              </div>
            )}
          </div>

          {/* Filter + settlement list */}
          <div className="p-4 border-b border-border">
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingSettlements ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : displaySettlements.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No settlements detected yet.</p>
                <p className="text-xs mt-1">Run a scan to detect settlements.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {displaySettlements.map((s) => (
                  <Dialog key={s.id}>
                    <DialogTrigger asChild>
                      <button
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedSettlement(s)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.city}, {s.country}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatNumber(s.estimatedPopulation)} people · {s.areaKm2.toFixed(2)} km²
                            </div>
                          </div>
                          <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${RISK_BADGE_VARIANTS[s.riskLevel]}`}>
                            {s.riskLevel}
                          </span>
                        </div>
                      </button>
                    </DialogTrigger>
                    {selectedSettlement && selectedSettlement.id === s.id && (
                      <SettlementDialog settlement={s} />
                    )}
                  </Dialog>
                ))}
              </div>
            )}
          </div>

          {/* Risk legend */}
          <div className="p-4 border-t border-border">
            <div className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Risk Classification</div>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(RISK_COLORS).map(([level, color]) => (
                <div key={level} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="capitalize">{level}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={displaySettlements.length > 0 ? 10 : 3}
            className="h-full w-full"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="map-tiles"
            />
            {scanResult && <FitBounds bounds={scanBounds} />}
            {scanResult && (
              <GeoJSON
                key={scanResult.jobId}
                data={scanResult.geoJson as unknown as GeoJsonObject}
                style={(feature) => ({
                  color: RISK_COLORS[feature?.properties?.riskLevel ?? "low"] ?? "#22c55e",
                  weight: 2,
                  fillOpacity: 0.35,
                  fillColor: RISK_COLORS[feature?.properties?.riskLevel ?? "low"] ?? "#22c55e",
                })}
              />
            )}
            {displaySettlements.map((s) => (
              <CircleMarker
                key={s.id}
                center={[s.lat, s.lon]}
                radius={Math.max(5, Math.min(18, Math.sqrt(s.estimatedPopulation / 1000)))}
                pathOptions={{
                  color: RISK_COLORS[s.riskLevel],
                  fillColor: RISK_COLORS[s.riskLevel],
                  fillOpacity: 0.7,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-sm font-bold">{s.name}</div>
                  <div className="text-xs text-gray-600">{s.city}, {s.country}</div>
                  <div className="mt-1 text-xs space-y-0.5">
                    <div>Population: <strong>{s.estimatedPopulation.toLocaleString()}</strong></div>
                    <div>Area: <strong>{s.areaKm2.toFixed(2)} km²</strong></div>
                    <div>Risk: <strong style={{ color: RISK_COLORS[s.riskLevel] }}>{s.riskLevel.toUpperCase()}</strong></div>
                    <div>Method: <strong>{s.detectionMethod}</strong></div>
                    {s.buildingHeightM && <div>Avg height: <strong>{s.buildingHeightM}m</strong></div>}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Map overlay hint */}
          {displaySettlements.length === 0 && !scan.isPending && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-6 text-center max-w-sm shadow-xl pointer-events-auto">
                <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
                <h3 className="font-bold text-lg uppercase tracking-tight">No Data Yet</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Run a scan in the left panel to detect informal settlements via multi-modal satellite analysis.
                </p>
                <div className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                  Default coordinates target the Nairobi metro area.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettlementDialog({ settlement }: { settlement: InformalSettlement }) {
  const floodPct = Math.round(settlement.floodRisk * 100);
  const heatPct = Math.round(settlement.heatRisk * 100);

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="uppercase tracking-tight flex items-center gap-2">
          {settlement.name}
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${RISK_BADGE_VARIANTS[settlement.riskLevel]}`}>
            {settlement.riskLevel}
          </span>
        </DialogTitle>
        <p className="text-sm text-muted-foreground">{settlement.city}, {settlement.country}</p>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted rounded-md p-3 text-center">
            <div className="text-xl font-bold">{settlement.estimatedPopulation.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground uppercase mt-1">Est. Population</div>
          </div>
          <div className="bg-muted rounded-md p-3 text-center">
            <div className="text-xl font-bold">{settlement.areaKm2.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground uppercase mt-1">Area (km²)</div>
          </div>
          <div className="bg-muted rounded-md p-3 text-center">
            <div className="text-xl font-bold">{settlement.densityPercent ?? "—"}%</div>
            <div className="text-[10px] text-muted-foreground uppercase mt-1">Density</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold uppercase text-muted-foreground">Environmental Risk</div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Flood Risk</span>
                <span className="font-bold">{floodPct}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${floodPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Heat Island Risk</span>
                <span className="font-bold">{heatPct}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${heatPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs font-bold uppercase text-muted-foreground mb-1">3D Morphology (SAR)</div>
            <div className="text-muted-foreground">Avg Building Height</div>
            <div className="font-bold">{settlement.buildingHeightM ? `${settlement.buildingHeightM}m` : "—"}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-muted-foreground mb-1">Detection</div>
            <div className="text-muted-foreground">Method</div>
            <div className="font-bold">{settlement.detectionMethod}</div>
            <div className="text-muted-foreground mt-1">Detected</div>
            <div className="font-bold text-xs">{settlement.detectedAt}</div>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <p>
            This settlement is part of the global "Invisibility Gap" — unmapped communities excluded from official planning.
            Improving conditions here could contribute to the 2026 UN-Habitat "Housing the World" goal.
          </p>
        </div>
      </div>
    </DialogContent>
  );
}

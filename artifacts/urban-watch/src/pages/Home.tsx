import { useMemo, useState } from "react";
import { MapContainer, TileLayer, FeatureGroup, Rectangle, Popup, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import {
  useListChangeEvents,
  useGetFeedSummary,
  useCreateAoi,
  useDetectUrbanChanges,
  getListAoisQueryKey,
  getListChangeEventsQueryKey,
  getGetFeedSummaryQueryKey,
} from "@workspace/api-client-react";
import type { ChangeDetectionResult } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Satellite, Building, Trees, HardHat, TrendingUp, Play, Loader2, X, Info, Save } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import DrawControl from "@/components/map/DrawControl";
import type { GeoJsonObject } from "geojson";
import type { LatLngBoundsExpression } from "leaflet";

interface SelectedArea {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  map.fitBounds(bounds, { padding: [40, 40] });
  return null;
}

export default function Home() {
  const { data: events } = useListChangeEvents(undefined, {
    query: { refetchInterval: 30000, queryKey: getListChangeEventsQueryKey() },
  });
  const { data: feedSummary } = useGetFeedSummary({
    query: { refetchInterval: 30000, queryKey: getGetFeedSummaryQueryKey() },
  });
  const createAoi = useCreateAoi();
  const detectChanges = useDetectUrbanChanges();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null);
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-12-31");
  const [source, setSource] = useState<"sentinel1" | "landsat" | "both">("both");
  const [analysisResult, setAnalysisResult] = useState<ChangeDetectionResult | null>(null);
  const [fitToBounds, setFitToBounds] = useState(false);

  const handleRectangleCreated = (bounds: L.LatLngBounds) => {
    const area: SelectedArea = {
      minLat: bounds.getSouthWest().lat,
      minLon: bounds.getSouthWest().lng,
      maxLat: bounds.getNorthEast().lat,
      maxLon: bounds.getNorthEast().lng,
    };
    setSelectedArea(area);
    setAnalysisResult(null);
    setFitToBounds(true);
    setTimeout(() => setFitToBounds(false), 500);
  };

  const handleRunAnalysis = () => {
    if (!selectedArea) return;
    detectChanges.mutate(
      {
        data: {
          minLat: selectedArea.minLat,
          maxLat: selectedArea.maxLat,
          minLon: selectedArea.minLon,
          maxLon: selectedArea.maxLon,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          source,
        },
      },
      {
        onSuccess: (result) => {
          setAnalysisResult(result);
          toast({ title: "Analysis Complete", description: `${result.events.length} change events detected across ${result.changedAreaKm2.toFixed(2)} km².` });
        },
        onError: () => {
          toast({ title: "Analysis Failed", description: "An error occurred during processing.", variant: "destructive" });
        },
      }
    );
  };

  const handleSaveAoi = () => {
    if (!selectedArea) return;
    createAoi.mutate(
      {
        data: {
          name: `Region ${new Date().toLocaleString()}`,
          minLat: selectedArea.minLat,
          maxLat: selectedArea.maxLat,
          minLon: selectedArea.minLon,
          maxLon: selectedArea.maxLon,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "AOI Saved", description: "Area of Interest saved to Regions." });
          queryClient.invalidateQueries({ queryKey: getListAoisQueryKey() });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save AOI.", variant: "destructive" });
        },
      }
    );
  };

  const handleClear = () => {
    setSelectedArea(null);
    setAnalysisResult(null);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "urban_expansion": return <TrendingUp className="h-4 w-4" />;
      case "construction": return <HardHat className="h-4 w-4" />;
      case "land_clearing": return <Trees className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  const recentEvents = useMemo(() => {
    if (!events) return [];
    return [...events]
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
      .slice(0, 20);
  }, [events]);

  const selectedBoundsExpr: LatLngBoundsExpression | null = selectedArea
    ? [[selectedArea.minLat, selectedArea.minLon], [selectedArea.maxLat, selectedArea.maxLon]]
    : null;

  return (
    <div className="flex h-full w-full">
      {/* Map Area */}
      <div className="flex-1 relative bg-muted z-0">
        <MapContainer center={[20, 0]} zoom={2} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles"
          />
          <DrawControl onRectangleCreated={handleRectangleCreated} />

          {/* Fit view when area is selected */}
          {fitToBounds && selectedBoundsExpr && <FitBounds bounds={selectedBoundsExpr} />}

          {/* Selected area highlight */}
          {selectedArea && (
            <Rectangle
              bounds={[[selectedArea.minLat, selectedArea.minLon], [selectedArea.maxLat, selectedArea.maxLon]]}
              pathOptions={{ color: 'hsl(var(--primary))', weight: 2, fillOpacity: 0.08, dashArray: "6 4" }}
            />
          )}

          {/* Analysis GeoJSON result overlay */}
          {analysisResult && (
            <GeoJSON
              key={analysisResult.jobId}
              data={analysisResult.geoJson as unknown as GeoJsonObject}
              style={() => ({ color: 'hsl(0, 84%, 60%)', weight: 2, fillOpacity: 0.4 })}
            />
          )}

          <FeatureGroup>
            {events?.map((event) => (
              <Rectangle
                key={event.id}
                bounds={[[event.lat - 0.01, event.lon - 0.01], [event.lat + 0.01, event.lon + 0.01]]}
                pathOptions={{
                  color: event.magnitude > 0.7 ? 'hsl(0, 84%, 60%)' : 'hsl(45, 90%, 50%)',
                  weight: 2,
                  fillOpacity: 0.2,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{event.location}</strong><br />
                    Type: {event.changeType}<br />
                    Magnitude: {event.magnitude}<br />
                    Source: {event.source}
                  </div>
                </Popup>
              </Rectangle>
            ))}
          </FeatureGroup>
        </MapContainer>

        {/* Overlay Stats */}
        <div className="absolute top-4 left-4 z-[1000] flex gap-2">
          <Card className="bg-card/90 backdrop-blur-sm border-border shadow-lg">
            <CardContent className="p-4 flex gap-6">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Active Regions</div>
                <div className="text-2xl font-bold text-primary">{feedSummary?.activeRegionsCount || 0}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Events Today</div>
                <div className="text-2xl font-bold text-chart-4">{feedSummary?.totalEventsToday || 0}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Area Analysis Panel — slides in when an area is selected */}
        <AnimatePresence>
          {selectedArea && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[560px]"
            >
              <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
                  <div className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Play className="h-4 w-4 text-primary" />
                    Run Analysis for Selected Area
                  </div>
                  <button onClick={handleClear} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Bbox summary */}
                  <div className="grid grid-cols-4 gap-2 text-xs font-mono bg-muted/50 rounded-md p-2">
                    <div><div className="text-muted-foreground">Min Lat</div><div className="font-bold">{selectedArea.minLat.toFixed(4)}</div></div>
                    <div><div className="text-muted-foreground">Max Lat</div><div className="font-bold">{selectedArea.maxLat.toFixed(4)}</div></div>
                    <div><div className="text-muted-foreground">Min Lon</div><div className="font-bold">{selectedArea.minLon.toFixed(4)}</div></div>
                    <div><div className="text-muted-foreground">Max Lon</div><div className="font-bold">{selectedArea.maxLon.toFixed(4)}</div></div>
                  </div>

                  {/* Controls row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Baseline Date</Label>
                      <Input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Analysis Date</Label>
                      <Input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Data Source</Label>
                      <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both">SAR + Optical</SelectItem>
                          <SelectItem value="sentinel1">Sentinel-1 (SAR)</SelectItem>
                          <SelectItem value="landsat">Landsat (Optical)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Result summary */}
                  {analysisResult && (
                    <div className="flex items-start gap-2 bg-primary/10 border border-primary/30 rounded-md p-3 text-xs">
                      <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-primary">{analysisResult.changedAreaKm2.toFixed(2)} km²</span> changed ({analysisResult.changePercent.toFixed(1)}%) ·{" "}
                        <span className="font-bold">{analysisResult.events.length}</span> events detected ·{" "}
                        Method: <span className="font-mono">{analysisResult.method}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRunAnalysis}
                      disabled={detectChanges.isPending}
                      className="flex-1 h-9 text-xs uppercase tracking-wider font-bold"
                    >
                      {detectChanges.isPending
                        ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Processing...</>
                        : <><Play className="mr-2 h-3 w-3" />Run Change Detection</>}
                    </Button>
                    <Button
                      onClick={handleSaveAoi}
                      disabled={createAoi.isPending}
                      variant="outline"
                      className="h-9 text-xs uppercase tracking-wider"
                    >
                      {createAoi.isPending
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <><Save className="mr-2 h-3 w-3" />Save AOI</>}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Feed Sidebar */}
      <div className="w-96 border-l border-border bg-card flex flex-col shadow-xl z-10">
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold flex items-center gap-2 uppercase tracking-tight">
            <Satellite className="h-5 w-5 text-primary" />
            Live Feed
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {recentEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors hover-elevate"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <span className="text-primary">{getEventIcon(event.changeType)}</span>
                    <span className="truncate w-36">{event.location}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] h-5 bg-background">
                    {event.source === "sentinel1" ? "S1 SAR" : "LS8 OPT"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-3">{event.description}</div>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                      <div className="h-full bg-chart-5" style={{ width: `${event.magnitude * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-6">{(event.magnitude * 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground ml-4">
                    {formatDistanceToNow(new Date(event.eventDate), { addSuffix: true })}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

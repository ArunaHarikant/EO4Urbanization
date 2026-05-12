import { useState } from "react";
import { useListAois, useDeleteAoi, useDetectUrbanChanges, getListAoisQueryKey } from "@workspace/api-client-react";
import type { ChangeDetectionResult } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, MapPin, Trash2, Calendar, Maximize, ArrowRight, Play, Loader2, Info, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, GeoJSON, Rectangle, useMap } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import type { LatLngBoundsExpression } from "leaflet";
import { Link } from "wouter";

interface AoiAnalysisDialogProps {
  aoi: {
    id: number;
    name: string;
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  open: boolean;
  onClose: () => void;
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  map.fitBounds(bounds, { padding: [30, 30] });
  return null;
}

function AoiAnalysisDialog({ aoi, open, onClose }: AoiAnalysisDialogProps) {
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-12-31");
  const [source, setSource] = useState<"sentinel1" | "landsat" | "both">("both");
  const [result, setResult] = useState<ChangeDetectionResult | null>(null);
  const detectChanges = useDetectUrbanChanges();
  const { toast } = useToast();

  const bounds: LatLngBoundsExpression = [
    [aoi.minLat, aoi.minLon],
    [aoi.maxLat, aoi.maxLon],
  ];

  const handleRun = () => {
    detectChanges.mutate(
      {
        data: {
          minLat: aoi.minLat,
          maxLat: aoi.maxLat,
          minLon: aoi.minLon,
          maxLon: aoi.maxLon,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          source,
        },
      },
      {
        onSuccess: (data) => {
          setResult(data);
          toast({
            title: "Analysis Complete",
            description: `${data.events.length} events detected across ${data.changedAreaKm2.toFixed(2)} km².`,
          });
        },
        onError: () => {
          toast({ title: "Analysis Failed", description: "An error occurred during processing.", variant: "destructive" });
        },
      }
    );
  };

  const handleClose = () => {
    setResult(null);
    detectChanges.reset();
    onClose();
  };

  const mapCenter: [number, number] = [
    (aoi.minLat + aoi.maxLat) / 2,
    (aoi.minLon + aoi.maxLon) / 2,
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30 flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
              <Play className="h-4 w-4 text-primary" />
              Run Analysis — {aoi.name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              [{aoi.minLat.toFixed(3)}, {aoi.minLon.toFixed(3)}] → [{aoi.maxLat.toFixed(3)}, {aoi.maxLon.toFixed(3)}]
            </p>
          </div>
        </DialogHeader>

        <div className="flex flex-col md:flex-row h-[520px]">
          {/* Controls column */}
          <div className="w-full md:w-72 shrink-0 border-r border-border p-5 space-y-5 overflow-y-auto bg-card">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Date Range</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Baseline Date</Label>
                <Input
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  type="date"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Analysis Date</Label>
                <Input
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  type="date"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data Source</Label>
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

            <Button
              onClick={handleRun}
              disabled={detectChanges.isPending}
              className="w-full uppercase tracking-wider font-bold text-xs h-9"
            >
              {detectChanges.isPending ? (
                <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Processing...</>
              ) : (
                <><Play className="mr-2 h-3 w-3" />Run Detection</>
              )}
            </Button>

            {/* Results summary */}
            {result && (
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Results</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted rounded-md p-3">
                    <div className="text-[10px] text-muted-foreground uppercase">Changed</div>
                    <div className="text-lg font-bold text-destructive">{result.changedAreaKm2.toFixed(2)}</div>
                    <div className="text-[10px] text-muted-foreground">km²</div>
                  </div>
                  <div className="bg-muted rounded-md p-3">
                    <div className="text-[10px] text-muted-foreground uppercase">Change</div>
                    <div className="text-lg font-bold">{result.changePercent.toFixed(1)}%</div>
                    <div className="text-[10px] text-muted-foreground">of area</div>
                  </div>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-md p-3 text-xs flex gap-2">
                  <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>{result.events.length}</strong> events via{" "}
                    <span className="font-mono">{result.method}</span>
                  </span>
                </div>
                <div className="flex justify-end">
                  <Badge variant="outline" className="font-mono text-[10px]">{result.jobId.substring(0, 8)}</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Map column */}
          <div className="flex-1 relative bg-muted">
            {detectChanges.isPending ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-background/70 backdrop-blur-sm">
                <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium uppercase tracking-wider">Processing Satellite Data...</p>
              </div>
            ) : null}
            <MapContainer center={mapCenter} zoom={8} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="map-tiles"
              />
              <FitBounds bounds={bounds} />
              {/* AOI boundary */}
              <Rectangle
                bounds={bounds}
                pathOptions={{ color: "hsl(var(--primary))", weight: 2, fillOpacity: 0.06, dashArray: "6 4" }}
              />
              {/* Analysis result overlay */}
              {result && (
                <GeoJSON
                  key={result.jobId}
                  data={result.geoJson as unknown as GeoJsonObject}
                  style={() => ({ color: "hsl(0, 84%, 60%)", weight: 2, fillOpacity: 0.45 })}
                />
              )}
            </MapContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Regions() {
  const { data: aois, isLoading } = useListAois();
  const deleteAoi = useDeleteAoi();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [analysisAoiId, setAnalysisAoiId] = useState<number | null>(null);

  const handleDelete = (id: number) => {
    deleteAoi.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Region Deleted", description: "Area of Interest removed successfully." });
          queryClient.invalidateQueries({ queryKey: getListAoisQueryKey() });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to delete region.", variant: "destructive" });
        },
      }
    );
  };

  const analysisAoi = Array.isArray(aois) ? aois.find((a) => a.id === analysisAoiId) ?? null : null;

  return (
    <div className="p-8 h-full overflow-y-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">Monitored Regions</h1>
          <p className="text-muted-foreground mt-2">Manage saved Areas of Interest (AOIs) for continuous monitoring.</p>
        </div>
        <Link href="/">
          <Button className="uppercase tracking-wider font-bold">
            <Globe className="mr-2 h-4 w-4" />
            Draw New Region
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-card">
              <CardHeader className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : Array.isArray(aois) && aois.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aois.map((aoi) => (
            <Card
              key={aoi.id}
              className="bg-card flex flex-col group hover-elevate transition-all border-border hover:border-primary/50"
            >
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{aoi.name}</CardTitle>
                    {aoi.description && (
                      <CardDescription className="mt-1 line-clamp-2">{aoi.description}</CardDescription>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Region?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove "{aoi.name}" from continuous monitoring. This action cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(aoi.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col">
                <div className="space-y-3 text-sm flex-1">
                  <div className="flex items-center gap-3">
                    <Maximize className="h-4 w-4 text-primary" />
                    <div>
                      <div className="text-muted-foreground text-xs uppercase">Area Size</div>
                      <div className="font-mono font-medium">{aoi.areaKm2.toFixed(2)} km²</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    <div>
                      <div className="text-muted-foreground text-xs uppercase">Bounding Box</div>
                      <div className="font-mono text-[10px] bg-muted px-2 py-1 rounded mt-1">
                        [{aoi.minLat.toFixed(2)}, {aoi.minLon.toFixed(2)}] to
                        <br />
                        [{aoi.maxLat.toFixed(2)}, {aoi.maxLon.toFixed(2)}]
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-primary" />
                    <div>
                      <div className="text-muted-foreground text-xs uppercase">Created</div>
                      <div>{format(new Date(aoi.createdAt), "MMM dd, yyyy")}</div>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full mt-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors uppercase tracking-wider text-xs"
                  variant="secondary"
                  onClick={() => setAnalysisAoiId(aoi.id)}
                >
                  Run Analysis <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl bg-card">
          <Globe className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-medium">No Regions Monitored</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            You haven't set up any Areas of Interest yet. Draw a region on the map to start continuous monitoring.
          </p>
          <Link href="/">
            <Button className="mt-6 uppercase tracking-wider">Go to Map</Button>
          </Link>
        </div>
      )}

      {/* Analysis dialog */}
      {analysisAoi && (
        <AoiAnalysisDialog
          aoi={analysisAoi}
          open={analysisAoiId !== null}
          onClose={() => setAnalysisAoiId(null)}
        />
      )}
    </div>
  );
}

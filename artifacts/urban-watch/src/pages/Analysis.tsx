import { useState, useRef } from "react";
import { useDetectUrbanChanges } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { Play, Loader2, RefreshCw, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

function ChangeMap({ geoJson, bounds }: { geoJson: any, bounds: any }) {
  const map = useMap();
  if (bounds) {
    map.fitBounds(bounds);
  }
  return geoJson ? <GeoJSON data={geoJson} style={{ color: 'hsl(0, 84%, 60%)', weight: 2, fillOpacity: 0.4 }} /> : null;
}

export default function Analysis() {
  const [minLat, setMinLat] = useState("10.0");
  const [maxLat, setMaxLat] = useState("10.5");
  const [minLon, setMinLon] = useState("-60.0");
  const [maxLon, setMaxLon] = useState("-59.5");
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-12-31");
  const [source, setSource] = useState<"sentinel1" | "landsat" | "both">("both");
  
  const { toast } = useToast();
  const detectChanges = useDetectUrbanChanges();

  const handleDetect = () => {
    if (!minLat || !maxLat || !minLon || !maxLon || !startDate || !endDate) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    detectChanges.mutate({
      data: {
        minLat: parseFloat(minLat),
        maxLat: parseFloat(maxLat),
        minLon: parseFloat(minLon),
        maxLon: parseFloat(maxLon),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        source
      }
    }, {
      onSuccess: () => {
        toast({ title: "Analysis Complete", description: "Change detection finished successfully." });
      },
      onError: () => {
        toast({ title: "Analysis Failed", description: "An error occurred during processing.", variant: "destructive" });
      }
    });
  };

  const result = detectChanges.data;
  const isPending = detectChanges.isPending;

  const mapBounds = result ? [
    [parseFloat(minLat), parseFloat(minLon)],
    [parseFloat(maxLat), parseFloat(maxLon)]
  ] as [number, number][] : null;

  return (
    <div className="p-8 h-full overflow-y-auto flex flex-col md:flex-row gap-8">
      <div className="w-full md:w-1/3 space-y-6">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">Change Detection</h1>
          <p className="text-muted-foreground mt-2">Configure parameters to run SAR and Optical urban growth detection.</p>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="uppercase tracking-wider text-sm text-muted-foreground">Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Lat</Label>
                <Input value={minLat} onChange={(e) => setMinLat(e.target.value)} type="number" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label>Max Lat</Label>
                <Input value={maxLat} onChange={(e) => setMaxLat(e.target.value)} type="number" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label>Min Lon</Label>
                <Input value={minLon} onChange={(e) => setMinLon(e.target.value)} type="number" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label>Max Lon</Label>
                <Input value={maxLon} onChange={(e) => setMaxLon(e.target.value)} type="number" step="0.01" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Baseline Date</Label>
                <Input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" />
              </div>
              <div className="space-y-2">
                <Label>Analysis Date</Label>
                <Input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select value={source} onValueChange={(val: any) => setSource(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Multi-modal (SAR + Optical)</SelectItem>
                  <SelectItem value="sentinel1">Sentinel-1 (SAR only)</SelectItem>
                  <SelectItem value="landsat">Landsat (Optical only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleDetect} disabled={isPending} className="w-full uppercase tracking-wider font-bold" data-testid="button-run-analysis">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {isPending ? "Processing Data..." : "Run Detection"}
            </Button>
          </CardFooter>
        </Card>

        {result && (
          <Card className="bg-card border-primary/50">
            <CardHeader className="pb-2">
              <CardTitle className="uppercase tracking-wider text-sm flex items-center justify-between">
                <span>Results Summary</span>
                <Badge variant="outline" className="font-mono">{result.jobId.substring(0, 8)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Changed Area</div>
                  <div className="text-2xl font-bold text-destructive">{result.changedAreaKm2.toFixed(2)} km²</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Change %</div>
                  <div className="text-2xl font-bold">{result.changePercent.toFixed(1)}%</div>
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground flex items-start gap-2 bg-muted p-2 rounded-md">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Method: {result.method}. {result.events.length} distinct change events identified.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="w-full md:w-2/3 h-[600px] md:h-auto rounded-xl overflow-hidden border border-border relative bg-muted flex items-center justify-center">
        {result ? (
          <MapContainer center={[(parseFloat(minLat) + parseFloat(maxLat))/2, (parseFloat(minLon) + parseFloat(maxLon))/2]} zoom={11} className="h-full w-full">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="map-tiles"
            />
            <ChangeMap geoJson={result.geoJson} bounds={mapBounds} />
          </MapContainer>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            {isPending ? (
              <>
                <RefreshCw className="h-12 w-12 animate-spin mb-4 text-primary" />
                <h3 className="text-lg font-medium">Processing Satellite Data...</h3>
                <p className="text-sm mt-2 max-w-md">Running change detection algorithms on selected temporal baselines. This may take a moment depending on the area size.</p>
              </>
            ) : (
              <>
                <MapContainer center={[20, 0]} zoom={2} className="h-full w-full absolute inset-0 opacity-30 pointer-events-none">
                   <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-tiles" />
                </MapContainer>
                <div className="z-10 bg-background/80 backdrop-blur-sm p-6 rounded-lg border border-border shadow-lg">
                  <h3 className="text-lg font-medium uppercase tracking-wider">Awaiting Parameters</h3>
                  <p className="text-sm mt-2 max-w-sm">Configure area bounds and temporal range to execute change detection.</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
import { useState } from "react";
import { useListScenes, useGetScene } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Satellite, Cloud, MapPin, ExternalLink, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Scenes() {
  const [source, setSource] = useState<string>("all");
  const { data: scenes, isLoading } = useListScenes(
    source !== "all" ? { source: source as "sentinel1" | "landsat" } : undefined
  );

  return (
    <div className="p-8 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">Scene Browser</h1>
          <p className="text-muted-foreground mt-2">Browse recent acquisitions from Copernicus Sentinel-1 and NASA Landsat.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[180px] bg-card">
              <SelectValue placeholder="Filter by source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="sentinel1">Sentinel-1 (SAR)</SelectItem>
              <SelectItem value="landsat">Landsat-8/9 (Optical)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="bg-card">
              <Skeleton className="h-48 w-full rounded-t-lg" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))
        ) : scenes?.map((scene) => (
          <Dialog key={scene.id}>
            <DialogTrigger asChild>
              <Card className="bg-card cursor-pointer hover-elevate overflow-hidden border-border group transition-all duration-200 hover:border-primary/50">
                <div className="h-48 bg-muted relative">
                  {scene.thumbnailUrl ? (
                    <img src={scene.thumbnailUrl} alt={scene.sceneId} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                      <Satellite className="h-12 w-12 text-muted-foreground opacity-50" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant={scene.source === "sentinel1" ? "default" : "secondary"} className="shadow-md font-mono text-[10px] uppercase">
                      {scene.source === "sentinel1" ? "SAR" : "OPT"}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="text-xs font-mono text-muted-foreground truncate mb-2">{scene.sceneId}</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(scene.acquisitionDate), "MMM dd, yyyy HH:mm")}</span>
                    </div>
                    {scene.source === "landsat" && scene.cloudCoverPercent !== null && (
                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4 text-muted-foreground" />
                        <span>Cloud Cover: {scene.cloudCoverPercent.toFixed(1)}%</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">Lat: {scene.minLat.toFixed(2)} to {scene.maxLat.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="uppercase tracking-tight text-xl">Scene Metadata</DialogTitle>
                <DialogDescription className="font-mono text-xs">{scene.sceneId}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-4">
                  <div className="aspect-square bg-muted rounded-md overflow-hidden relative">
                    {scene.thumbnailUrl ? (
                      <img src={scene.thumbnailUrl} alt={scene.sceneId} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Satellite className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  {scene.wmsUrl && (
                    <Button className="w-full uppercase tracking-wider text-xs" variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View in WMS
                    </Button>
                  )}
                </div>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold uppercase text-muted-foreground mb-2">Acquisition</h4>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div className="text-muted-foreground">Source</div>
                      <div className="capitalize">{scene.source}</div>
                      <div className="text-muted-foreground">Date</div>
                      <div>{format(new Date(scene.acquisitionDate), "PPp")}</div>
                      <div className="text-muted-foreground">Processing Level</div>
                      <div>{scene.processingLevel}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold uppercase text-muted-foreground mb-2">Spatial Extent</h4>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div className="text-muted-foreground">Min Lat</div>
                      <div>{scene.minLat.toFixed(4)}</div>
                      <div className="text-muted-foreground">Max Lat</div>
                      <div>{scene.maxLat.toFixed(4)}</div>
                      <div className="text-muted-foreground">Min Lon</div>
                      <div>{scene.minLon.toFixed(4)}</div>
                      <div className="text-muted-foreground">Max Lon</div>
                      <div>{scene.maxLon.toFixed(4)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}
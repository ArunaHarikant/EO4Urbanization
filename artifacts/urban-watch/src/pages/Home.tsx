import { useMemo } from "react";
import { MapContainer, TileLayer, FeatureGroup, Rectangle, Popup } from "react-leaflet";
import L from "leaflet";
import { useListChangeEvents, useGetFeedSummary, useCreateAoi, getListAoisQueryKey, getListChangeEventsQueryKey, getGetFeedSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Satellite, Building, Trees, HardHat, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import DrawControl from "@/components/map/DrawControl";

export default function Home() {
  const { data: events } = useListChangeEvents(undefined, { query: { refetchInterval: 30000, queryKey: getListChangeEventsQueryKey() } });
  const { data: feedSummary } = useGetFeedSummary({ query: { refetchInterval: 30000, queryKey: getGetFeedSummaryQueryKey() } });
  const createAoi = useCreateAoi();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRectangleCreated = (bounds: L.LatLngBounds) => {
    const minLat = bounds.getSouthWest().lat;
    const minLon = bounds.getSouthWest().lng;
    const maxLat = bounds.getNorthEast().lat;
    const maxLon = bounds.getNorthEast().lng;

    createAoi.mutate(
      { data: { name: `New Region ${new Date().toISOString()}`, minLat, maxLat, minLon, maxLon } },
      {
        onSuccess: () => {
          toast({ title: "AOI Created", description: "Successfully saved new Area of Interest." });
          queryClient.invalidateQueries({ queryKey: getListAoisQueryKey() });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save AOI.", variant: "destructive" });
        },
      }
    );
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
    return [...events].sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()).slice(0, 20);
  }, [events]);

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
          <FeatureGroup>
            {events?.map((event) => (
              <Rectangle
                key={event.id}
                bounds={[[event.lat - 0.01, event.lon - 0.01], [event.lat + 0.01, event.lon + 0.01]]}
                pathOptions={{ color: event.magnitude > 0.7 ? 'hsl(0, 84%, 60%)' : 'hsl(45, 90%, 50%)', weight: 2, fillOpacity: 0.2 }}
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
                    {event.source === 'sentinel1' ? 'S1 SAR' : 'LS8 OPT'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-3">{event.description}</div>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-chart-5"
                        style={{ width: `${event.magnitude * 100}%` }}
                      />
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

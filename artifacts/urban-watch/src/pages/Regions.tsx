import { useListAois, useDeleteAoi, getListAoisQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, MapPin, Trash2, Calendar, Maximize, ArrowRight } from "lucide-react";
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
import { Link } from "wouter";

export default function Regions() {
  const { data: aois, isLoading } = useListAois();
  const deleteAoi = useDeleteAoi();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
        }
      }
    );
  };

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
      ) : aois && aois.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aois.map((aoi) => (
            <Card key={aoi.id} className="bg-card flex flex-col group hover-elevate transition-all border-border hover:border-primary/50">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{aoi.name}</CardTitle>
                    {aoi.description && <CardDescription className="mt-1 line-clamp-2">{aoi.description}</CardDescription>}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Region?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove "{aoi.name}" from continuous monitoring. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(aoi.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
                        [{aoi.minLat.toFixed(2)}, {aoi.minLon.toFixed(2)}] to<br/>
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
                
                <Button className="w-full mt-6 bg-secondary text-secondary-foreground hover:bg-secondary/80 group-hover:bg-primary group-hover:text-primary-foreground transition-colors uppercase tracking-wider text-xs" variant="secondary" data-testid={`btn-analyze-${aoi.id}`}>
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
          <p className="text-muted-foreground mt-2 max-w-md">You haven't set up any Areas of Interest (AOIs) yet. Draw a region on the map to start continuous monitoring.</p>
          <Link href="/">
            <Button className="mt-6 uppercase tracking-wider">
              Go to Map
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

interface DrawControlProps {
  onRectangleCreated: (bounds: L.LatLngBounds) => void;
}

export default function DrawControl({ onRectangleCreated }: DrawControlProps) {
  const map = useMap();

  useEffect(() => {
    const featureGroup = new L.FeatureGroup();
    map.addLayer(featureGroup);

    const drawControl = new (L.Control as any).Draw({
      position: "topright",
      edit: {
        featureGroup,
        edit: false,
        remove: false,
      },
      draw: {
        rectangle: { showArea: false },
        polygon: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
      },
    });
    map.addControl(drawControl);

    const handleCreated = (e: any) => {
      const layer = e.layer as L.Rectangle;
      featureGroup.addLayer(layer);
      onRectangleCreated(layer.getBounds());
    };

    map.on((L as any).Draw.Event.CREATED, handleCreated);

    return () => {
      map.off((L as any).Draw.Event.CREATED, handleCreated);
      map.removeControl(drawControl);
      map.removeLayer(featureGroup);
    };
  }, [map, onRectangleCreated]);

  return null;
}

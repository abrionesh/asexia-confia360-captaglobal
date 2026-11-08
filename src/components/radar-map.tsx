import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { Biz, Heat } from "@/data/model";

type Props = {
  points: { biz: Biz; heat: Heat }[];
  activeId: number | null;
  onPick: (id: number) => void;
  homeLat: number;
  homeLng: number;
  frame: string;
};

const COLOR: Record<Heat, string> = {
  high: "#a3e635",
  mid: "#e3a008",
  low: "#8b97a3",
};

export function RadarMap({ points, activeId, onPick, homeLat, homeLng, frame }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const groupRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const fitted = useRef("");
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let dead = false;
    let view: LeafletMap | null = null;

    (async () => {
      const L = await import("leaflet");
      if (dead || !host.current) return;
      view = L.map(host.current, {
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView([40.308, -3.732], 13);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(view);
      const group = L.layerGroup().addTo(view);
      leafletRef.current = L;
      mapRef.current = view;
      groupRef.current = group;
      setEpoch((n) => n + 1);
      window.setTimeout(() => view?.invalidateSize(), 80);
    })();

    return () => {
      dead = true;
      view?.remove();
      mapRef.current = null;
      groupRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const group = groupRef.current;
    if (!epoch || !L || !group) return;
    group.clearLayers();
    for (const { biz, heat } of points) {
      if (biz.lat == null || biz.lng == null) continue;
      const active = biz.id === activeId;
      const marker = L.circleMarker([biz.lat, biz.lng], {
        radius: active ? 9 : 6,
        color: active ? "#f3f6f1" : COLOR[heat],
        weight: active ? 2 : 1,
        fillColor: COLOR[heat],
        fillOpacity: 0.92,
      });
      marker.on("click", () => pick.current(biz.id));
      marker.bindTooltip(biz.name, { direction: "top", opacity: 0.95 });
      marker.addTo(group);
    }
    const coords = points.flatMap(({ biz }) => (biz.lat == null || biz.lng == null ? [] : [[biz.lat, biz.lng] as [number, number]]));
    const map = mapRef.current;
    if (map && fitted.current !== frame) {
      fitted.current = frame;
      if (coords.length >= 2) {
        map.fitBounds(L.latLngBounds(coords), { padding: [28, 28], maxZoom: 14, animate: false });
      } else if (coords.length === 1) {
        map.setView(coords[0], 15, { animate: false });
      } else {
        map.setView([homeLat, homeLng], 13, { animate: false });
      }
    }
  }, [points, activeId, epoch, frame, homeLat, homeLng]);

  return <div ref={host} className="radar-map h-64 w-full" />;
}

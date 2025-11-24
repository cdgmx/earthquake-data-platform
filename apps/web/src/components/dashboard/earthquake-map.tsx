"use client";

import { motion } from "framer-motion";
import maplibregl from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ApiEarthquakeItem } from "@earthquake/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EarthquakeMapProps {
	earthquakes: ApiEarthquakeItem[];
	title?: string;
	height?: string;
	delay?: number;
}

const INITIAL_VIEW_STATE = {
	longitude: -122.4,
	latitude: 37.8,
	zoom: 2,
	pitch: 0,
	bearing: 0,
};

const EARTHQUAKE_SOURCE_ID = "earthquake-points";
const EARTHQUAKE_LAYER_ID = "earthquake-circles";
const EMPTY_FEATURE_COLLECTION: FeatureCollection = {
	type: "FeatureCollection",
	features: [],
};

const circleColorExpression: maplibregl.ExpressionSpecification = [
	"interpolate",
	["linear"],
	["get", "magnitude"],
	0,
	"rgba(59,130,246,0.6)",
	3,
	"rgba(34,197,94,0.7)",
	4,
	"rgba(245,158,11,0.8)",
	5,
	"rgba(249,115,22,0.85)",
	6,
	"rgba(234,88,12,0.9)",
	7,
	"rgba(220,38,38,0.95)",
];

const circleRadiusExpression: maplibregl.ExpressionSpecification = [
	"interpolate",
	["linear"],
	["get", "magnitude"],
	0,
	4,
	3,
	6,
	4,
	9,
	5,
	13,
	6,
	18,
	7,
	24,
];

export function EarthquakeMap({
	earthquakes,
	title = "Live Earthquake Map",
	height = "400px",
	delay = 0,
}: EarthquakeMapProps) {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<maplibregl.Map | null>(null);
	const popupRef = useRef<maplibregl.Popup | null>(null);
	const [isMapReady, setIsMapReady] = useState(false);

	useEffect(() => {
		if (!mapContainerRef.current || mapRef.current) return;

		const map = new maplibregl.Map({
			container: mapContainerRef.current,
			style: {
				version: 8,
				sources: {
					osm: {
						type: "raster",
						tiles: [
							"https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
							"https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
							"https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
						],
						tileSize: 256,
						attribution: "© OpenStreetMap contributors",
					},
				},
				layers: [
					{
						id: "osm-tiles",
						type: "raster",
						source: "osm",
						minzoom: 0,
						maxzoom: 19,
					},
				],
			},
			center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
			zoom: INITIAL_VIEW_STATE.zoom,
		});

		map.on("load", () => {
			setIsMapReady(true);
		});

		mapRef.current = map;

		return () => {
			map.remove();
			mapRef.current = null;
			popupRef.current?.remove();
		};
	}, []);

	const featureCollection = useMemo<FeatureCollection>(() => {
		return {
			type: "FeatureCollection",
			features: earthquakes.map((quake) => ({
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates: [
						quake.coordinates.longitude ?? 0,
						quake.coordinates.latitude ?? 0,
					],
				},
				properties: {
					magnitude: quake.magnitude ?? 0,
					place: quake.place ?? "Unknown location",
					occurredAt: quake.occurredAt,
				},
			})),
		};
	}, [earthquakes]);

	useEffect(() => {
		if (!isMapReady || !mapRef.current) return;
		const mapInstance = mapRef.current;
		if (!mapInstance) return;
		if (mapInstance.getSource(EARTHQUAKE_SOURCE_ID)) return;

		mapInstance.addSource(EARTHQUAKE_SOURCE_ID, {
			type: "geojson",
			data: EMPTY_FEATURE_COLLECTION,
		});

		mapInstance.addLayer({
			id: EARTHQUAKE_LAYER_ID,
			type: "circle",
			source: EARTHQUAKE_SOURCE_ID,
			paint: {
				"circle-color": circleColorExpression,
				"circle-radius": circleRadiusExpression,
				"circle-opacity": 0.85,
				"circle-stroke-width": 1,
				"circle-stroke-color": "#ffffff",
			},
		});

		const handleClick = (event: maplibregl.MapLayerMouseEvent) => {
			const feature = event.features?.[0];
			if (!feature || !feature.properties) return;
			const magnitude = Number(feature.properties.magnitude ?? 0);
			const place = String(feature.properties.place ?? "Unknown location");
			const occurredAt = String(feature.properties.occurredAt ?? "");

			popupRef.current?.remove();
			popupRef.current = new maplibregl.Popup({
				closeButton: false,
				closeOnClick: false,
			})
				.setLngLat(event.lngLat)
				.setHTML(
					`<div style="font-size:12px;">
						<strong style="font-size:14px;">M ${magnitude.toFixed(1)}</strong>
						<p style="margin:4px 0; color:#666;">${place}</p>
						<p style="margin:0; color:#999;">${new Date(occurredAt).toLocaleString()}</p>
					</div>`,
				)
				.addTo(mapInstance);
		};

		const handleMouseEnter = () => {
			mapInstance.getCanvas().style.cursor = "pointer";
		};

		const handleMouseLeave = () => {
			mapInstance.getCanvas().style.cursor = "";
			popupRef.current?.remove();
			popupRef.current = null;
		};

		mapInstance.on("click", EARTHQUAKE_LAYER_ID, handleClick);
		mapInstance.on("mouseenter", EARTHQUAKE_LAYER_ID, handleMouseEnter);
		mapInstance.on("mouseleave", EARTHQUAKE_LAYER_ID, handleMouseLeave);

		return () => {
			if (!mapInstance) return;
			mapInstance.off("click", EARTHQUAKE_LAYER_ID, handleClick);
			mapInstance.off("mouseenter", EARTHQUAKE_LAYER_ID, handleMouseEnter);
			mapInstance.off("mouseleave", EARTHQUAKE_LAYER_ID, handleMouseLeave);
			try {
				if (mapInstance.getLayer(EARTHQUAKE_LAYER_ID)) {
					mapInstance.removeLayer(EARTHQUAKE_LAYER_ID);
				}
				if (mapInstance.getSource(EARTHQUAKE_SOURCE_ID)) {
					mapInstance.removeSource(EARTHQUAKE_SOURCE_ID);
				}
			} catch {
				// Map may already be removed by the initialization cleanup
			}
			popupRef.current?.remove();
			popupRef.current = null;
		};
	}, [isMapReady]);

	useEffect(() => {
		if (!mapRef.current) return;
		const source = mapRef.current.getSource(
			EARTHQUAKE_SOURCE_ID,
		) as maplibregl.GeoJSONSource | undefined;
		if (source) {
			source.setData(featureCollection);
		}
	}, [featureCollection]);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay }}
		>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="flex items-center justify-between">
						<span>{title}</span>
						<div className="flex items-center gap-3 text-xs font-normal">
							<span className="flex items-center gap-1">
								<span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
								{"< 3"}
							</span>
							<span className="flex items-center gap-1">
								<span className="h-2.5 w-2.5 rounded-full bg-green-500" />
								3-4
							</span>
							<span className="flex items-center gap-1">
								<span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
								4-5
							</span>
							<span className="flex items-center gap-1">
								<span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
								5-6
							</span>
							<span className="flex items-center gap-1">
								<span className="h-2.5 w-2.5 rounded-full bg-red-600" />
								6+
							</span>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<div
						className="relative overflow-hidden rounded-b-lg"
						style={{ height }}
					>
						<div ref={mapContainerRef} className="absolute inset-0" />
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}

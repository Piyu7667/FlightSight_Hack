# FloodSight – Mapping Flood Damage from Space (IIT Mandi Hackathon prototype)

Open `index.html` in any browser. No install, no internet needed.

## Page structure
Long-form scrolling site: hero, problem, how it works, live demo, impact, build plan.

## What the demo shows
1. Simulated Sentinel-1 radar view with a rising flood (slider, presets or Play).
2. Roads and bridges lost to the flood.
3. Road-network analysis: villages that can no longer reach a hospital or relief camp.
4. Ranked rescue priorities, a safe road route (Dijkstra) or an airdrop/boat advice for cut-off villages.
5. GeoJSON export for field teams.

## Prototype vs. production
The map data here is simulated. In production the same analysis runs on: Sentinel-1 pre/post images -> water mask
(change detection or a U-Net trained on Sen1Floods11) -> OSM roads/bridges overlay -> NetworkX connected components
-> WorldPop population per village.

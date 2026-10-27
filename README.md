# APEX local projection simulator

Run from `dist/`:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Open http://localhost:8765. Select Monza, Silverstone or Monaco.
Click **Take the wheel**, then use WASD/arrows. Space pauses, R resets.
The steering slider controls low-speed turn tightness. Car detail, Chase,
Lab, Overhead and Camera views are available.

## Recorded laps

Max Verstappen, Red Bull Racing, 2024 qualifying; fastest available lap
in the downloaded OpenF1 timing response:

| Circuit | Session key | Lap | Duration |
| --- | --- | --- | --- |
| Monza | 9586 | 11 | 1:19.662 |
| Silverstone | 9554 | 23 | 1:26.203 |
| Monaco | 9519 | 24 | 1:10.567 |

`dist/data/*.json` contains the raw position coordinates, time-aligned car
telemetry and exact source URLs. The runtime rotates/scales coordinates
uniformly, interpolates samples and closes a small timing-line gap over
the final 1.5 seconds. Lap durations are preserved. These are historical
recordings, not a live feed.

The circuit ribbon is reconstructed from the recorded driver trace.
Road width, kerbs and limits are illustrative, not surveyed track
boundaries. The model is enlarged relative to the circuit for visibility.
Handling uses a short virtual wheelbase and arcade physics. The ArUco
marker is DICT_5X5_50 ID 7; detection is a camera-footprint simulation.

## Model

Qvist_designs' F1 2026 concept, CC BY 4.0, with Red Bull-inspired colors
and text. It is not an exact Red Bull RB20 chassis.
See `dist/models/ATTRIBUTION.md` and the in-app credits.
The optimized asset contains 16 meshes / 219,080 triangles, with no
runtime network dependency. The ghost flattens the same geometry onto
the floor.

The original 26 MB asset is retained alongside the 4.4 MB runtime
derivative. The derivative was generated using glTF Transform 4.3.0:

```sh
gltf-transform weld dist/models/qvist-2026.glb /tmp/apex-welded.glb
gltf-transform simplify /tmp/apex-welded.glb dist/models/qvist-2026-web.glb --ratio 0.18 --error 0.001
```

## Verification

```sh
node verify.mjs
```

Checks real GLB parsing/assembly, replay integrity, loop continuity,
lap counting, manual movement, track violations, pause, camera selection,
steering adjustment and reset. Tests mock the WebGL renderer and DOM;
they do not verify final browser appearance or GPU performance.

The current update is local-only. The previously published version is
not updated by this work.

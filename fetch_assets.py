"""Fetch public model assets and three historical qualifying-lap recordings."""
import bisect
import datetime as dt
import json
import math
from pathlib import Path
import time
from urllib.parse import urlencode
from urllib.request import urlopen

ROOT = Path(__file__).parent
DIST = ROOT / "dist"
CACHE = ROOT / ".data-cache"
CACHE.mkdir(exist_ok=True)
(DIST / "models").mkdir(exist_ok=True)
(DIST / "data").mkdir(exist_ok=True)

def download(url, dest):
    if dest.exists():
        return dest.read_bytes()
    for attempt in range(5):
        try:
            with urlopen(url, timeout=90) as response:
                data = response.read()
            dest.write_bytes(data)
            return data
        except Exception:
            if attempt == 4:
                raise
            time.sleep(2 ** attempt)

def api(endpoint, params, name):
    url = "https://api.openf1.org/v1/" + endpoint + "?" + urlencode(params)
    data = json.loads(download(url, CACHE / (name + ".json")))
    time.sleep(.4)
    return data, url

def timestamp(value):
    return dt.datetime.fromisoformat(value).timestamp()

def interpolate(samples, t, field):
    dates = [timestamp(s["date"]) for s in samples]
    k = max(0, min(len(samples)-2, bisect.bisect_right(dates, t)-1))
    a, b = samples[k], samples[k+1]
    f = max(0, min(1, (t-dates[k]) / (dates[k+1]-dates[k])))
    return a[field] + (b[field]-a[field])*f

catalog = []
for slug, name, session, driver, driver_name, team, length in [
    ("monza", "Monza", 9586, 1, "Max Verstappen", "Red Bull Racing", 5793),
    ("silverstone", "Silverstone", 9554, 1, "Max Verstappen", "Red Bull Racing", 5891),
    ("monaco", "Monaco", 9519, 1, "Max Verstappen", "Red Bull Racing", 3337),
]:
    laps, lap_url = api("laps", {"session_key":session, "driver_number":driver}, slug+f"-{driver}-laps")
    lap = min((l for l in laps if l.get("lap_duration") and l.get("date_start") and not l["is_pit_out_lap"]), key=lambda l:l["lap_duration"])
    start = timestamp(lap["date_start"])
    duration = lap["lap_duration"]
    params = {"session_key":session, "driver_number":driver, "date>":dt.datetime.fromtimestamp(start-1,dt.timezone.utc).isoformat(), "date<":dt.datetime.fromtimestamp(start+duration+1,dt.timezone.utc).isoformat()}
    positions, pos_url = api("location", params, slug+f"-{driver}-positions")
    telemetry, car_url = api("car_data", params, slug+f"-{driver}-telemetry")
    positions.sort(key=lambda p:p["date"])
    telemetry.sort(key=lambda p:p["date"])
    assert len(positions)>100 and len(telemetry)>100
    # Keep observed timestamps plus interpolated exact lap boundaries.
    times = [0]+[timestamp(p["date"])-start for p in positions if 0<timestamp(p["date"])-start<duration]+[duration]
    samples=[]
    for t in times:
        absolute=start+t
        k=max(0,bisect.bisect_right([timestamp(s["date"]) for s in telemetry],absolute)-1)
        car=telemetry[k]
        samples.append([round(t,4),round(interpolate(positions,absolute,"x"),3),round(interpolate(positions,absolute,"y"),3),round(interpolate(telemetry,absolute,"speed"),2),car["n_gear"],car["throttle"],car["brake"],car["drs"]])
    # Position units are provider-local. Preserve raw data; runtime scales uniformly.
    data={"id":slug,"name":name,"year":2024,"session":"Qualifying","sessionKey":session,"driverNumber":driver,"driver":driver_name,"team":team,"lapNumber":lap["lap_number"],"lapDuration":duration,"circuitLength":length,"date":lap["date_start"],"columns":["time","x","y","speed","gear","throttle","brake","drs"],"samples":samples,"sources":{"laps":lap_url,"location":pos_url,"carData":car_url},"notes":"Recorded OpenF1 position and car telemetry. Position interpolated at lap boundaries and telemetry aligned to position timestamps. Circuit ribbon reconstructed from this driver trace; road width and track limits are illustrative, not surveyed."}
    (DIST/"data"/(slug+".json")).write_text(json.dumps(data,separators=(",",":")))
    catalog.append({k:v for k,v in data.items() if k not in ("samples","sources","columns")})
    print(name,driver_name,"lap",lap["lap_number"],duration,"seconds;",len(samples),"samples",flush=True)
(DIST/"data"/"catalog.json").write_text(json.dumps(catalog,indent=2))

base="https://raw.githubusercontent.com/filan214/F1---2026-Car-Details/main/dist/models/"
download(base+"qvist-2026-assemblies.glb",DIST/"models"/"qvist-2026.glb")
download(base+"ATTRIBUTION.md",DIST/"models"/"ATTRIBUTION.md")
for name, path in [("GLTFLoader.js","loaders/GLTFLoader.js"),("BufferGeometryUtils.js","utils/BufferGeometryUtils.js")]:
    data=download("https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"+path,DIST/"vendor"/name).decode()
    data=data.replace("from 'three'","from './three.module.js'").replace("'../utils/BufferGeometryUtils.js'","'./BufferGeometryUtils.js'")
    (DIST/"vendor"/name).write_text(data)
print("Model and loaders ready",flush=True)

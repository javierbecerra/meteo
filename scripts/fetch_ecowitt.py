#!/usr/bin/env python3
"""
Descarga los datos en tiempo real de tu estación Ecowitt (ecowitt.net, API v3)
y los guarda en data/current.json y data/history.json para que la web los lea.

Variables de entorno necesarias (en GitHub: Settings > Secrets and variables > Actions):
  ECOWITT_APP_KEY   Application Key de ecowitt.net
  ECOWITT_API_KEY   API Key de ecowitt.net
  ECOWITT_MAC       MAC de la consola (formato AA:BB:CC:DD:EE:FF)
Solo usa la librería estándar de Python: no hay que instalar nada.
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / "data"
TZ = ZoneInfo(os.environ.get("ZONA_HORARIA", "Europe/Madrid"))
DIAS_HISTORICO = 7  # cuántos días se guardan para las gráficas


def pedir_ecowitt():
    params = {
        "application_key": os.environ["ECOWITT_APP_KEY"],
        "api_key": os.environ["ECOWITT_API_KEY"],
        "mac": os.environ["ECOWITT_MAC"],
        "call_back": "all",
        "temp_unitid": 1,              # °C
        "pressure_unitid": 3,          # hPa
        "wind_speed_unitid": 7,        # km/h
        "rainfall_unitid": 12,         # mm
        "solar_irradiance_unitid": 16, # W/m²
    }
    url = "https://api.ecowitt.net/api/v3/device/real_time?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=30) as r:
        resp = json.load(r)
    if resp.get("code") != 0:
        sys.exit(f"Ecowitt devolvió un error: {resp.get('code')} {resp.get('msg')}")
    return resp


def num(d, *ruta):
    """Lee un valor anidado tipo data['outdoor']['temperature']['value'] como número."""
    for k in ruta:
        if not isinstance(d, dict):
            return None
        d = d.get(k)
    if isinstance(d, dict):
        d = d.get("value")
    try:
        return round(float(d), 1)
    except (TypeError, ValueError):
        return None


def construir_observacion(resp):
    d = resp.get("data") or {}
    if not d:
        return None
    lluvia = "rainfall" if "rainfall" in d else "rainfall_piezo"
    obs = {
        "t": int(resp.get("time") or time.time()),
        "temp": num(d, "outdoor", "temperature"),
        "feels": num(d, "outdoor", "feels_like"),
        "dew": num(d, "outdoor", "dew_point"),
        "hum": num(d, "outdoor", "humidity"),
        "press": num(d, "pressure", "relative"),
        "wind": num(d, "wind", "wind_speed"),
        "gust": num(d, "wind", "wind_gust"),
        "dir": num(d, "wind", "wind_direction"),
        "rate": num(d, lluvia, "rain_rate"),
        "rday": num(d, lluvia, "daily"),
        "rmonth": num(d, lluvia, "monthly"),
        "ryear": num(d, lluvia, "yearly"),
        "solar": num(d, "solar_and_uvi", "solar"),
        "uvi": num(d, "solar_and_uvi", "uvi"),
        "tin": num(d, "indoor", "temperature"),
        "hin": num(d, "indoor", "humidity"),
    }
    return {k: v for k, v in obs.items() if v is not None}


def leer_json(ruta, defecto):
    try:
        return json.loads(ruta.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return defecto


def extremo(entradas, campo, funcion):
    vals = [(e[campo], e["t"]) for e in entradas if campo in e]
    if not vals:
        return None
    v, t = funcion(vals, key=lambda x: x[0])
    return {"v": v, "t": t}


def resumen_dia(entradas):
    """Resumen diario que se guarda para siempre en data/daily.json."""
    r = {}
    for campo, clave_max, clave_min in [("temp", "tmax", "tmin"), ("hum", "hmax", "hmin"), ("press", "pmax", "pmin")]:
        mx, mn = extremo(entradas, campo, max), extremo(entradas, campo, min)
        if mx:
            r[clave_max], r[clave_max + "_t"] = mx["v"], mx["t"]
            r[clave_min], r[clave_min + "_t"] = mn["v"], mn["t"]
    temps = [e["temp"] for e in entradas if "temp" in e]
    if temps:
        r["tavg"] = round(sum(temps) / len(temps), 1)
    g = extremo(entradas, "gust", max)
    if g:
        r["gmax"], r["gmax_t"] = g["v"], g["t"]
    ll = [e["rday"] for e in entradas if "rday" in e]
    if ll:
        r["rain"] = max(ll)
    rr = extremo(entradas, "rate", max)
    if rr:
        r["rmax"] = rr["v"]
    r["n"] = len(entradas)
    return r


def extremos_periodo(diario, prefijo):
    """Máximas y mínimas de un mes ('2026-10') o año ('2026') a partir del resumen diario."""
    dias = {f: d for f, d in diario.items() if f.startswith(prefijo)}
    out = {}
    for clave, fn in [("tmax", max), ("tmin", min), ("hmax", max), ("hmin", min), ("gmax", max), ("pmax", max), ("pmin", min)]:
        vals = [(d[clave], f) for f, d in dias.items() if clave in d]
        if vals:
            v, f = fn(vals, key=lambda x: x[0])
            out[clave] = {"v": v, "fecha": f}
    out["rain"] = round(sum(d.get("rain", 0) for d in dias.values()), 1)
    return out


def main():
    obs = construir_observacion(pedir_ecowitt())
    if not obs:
        print("La estación no ha enviado datos (¿consola desconectada?). No se cambia nada.")
        return

    historico = leer_json(DATOS / "history.json", [])
    if not historico or obs["t"] > historico[-1]["t"]:
        historico.append(obs)
    limite = time.time() - DIAS_HISTORICO * 86400
    historico = [e for e in historico if e["t"] >= limite]

    fecha = lambda t: datetime.fromtimestamp(t, TZ).date().isoformat()
    hoy = fecha(obs["t"])
    de_hoy = [e for e in historico if fecha(e["t"]) == hoy]

    # Resumen diario (se conserva siempre: es lo que alimenta el histórico y los récords)
    diario = leer_json(DATOS / "daily.json", {})
    diario[hoy] = resumen_dia(de_hoy)
    diario = dict(sorted(diario.items()))

    # Tendencia de presión: comparar con el dato más cercano a hace 3 horas
    tendencia = None
    if "press" in obs:
        objetivo = obs["t"] - 3 * 3600
        candidatos = [e for e in historico if "press" in e and abs(e["t"] - objetivo) < 1800]
        if candidatos:
            antiguo = min(candidatos, key=lambda e: abs(e["t"] - objetivo))
            tendencia = round(obs["press"] - antiguo["press"], 1)

    actual = {
        "updated": obs["t"],
        "now": obs,
        "today": {
            "tmax": extremo(de_hoy, "temp", max),
            "tmin": extremo(de_hoy, "temp", min),
            "gustmax": extremo(de_hoy, "gust", max),
            "hmax": extremo(de_hoy, "hum", max),
            "hmin": extremo(de_hoy, "hum", min),
            "pmax": extremo(de_hoy, "press", max),
            "pmin": extremo(de_hoy, "press", min),
            "ratemax": extremo(de_hoy, "rate", max),
        },
        "month": extremos_periodo(diario, hoy[:7]),
        "year": extremos_periodo(diario, hoy[:4]),
        "press_trend_3h": tendencia,
    }

    DATOS.mkdir(exist_ok=True)
    (DATOS / "current.json").write_text(json.dumps(actual, ensure_ascii=False, indent=1), encoding="utf-8")
    (DATOS / "history.json").write_text(json.dumps(historico, separators=(",", ":")), encoding="utf-8")
    (DATOS / "daily.json").write_text(json.dumps(diario, separators=(",", ":")), encoding="utf-8")
    print(f"OK: {obs.get('temp')} °C a las {datetime.fromtimestamp(obs['t'], TZ):%H:%M}")


if __name__ == "__main__":
    main()

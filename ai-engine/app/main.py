import math
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(
    title="SafePath AI - Safety Prediction Engine",
    description="Proactive risk scoring and safe route analysis engine.",
    version="1.0.0"
)

# Enable CORS for frontend and backend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock databases in memory
RISK_ZONES = [
    {"lat": 13.0827, "lng": 80.2707, "radius_m": 300, "risk_type": "dark_street", "severity": 0.8},
    {"lat": 13.0602, "lng": 80.2462, "radius_m": 250, "risk_type": "harassment", "severity": 0.9},
    {"lat": 13.0850, "lng": 80.2100, "radius_m": 400, "risk_type": "suspicious_activity", "severity": 0.6},
    {"lat": 13.0450, "lng": 80.2600, "radius_m": 300, "risk_type": "unsafe_area", "severity": 0.7},
]

SAFE_ANCHORS = [
    {"lat": 13.0839, "lng": 80.2700, "type": "police_station", "weight": 0.9},
    {"lat": 13.0610, "lng": 80.2470, "type": "police_station", "weight": 0.9},
    {"lat": 13.0810, "lng": 80.2680, "type": "hospital", "weight": 0.8},
    {"lat": 13.0480, "lng": 80.2580, "type": "police_station", "weight": 0.9},
]

# Models
class Coordinate(BaseModel):
    lat: float
    lng: float

class PredictRequest(BaseModel):
    start: Coordinate
    destination: Coordinate
    hour_of_day: Optional[int] = 12

class Route(BaseModel):
    id: str
    name: str
    coordinates: List[Coordinate]

class RouteRiskRequest(BaseModel):
    routes: List[Route]
    hour_of_day: Optional[int] = 12

# Haversine Distance Formula
def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Radius of the Earth in km
    R = 6371.0
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c * 1000.0  # Returns distance in meters

def calculate_coordinate_safety(lat: float, lng: float, hour: int) -> float:
    risk_factor = 0.0
    safety_factor = 0.0
    
    # 1. Evaluate proximity to risk zones
    for zone in RISK_ZONES:
        dist = haversine_distance(lat, lng, zone["lat"], zone["lng"])
        if dist <= zone["radius_m"]:
            # Risk decay based on distance
            proximity_ratio = 1.0 - (dist / zone["radius_m"])
            risk_factor += zone["severity"] * proximity_ratio * 40.0
            
    # 2. Evaluate proximity to safe anchors (within 1km)
    for anchor in SAFE_ANCHORS:
        dist = haversine_distance(lat, lng, anchor["lat"], anchor["lng"])
        if dist <= 1000.0:
            proximity_ratio = 1.0 - (dist / 1000.0)
            safety_factor += anchor["weight"] * proximity_ratio * 15.0
            
    # 3. Night risk adjustment (18:00 to 05:00)
    time_risk = 0.0
    if hour >= 18 or hour <= 5:
        time_risk = 15.0
        # Increase impact of risk zones during night
        risk_factor *= 1.3
        
    # Calculate safety score
    base_safety = 95.0
    calculated_safety = base_safety - risk_factor + safety_factor - time_risk
    
    # Clamp safety score between 10 and 100
    return max(10.0, min(100.0, calculated_safety))

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "SafePath AI Routing Engine",
        "models_loaded": ["SafetyPredictionEngine_v1", "RouteRiskScore_v1"]
    }

@app.post("/predict-safety")
def predict_safety(req: PredictRequest):
    # Calculate average safety along the line
    steps = 5
    lat_diff = (req.destination.lat - req.start.lat) / steps
    lng_diff = (req.destination.lng - req.start.lng) / steps
    
    scores = []
    for i in range(steps + 1):
        curr_lat = req.start.lat + (lat_diff * i)
        curr_lng = req.start.lng + (lng_diff * i)
        scores.append(calculate_coordinate_safety(curr_lat, curr_lng, req.hour_of_day or 12))
        
    avg_safety = sum(scores) / len(scores)
    
    risk_level = "Low"
    if avg_safety < 60:
        risk_level = "High"
    elif avg_safety < 85:
        risk_level = "Medium"
        
    recommendations = []
    if risk_level == "High":
        recommendations.append("High risk detected along path. Consider alternative route or public transit.")
        recommendations.append("Ensure Guardian Mode is activated before starting.")
    elif risk_level == "Medium":
        recommendations.append("Minor hazards nearby. Avoid dark side streets.")
    else:
        recommendations.append("Route is highly rated. Safe to travel.")
        
    return {
        "safety_score": round(avg_safety, 1),
        "risk_level": risk_level,
        "recommendations": recommendations
    }

@app.post("/route-risk")
def route_risk(req: RouteRiskRequest):
    evaluated_routes = []
    
    for route in req.routes:
        coord_scores = []
        # Sample coordinates along route to compute safety score
        sample_size = min(10, len(route.coordinates))
        step = max(1, len(route.coordinates) // sample_size)
        
        sampled_coords = [route.coordinates[i] for i in range(0, len(route.coordinates), step)]
        if route.coordinates[-1] not in sampled_coords:
            sampled_coords.append(route.coordinates[-1])
            
        for coord in sampled_coords:
            coord_scores.append(calculate_coordinate_safety(coord.lat, coord.lng, req.hour_of_day or 12))
            
        route_safety = sum(coord_scores) / len(coord_scores) if coord_scores else 95.0
        
        evaluated_routes.append({
            "id": route.id,
            "name": route.name,
            "safety_score": round(route_safety, 1),
            "coordinates": [{"lat": c.lat, "lng": c.lng} for c in route.coordinates]
        })
        
    # Sort by safety score descending to identify safest route
    evaluated_routes.sort(key=lambda x: x["safety_score"], reverse=True)
    
    # Add ranking recommendation flags
    for idx, r in enumerate(evaluated_routes):
        r["is_recommended"] = (idx == 0)
        r["rank"] = idx + 1
        
    return {
        "routes": evaluated_routes
    }

@app.post("/community-risk-score")
def community_risk_score(req: Coordinate):
    safety = calculate_coordinate_safety(req.lat, req.lng, 12)
    return {
        "safety_score": round(safety, 1),
        "threat_rating": round(100.0 - safety, 1),
        "is_safe": safety >= 80
    }

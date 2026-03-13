import os
from flask import Flask, request, jsonify, Response, send_from_directory, session
from flask_cors import CORS
import json
from drift_model import DriftSimulator
from geojson import Feature, FeatureCollection, Polygon, Point
from auth import init_db, get_user, verify_password, create_user, user_exists, get_pending_users, approve_user, reject_user, get_all_users, get_user_count, reset_user_password, delete_user

app = Flask(__name__, static_folder='../frontend/dist', static_url_path='/')
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
CORS(app, supports_credentials=True)

@app.route('/')
def serve_index():
    if app.static_folder:
        return send_from_directory(app.static_folder, 'index.html')
    return "Static folder not found", 500

@app.route('/<path:path>')
def serve_static(path):
    if path != "" and app.static_folder and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    if app.static_folder:
        return send_from_directory(app.static_folder, 'index.html')
    return "Static folder not found", 500

simulator = DriftSimulator()

# Initialize database on startup
init_db()

@app.after_request
def add_cache_headers(response):
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

OBJECT_TYPES = {
    # Person & Small Objects
    "person_in_water": {
        "name": "Person in Water (PIW)",
        "leeway_rate": 0.01,
        "leeway_angle": 0,
        "drift_dominance": "Surface current + waves",
        "size": "~1.7m"
    },
    "floating_debris": {
        "name": "Life Raft / Floating Debris",
        "leeway_rate": 0.03,
        "leeway_angle": 15,
        "drift_dominance": "Wind-driven",
        "size": "2–6m"
    },
    
    # Small Boats & Skiffs
    "small_outboard_boat": {
        "name": "Small Outboard Boat / Skiff",
        "leeway_rate": 0.025,
        "leeway_angle": 12,
        "drift_dominance": "Wind > current",
        "size": "5–8m"
    },
    "small_fishing_dhoni": {
        "name": "Small Fishing Dhoni",
        "leeway_rate": 0.02,
        "leeway_angle": 10,
        "drift_dominance": "Current + wind",
        "size": "8–15m"
    },
    "dive_dhoni": {
        "name": "Dive Dhoni (Support Vessel)",
        "leeway_rate": 0.015,
        "leeway_angle": 8,
        "drift_dominance": "Balanced",
        "size": "15–25m"
    },
    "passenger_speedboat": {
        "name": "Passenger Speedboat",
        "leeway_rate": 0.025,
        "leeway_angle": 12,
        "drift_dominance": "Wind + waves",
        "size": "10–18m"
    },
    
    # Cargo & Commercial Vessels
    "cargo_vessel_small": {
        "name": "Inter-Atoll Cargo Vessel (Small Coaster)",
        "leeway_rate": 0.0125,
        "leeway_angle": 6,
        "drift_dominance": "Current-dominant",
        "size": "20–40m"
    },
    "industrial_fishing_vessel": {
        "name": "Industrial Fishing Vessel",
        "leeway_rate": 0.01,
        "leeway_angle": 5,
        "drift_dominance": "Current-dominant",
        "size": "40–70m"
    },
    
    # Larger Vessels
    "liveaboard_vessel": {
        "name": "Liveaboard / Tourist Vessel",
        "leeway_rate": 0.02,
        "leeway_angle": 10,
        "drift_dominance": "Wind-skewed",
        "size": "25–45m"
    },
    "sailing_yacht": {
        "name": "Sailing Yacht (Monohull)",
        "leeway_rate": 0.03,
        "leeway_angle": 18,
        "drift_dominance": "Wind-dominant",
        "size": "10–20m"
    },
    "cargo_vessel_large": {
        "name": "General Cargo Vessel (Disabled / NUC)",
        "leeway_rate": 0.0225,
        "leeway_angle": 8,
        "drift_dominance": "Current with wind skew",
        "size": "80–130m"
    },
    "tanker_vessel": {
        "name": "Tanker / Large Commercial Vessel",
        "leeway_rate": 0.0075,
        "leeway_angle": 3,
        "drift_dominance": "Current-heavy",
        "size": "150–300m"
    },
}

# Authentication Routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    
    user = get_user(username)
    if not user or not verify_password(user['password_hash'], password):
        return jsonify({"error": "Invalid username or password"}), 401
    
    # Check if user is approved
    if not user.get('approved'):
        return jsonify({"error": "Account pending admin approval"}), 403
    
    session['user_id'] = user['id']
    session['username'] = user['username']
    session['role'] = user['role']
    
    return jsonify({
        "success": True,
        "user": {
            "id": user['id'],
            "username": user['username'],
            "role": user['role']
        }
    }), 200

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400
    
    if len(password) < 4:
        return jsonify({"error": "Password must be at least 4 characters"}), 400
    
    if user_exists(username):
        return jsonify({"error": "Username already exists"}), 400
    
    if create_user(username, password, role='user', approved=False):
        return jsonify({
            "success": True, 
            "message": "Account created successfully. Awaiting admin approval to activate."
        }), 201
    else:
        return jsonify({"error": "Failed to create user"}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True}), 200

@app.route('/api/admin/pending-users', methods=['GET'])
def get_pending():
    """Get pending user registrations (admin only)"""
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 401
    
    pending = get_pending_users()
    return jsonify({"pending_users": pending}), 200

@app.route('/api/admin/approve-user', methods=['POST'])
def admin_approve():
    """Admin approves a user registration"""
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    username = data.get('username', '').strip()
    
    if not username:
        return jsonify({"error": "Username required"}), 400
    
    if approve_user(username):
        return jsonify({"success": True, "message": f"User {username} approved"}), 200
    else:
        return jsonify({"error": "User not found or already approved"}), 404

@app.route('/api/admin/reject-user', methods=['POST'])
def admin_reject():
    """Admin rejects a user registration (deletes pending account)"""
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    username = data.get('username', '').strip()
    
    if not username:
        return jsonify({"error": "Username required"}), 400
    
    if reject_user(username):
        return jsonify({"success": True, "message": f"User {username} rejected"}), 200
    else:
        return jsonify({"error": "User not found or already approved"}), 404

@app.route('/api/admin/all-users', methods=['GET'])
def get_all_users_endpoint():
    """Get all users in the system (admin only)"""
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 401
    
    users = get_all_users()
    return jsonify({"users": users, "count": len(users)}), 200

@app.route('/api/admin/user-count', methods=['GET'])
def get_user_count_endpoint():
    """Get total user count (admin only)"""
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 401
    
    count = get_user_count()
    return jsonify({"count": count}), 200

@app.route('/api/admin/reset-password', methods=['POST'])
def admin_reset_password():
    """Reset a user's password (admin only)"""
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    username = data.get('username', '').strip()
    new_password = data.get('password', '')
    
    if not username or not new_password:
        return jsonify({"error": "Username and password required"}), 400
    
    if reset_user_password(username, new_password):
        return jsonify({"success": True, "message": f"Password reset for {username}"}), 200
    else:
        return jsonify({"error": "User not found"}), 404

@app.route('/api/admin/delete-user', methods=['POST'])
def admin_delete_user():
    """Delete a user from the system (admin only)"""
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    username = data.get('username', '').strip()
    
    if not username:
        return jsonify({"error": "Username required"}), 400
    
    # Prevent deleting self
    if username == session.get('username'):
        return jsonify({"error": "Cannot delete your own account"}), 400
    
    if delete_user(username):
        return jsonify({"success": True, "message": f"User {username} deleted"}), 200
    else:
        return jsonify({"error": "User not found"}), 404

@app.route('/api/auth/check', methods=['GET'])
def check_auth():
    if 'user_id' in session:
        return jsonify({
            "authenticated": True,
            "user": {
                "id": session.get('user_id'),
                "username": session.get('username'),
                "role": session.get('role')
            }
        }), 200
    return jsonify({"authenticated": False}), 200

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "MSDIS API"})

@app.route('/api/object-types', methods=['GET'])
def get_object_types():
    return jsonify(OBJECT_TYPES)

@app.route('/api/simulate', methods=['POST'])
def simulate_drift():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    
    lat_raw = data.get('latitude')
    lon_raw = data.get('longitude')
    hours_raw = data.get('hours', 24)
    object_type = data.get('object_type', 'person_in_water')
    vessel_speed = int(float(data.get('vessel_speed', 0)))
    
    if lat_raw is None:
        return jsonify({"error": "latitude is required"}), 400
    if lon_raw is None:
        return jsonify({"error": "longitude is required"}), 400
    
    try:
        lat = float(lat_raw)
        lon = float(lon_raw)
        hours = int(hours_raw)
    except (ValueError, TypeError):
        return jsonify({"error": "latitude, longitude must be numbers and hours must be an integer"}), 400
    
    # Bounds check removed - Unlimited hours enabled
    if hours < 1:
        return jsonify({"error": "hours must be at least 1"}), 400
    
    if object_type not in OBJECT_TYPES:
        return jsonify({"error": "Invalid object type"}), 400
    
    obj_params = OBJECT_TYPES[object_type]
    
    results = simulator.run_simulation(
        lat=lat,
        lon=lon,
        hours=hours,
        leeway_rate=obj_params['leeway_rate'],
        leeway_angle=obj_params['leeway_angle'],
        vessel_speed=vessel_speed
    )
    
    return jsonify({
        "input": {
            "latitude": lat,
            "longitude": lon,
            "hours": hours,
            "object_type": object_type,
            "object_name": obj_params['name']
        },
        "environmental_data": results['environmental_data'],
        "predictions": results['predictions'],
        "probability_zones": results['probability_zones']
    })

@app.route('/api/export/geojson', methods=['POST'])
def export_geojson():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    predictions = data.get('predictions', [])
    probability_zones = data.get('probability_zones', [])
    input_data = data.get('input', {})
    
    features = []
    
    features.append(Feature(
        geometry=Point((input_data.get('longitude', 0), input_data.get('latitude', 0))),
        properties={
            "type": "last_known_position",
            "name": "Last Known Position",
            "object_type": input_data.get('object_name', 'Unknown')
        }
    ))
    
    for pred in predictions:
        features.append(Feature(
            geometry=Point((pred['longitude'], pred['latitude'])),
            properties={
                "type": "predicted_position",
                "hour": pred['hour'],
                "name": f"Predicted Position (T+{pred['hour']}h)"
            }
        ))
    
    for zone in probability_zones:
        coords = zone['coordinates']
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        
        features.append(Feature(
            geometry=Polygon([coords]),
            properties={
                "type": "probability_zone",
                "hour": zone['hour'],
                "probability": zone['probability'],
                "name": f"Search Zone T+{zone['hour']}h ({int(zone['probability']*100)}%)"
            }
        ))
    
    fc = FeatureCollection(features)
    
    return Response(
        json.dumps(fc, indent=2),
        mimetype='application/geo+json',
        headers={'Content-Disposition': 'attachment; filename=search_zones.geojson'}
    )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)

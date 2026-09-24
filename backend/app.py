from flask import Flask, request, jsonify
from pymongo import MongoClient
import bcrypt
from flask_cors import CORS
import jwt
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Config from environment
MONGO_URI    = os.getenv('MONGO_URI', 'mongodb://localhost:27017/warpline')
JWT_SECRET   = os.getenv('JWT_SECRET', 'change-me-in-production')
FRONTEND_URL = os.getenv('FRONTEND_URL', '*')
PORT         = int(os.getenv('PORT', 5000))

# CORS
CORS(app, origins=[FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:5500'], supports_credentials=True)

# MongoDB
client = MongoClient(MONGO_URI)
db     = client['warpline']
users  = db['users']
orders = db['orders']

try:
    client.admin.command('ping')
    print('MongoDB connected')
except Exception as e:
    print('MongoDB connection failed:', e)


DAIRY_CATALOG = [
    {'slug': 'full-cream', 'name': 'Full Cream Grass-Fed Cow Milk (1 Litre)',      'price': 60,  'featured': True,  'category': 'Milk'},
    {'slug': 'toned',      'name': 'Morning Light Toned Milk (1 Litre)',            'price': 48,  'featured': False, 'category': 'Milk'},
    {'slug': 'curd',       'name': 'Artisan Clay-Set Whole Milk Curd (500g)',       'price': 40,  'featured': False, 'category': 'Curd'},
    {'slug': 'paneer',     'name': 'Hand-Pressed Malai Cottage Paneer (200g)',      'price': 90,  'featured': False, 'category': 'Curd'},
    {'slug': 'ghee',       'name': 'Traditional A2 Desi Cow Bilona Ghee (500ml)',  'price': 320, 'featured': False, 'category': 'Ghee'},
    {'slug': 'butter',     'name': 'Cultured Farm White Butter / Makhan (250g)',   'price': 150, 'featured': False, 'category': 'Ghee'},
]


def make_token(user_id, name, email):
    payload = {
        'sub': str(user_id),
        'name': name,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def get_current_user():
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    try:
        return jwt.decode(auth[7:], JWT_SECRET, algorithms=['HS256'])
    except Exception:
        return None


@app.route('/')
def root():
    return jsonify({'status': 'Tharun Farm Fresh API is running'})


@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'})


@app.route('/api/themes')
def get_themes():
    return jsonify({'themes': DAIRY_CATALOG})


@app.route('/api/signup', methods=['POST'])
def signup():
    data     = request.get_json() or {}
    name     = (data.get('name') or '').strip()
    email    = (data.get('email') or '').lower().strip()
    password = data.get('password') or ''

    if not name or not email or not password:
        return jsonify({'success': False, 'error': 'All fields are required'}), 400

    if users.find_one({'email': email}):
        return jsonify({'success': False, 'error': 'An account with that email already exists.'}), 409

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    result = users.insert_one({'name': name, 'email': email, 'password': hashed})

    token = make_token(result.inserted_id, name, email)
    return jsonify({
        'success': True,
        'message': 'Account created successfully',
        'token': token,
        'user': {'id': str(result.inserted_id), 'name': name, 'email': email}
    }), 201


@app.route('/api/login', methods=['POST'])
def login():
    data     = request.get_json() or {}
    email    = (data.get('email') or '').lower().strip()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password are required'}), 400

    user = users.find_one({'email': email})
    if not user or not bcrypt.checkpw(password.encode(), user['password']):
        return jsonify({'success': False, 'error': "That email and password don't match an account here."}), 401

    token = make_token(user['_id'], user['name'], email)
    return jsonify({
        'success': True,
        'message': 'Login successful',
        'token': token,
        'user': {'id': str(user['_id']), 'name': user['name'], 'email': email}
    }), 200


@app.route('/api/orders', methods=['POST'])
def place_order():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data  = request.get_json() or {}
    slugs = data.get('slugs', [])

    items = []
    total = 0
    for slug in slugs:
        product = next((p for p in DAIRY_CATALOG if p['slug'] == slug), None)
        if product:
            items.append({'slug': slug, 'name': product['name'], 'price': product['price']})
            total += product['price']

    if not items:
        return jsonify({'error': 'No valid items in order'}), 400

    order = {
        'userId': user['sub'],
        'items': items,
        'total': total,
        'status': 'confirmed',
        'createdAt': datetime.now(timezone.utc).isoformat()
    }
    result = orders.insert_one(order)

    return jsonify({
        'success': True,
        'orderId': str(result.inserted_id),
        'total': total,
        'items': items
    }), 201


@app.route('/api/orders', methods=['GET'])
def get_orders():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    user_orders = list(orders.find({'userId': user['sub']}).sort('createdAt', -1).limit(20))
    for o in user_orders:
        o['_id'] = str(o['_id'])

    return jsonify({'orders': user_orders}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=False)

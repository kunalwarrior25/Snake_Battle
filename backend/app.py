from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room
from flask_cors import CORS
import random
import string
import os

# Serve React App
app = Flask(__name__, static_folder='../dist', static_url_path='')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'snake-battle-secret')
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.errorhandler(404)
def not_found(e):
    return app.send_static_file('index.html')

# In-memory storage for rooms and players
# Structure:
# {
#   "ABC123": {
#     "players": {
#       "socket_id_1": {"name": "Player1", "score": 0, "isHost": True},
#       "socket_id_2": {"name": "Player2", "score": 0, "isHost": False}
#     },
#     "gameState": "waiting" | "playing" | "finished",
#     "gameData": {}
#   }
# }
rooms = {}

def generate_room_code():
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if code not in rooms:
            return code

# --- Mock API Endpoints for Offline/Guest Support ---
@app.route('/api/players', methods=['POST'])
def create_player():
    data = request.json
    return jsonify({
        'id': random.randint(1000, 9999),
        'name': data.get('name', 'Player'),
        'high_score': 0,
        'games_played': 0,
        'levels_completed': 0
    })

@app.route('/api/players/<int:player_id>', methods=['GET'])
def get_player(player_id):
    return jsonify({
        'id': player_id,
        'name': f'Player{player_id}',
        'high_score': 0,
        'games_played': 0,
        'levels_completed': 0
    })

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")
    emit('connected', {'status': 'connected'})

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    # Remove player from any rooms they are in
    for room_code, room_data in list(rooms.items()):
        if request.sid in room_data['players']:
            player_name = room_data['players'][request.sid]['name']
            del room_data['players'][request.sid]
            
            print(f"Player {player_name} removed from room {room_code}")
            
            # Notify remaining players
            emit('player_left', {'playerId': request.sid, 'name': player_name}, room=room_code)
            emit('room_updated', {
                'roomCode': room_code,
                'players': format_players(room_data['players'])
            }, room=room_code)
            
            # If room is empty, delete it
            if not room_data['players']:
                del rooms[room_code]
                print(f"Room {room_code} deleted (empty)")
            else:
                # If host left, assign new host
                has_host = any(p['isHost'] for p in room_data['players'].values())
                if not has_host and room_data['players']:
                    next_host_sid = next(iter(room_data['players']))
                    room_data['players'][next_host_sid]['isHost'] = True
                    emit('room_updated', {
                        'roomCode': room_code,
                        'players': format_players(room_data['players'])
                    }, room=room_code)

def format_players(players_dict):
    formatted = []
    for sid, data in players_dict.items():
        formatted.append({
            'id': sid,
            'name': data['name'],
            'isHost': data['isHost'],
            'score': data.get('score', 0)
        })
    return formatted

@socketio.on('create_room')
def handle_create_room(data):
    player_name = data.get('playerName', 'Player')
    room_code = generate_room_code()
    
    rooms[room_code] = {
        'players': {
            request.sid: {
                'name': player_name,
                'isHost': True,
                'score': 0
            }
        },
        'gameState': 'waiting'
    }
    
    join_room(room_code)
    print(f"Room {room_code} created by {player_name}")
    
    room_data = {
        'roomCode': room_code,
        'players': format_players(rooms[room_code]['players'])
    }
    
    # Emit updates to everyone in room (just the creator for now)
    emit('room_created', room_data, room=request.sid)
    emit('room_updated', room_data, room=room_code)
    
    # Return data to the caller (Ack)
    return room_data

@socketio.on('join_room')
def handle_join_room(data):
    room_code = data.get('roomCode')
    player_name = data.get('playerName', 'Player')
    
    if not room_code or room_code not in rooms:
        return {'error': 'Room not found'}
    
    room = rooms[room_code]
    
    if len(room['players']) >= 2:
        return {'error': 'Room is full'}
    
    if request.sid in room['players']:
        return {'error': 'Already in room'}
    
    room['players'][request.sid] = {
        'name': player_name,
        'isHost': False,
        'score': 0
    }
    
    join_room(room_code)
    print(f"{player_name} joined room {room_code}")
    
    room_data = {
        'roomCode': room_code,
        'players': format_players(room['players'])
    }
    
    emit('player_joined', {'name': player_name, 'id': request.sid}, room=room_code)
    emit('room_updated', room_data, room=room_code)
    
    return room_data

@socketio.on('leave_room')
def handle_leave_room(data):
    room_code = data.get('roomCode')
    if room_code and room_code in rooms:
        leave_room(room_code)
        # cleanup handled by disconnect logic if needed, but explicit leave:
        if request.sid in rooms[room_code]['players']:
            player_name = rooms[room_code]['players'][request.sid]['name']
            del rooms[room_code]['players'][request.sid]
            
            emit('player_left', {'playerId': request.sid, 'name': player_name}, room=room_code)
            emit('room_updated', {
                'roomCode': room_code,
                'players': format_players(rooms[room_code]['players'])
            }, room=room_code)
            
            if not rooms[room_code]['players']:
                del rooms[room_code]

@socketio.on('start_game')
def handle_start_game(data):
    room_code = data.get('roomCode')
    if room_code in rooms:
        rooms[room_code]['gameState'] = 'playing'
        emit('game_started', {'startTime': 120}, room=room_code) # 120 seconds

@socketio.on('game_move')
def handle_game_move(data):
    room_code = data.get('roomCode')
    if room_code in rooms:
        # Broadcast move to others in room (exclude sender ideally, but for simplicity broadcast to room)
        emit('game_move', data, room=room_code, include_self=False)

@socketio.on('game_food_eaten')
def handle_food_eaten(data):
    room_code = data.get('roomCode')
    if room_code in rooms:
        # Update score
        if request.sid in rooms[room_code]['players']:
            rooms[room_code]['players'][request.sid]['score'] += data.get('points', 10)
        
        emit('game_food_eaten', data, room=room_code)
        # Broadcast score update
        emit('room_updated', {
            'roomCode': room_code,
            'players': format_players(rooms[room_code]['players'])
        }, room=room_code)

@socketio.on('game_over')
def handle_game_over(data):
    room_code = data.get('roomCode')
    if room_code in rooms:
        emit('game_over', data, room=room_code)

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
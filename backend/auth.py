import sqlite3
import bcrypt
from datetime import datetime
import os

DB_PATH = 'poseidon.db'

def init_db():
    """Initialize database with users table"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    table_exists = cursor.fetchone() is not None
    
    if not table_exists:
        # Create new table with approved column
        cursor.execute('''
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                approved INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create first admin user (auto-approved)
        admin_password = 'ADMIN4321'
        password_hash = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt())
        cursor.execute(
            'INSERT INTO users (username, password_hash, role, approved) VALUES (?, ?, ?, ?)',
            ('Admin', password_hash, 'admin', 1)
        )
        
        conn.commit()
        conn.close()
        return True
    else:
        # Check if approved column exists (migration)
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'approved' not in columns:
            # Add approved column to existing table
            cursor.execute('ALTER TABLE users ADD COLUMN approved INTEGER DEFAULT 0')
            # Auto-approve existing users (except Admin is already approved by default)
            cursor.execute('UPDATE users SET approved = 1 WHERE role = "admin"')
            conn.commit()
        
        conn.close()
        return False

def get_user(username):
    """Get user by username"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    conn.close()
    
    return dict(user) if user else None

def verify_password(stored_hash, provided_password):
    """Verify password against hash"""
    return bcrypt.checkpw(provided_password.encode('utf-8'), stored_hash)

def create_user(username, password, role='user', approved=False):
    """Create a new user (requires admin approval by default)"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        cursor.execute(
            'INSERT INTO users (username, password_hash, role, approved) VALUES (?, ?, ?, ?)',
            (username, password_hash, role, 1 if approved else 0)
        )
        
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        return False

def get_pending_users():
    """Get all pending (unapproved) users"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, username, role, created_at FROM users WHERE approved = 0')
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return users

def approve_user(username):
    """Admin approves a user"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('UPDATE users SET approved = 1 WHERE username = ?', (username,))
        
        if cursor.rowcount == 0:
            conn.close()
            return False
        
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

def reject_user(username):
    """Admin rejects a user (deletes the account)"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM users WHERE username = ? AND approved = 0', (username,))
        
        if cursor.rowcount == 0:
            conn.close()
            return False
        
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

def user_exists(username):
    """Check if user exists"""
    return get_user(username) is not None

def get_all_users():
    """Get all users in the system"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, username, role, approved, created_at FROM users')
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return users

def get_user_count():
    """Get total number of users"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) as count FROM users')
    count = cursor.fetchone()[0]
    conn.close()
    
    return count

def reset_user_password(username, new_password):
    """Reset a user's password"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        cursor.execute('UPDATE users SET password_hash = ? WHERE username = ?', (password_hash, username))
        
        if cursor.rowcount == 0:
            conn.close()
            return False
        
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

def delete_user(username):
    """Delete a user from the system"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM users WHERE username = ?', (username,))
        
        if cursor.rowcount == 0:
            conn.close()
            return False
        
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

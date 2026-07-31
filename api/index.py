import os
from app import app as flask_app

def app(environ, start_response):
    # Get true path requested by client from Vercel headers
    raw_path = environ.get('HTTP_X_FORWARDED_PATH', '') or environ.get('PATH_INFO', '/')
    
    # Remove vercel rewrite destination prefix if present
    if raw_path.startswith('/api/index.py'):
        raw_path = raw_path[13:] or '/'
    elif raw_path.startswith('/api/index'):
        raw_path = raw_path[10:] or '/'

    environ['PATH_INFO'] = raw_path
    environ['SCRIPT_NAME'] = ''
    return flask_app(environ, start_response)

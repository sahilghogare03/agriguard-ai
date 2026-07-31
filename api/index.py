from app import app

def handler(environ, start_response):
    # Retrieve true request URL path
    path = environ.get('HTTP_X_FORWARDED_PATH', environ.get('PATH_INFO', '/'))
    
    # Strip serverless rewrite path prefix if present
    if path.startswith('/api/index.py'):
        path = path[13:] or '/'
    elif path.startswith('/api/index'):
        path = path[10:] or '/'

    environ['PATH_INFO'] = path
    return app(environ, start_response)

# Export handler as app for Vercel WSGI
app = handler

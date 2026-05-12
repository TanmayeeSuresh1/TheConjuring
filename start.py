import subprocess, os, time, webbrowser

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend')

print('[SafeShare AI] Installing dependencies...')
subprocess.run('pip install -r requirements.txt -q', shell=True, cwd=backend_dir)

print('[SafeShare AI] Starting backend on http://localhost:8000 ...')
proc = subprocess.Popen('uvicorn main:app --host 0.0.0.0 --port 8000 --reload', shell=True, cwd=backend_dir)

time.sleep(3)
index = os.path.join(frontend_dir, 'index.html')
url = 'file:///' + index.replace(os.sep, '/')
print('[SafeShare AI] Opening frontend:', url)
webbrowser.open(url)
print('[SafeShare AI] API docs: http://localhost:8000/api/docs')
print('[SafeShare AI] Press Ctrl+C to stop.')
try:
    proc.wait()
except KeyboardInterrupt:
    proc.terminate()
    print('[SafeShare AI] Stopped.')

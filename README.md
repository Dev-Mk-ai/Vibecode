PROJECT: VibeCode - Local AI IDE
HARDWARE: Intel i5-6th Gen / 12GB RAM Optimization
TARGET: $100 Milestone / GitHub Portfolio
==============================================

[1] ROOT STRUCTURE (vibecode/)
----------------------------------------------------------
vibecode/
├── .gitignore          <-- Create this first
├── README.md           <-- Use the text below
├── LICENSE             <-- MIT License
├── api/                <-- Python Backend
│   ├── server.py
│   └── requirements.txt
└── electron/           <-- Frontend
    ├── package.json
    └── src/ (main.js, renderer.js, index.html)


[2] .GITIGNORE (Save as .gitignore in root)
----------------------------------------------------------
__pycache__/
venv/
node_modules/
dist/
*.pyc
.env
.DS_Store
models/
*.bin
*.pth


[3] API REQUIREMENTS (api/requirements.txt)
----------------------------------------------------------
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
pydantic>=2.0.0
python-multipart
transformers>=4.38.0
torch>=2.2.0
accelerate>=0.27.0
huggingface-hub
einops


[4] SERVER OPTIMIZATION (Add to top of api/server.py)
----------------------------------------------------------
import os
import torch

# Force i5 to use all available cores for math
os.environ["OMP_NUM_THREADS"] = str(os.cpu_count())
torch.set_num_threads(os.cpu_count())


[5] GITHUB README.MD (Save as README.md in root)
----------------------------------------------------------
# ⬡ VibeCode

**VibeCode** is a private, local-first AI code editor designed for high-performance "Vibe Coding" on any hardware. It bridges a local Python inference server with a modern Electron IDE, allowing you to run powerful models like **Qwen2.5-Coder** entirely offline.

> **Hardware-Agile:** Optimized to run 1.5B+ parameter models on legacy hardware (e.g., Intel i5-6th Gen) using multi-threaded CPU orchestration.

## Quick Start

### Step 1 — Start the local AI server
cd api
pip install -r requirements.txt
python server.py

### Step 2 — Launch the IDE
cd electron
npm install
npm start

1. Click "Not Connected" (top right).
2. Use URL: http://127.0.0.1:8000/generate
3. Click "Save & Connect" and start coding.

## Keyboard Shortcuts
- Ctrl+S: Save File
- Ctrl+J: Toggle AI Assistant
- Ctrl+B: Toggle File Tree
- Ctrl+Shift+R: Refactor Selection

## License & Privacy
100% Local. Your code never leaves your machine. Distributed under MIT License.


[6] TERMINAL COMMANDS TO PUSH TO GITHUB
----------------------------------------------------------
1. cd vibecode
2. git init
3. git add .
4. git commit -m "Initial commit: VibeCode Alpha optimized for i5"
5. git branch -M main
6. git remote add origin [YOUR_GITHUB_REPO_URL]
7. git push -u origin main

END OF Project (Yes I know the formating is a little extra) 
-------------------------------------------------------------

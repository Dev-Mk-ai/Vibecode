from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator, List
from transformers import pipeline
import torch
import asyncio
import json
import time
import os

# ── CPU THREADING ─────────────────────────────────────────────────────────
os.environ["OMP_NUM_THREADS"] = str(os.cpu_count())
torch.set_num_threads(os.cpu_count())
print(f"--- Using {os.cpu_count()} CPU threads ---")

app = FastAPI(title="VibeCode Model API", version="0.2.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str
    content: str


class GenerateRequest(BaseModel):
    prompt: str
    system: Optional[str] = "You are a helpful coding assistant. When suggesting code, wrap it in triple backticks with the language name."
    max_tokens: Optional[int] = 512
    temperature: Optional[float] = 0.7
    stream: Optional[bool] = False
    context_file: Optional[str] = None
    context_code: Optional[str] = None
    history: Optional[List[Message]] = []


class GenerateResponse(BaseModel):
    text: str
    model: str
    elapsed_ms: Optional[int] = None


def load_model():
    print("--- Loading Qwen2.5-Coder-1.5B-Instruct ---")
    model_name = "Qwen/Qwen2.5-Coder-1.5B-Instruct"
    device = 0 if torch.cuda.is_available() else -1
    pipe = pipeline(
        "text-generation",
        model=model_name,
        device=device,
        torch_dtype="auto",
    )
    print(f"--- Model loaded on {'GPU' if device == 0 else 'CPU'} ---")
    return pipe


MODEL_PIPE = load_model()
MODEL_NAME = "Qwen2.5-Coder-1.5B"


def build_messages(req: GenerateRequest) -> list:
    messages = [{"role": "system", "content": req.system}]
    for msg in (req.history or []):
        messages.append({"role": msg.role, "content": msg.content})
    user_content = req.prompt
    if req.context_code:
        user_content = (
            f"Current file ({req.context_file or 'script.py'}):\n"
            f"```\n{req.context_code}\n```\n\n{req.prompt}"
        )
    messages.append({"role": "user", "content": user_content})
    return messages


def run_inference(messages: list, max_tokens: int, temperature: float) -> str:
    results = MODEL_PIPE(
        messages,
        max_new_tokens=max_tokens,
        temperature=temperature,
        do_sample=temperature > 0,
        pad_token_id=MODEL_PIPE.tokenizer.eos_token_id,
    )
    return results[0]["generated_text"][-1]["content"]


async def stream_inference(messages, max_tokens, temperature):
    loop = asyncio.get_event_loop()
    text = await loop.run_in_executor(None, run_inference, messages, max_tokens, temperature)
    for word in text.split(" "):
        yield f"data: {json.dumps({'text': word + ' '})}\n\n"
        await asyncio.sleep(0.02)
    yield "data: [DONE]\n\n"


@app.get("/")
def root():
    return {"status": "ok", "service": "VibeCode API", "version": "0.2.1"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": MODEL_PIPE is not None,
        "model": MODEL_NAME,
        "device": "GPU" if torch.cuda.is_available() else "CPU",
        "cpu_threads": os.cpu_count(),
        "timestamp": time.time(),
    }


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    start = time.time()
    messages = build_messages(req)
    if req.stream:
        return StreamingResponse(
            stream_inference(messages, req.max_tokens, req.temperature),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    try:
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(None, run_inference, messages, req.max_tokens, req.temperature)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    elapsed = int((time.time() - start) * 1000)
    return GenerateResponse(text=text, model=MODEL_NAME, elapsed_ms=elapsed)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)

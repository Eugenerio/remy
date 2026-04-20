"""Stand-in ComfyUI server for local e2e tests. Accepts any workflow and
returns a canned job id + success. Do NOT use in production."""

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class WorkflowIn(BaseModel):
    prompt: dict | None = None
    workflow: dict | None = None


@app.get("/")
def root():
    return {"ok": True, "stub": True}


@app.post("/prompt")
def prompt(_: WorkflowIn):
    return {"prompt_id": "stub-12345", "number": 1, "node_errors": {}}


@app.get("/history/{pid}")
def history(pid: str):
    return {pid: {"status": {"status_str": "success"}, "outputs": {}}}

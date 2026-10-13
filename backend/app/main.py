from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.inference import predict_pose_image

MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 MB

app = FastAPI(
    title="Cric Guard API",
    description="Cricket Bowling Pose Injury Risk Prediction System",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
def root_info():
    return {
        "status": "online",
        "system": "Cric Guard Production Engine v2.0",
        "endpoints": {
            "health": "/health",
            "predict": "/predict",
        },
    }


@app.get("/health")
def health_check():
    return {"status": "online", "system": "Cric Guard Production Engine v2.0"}


@app.post("/predict")
async def analyze_bowling_pose(file: UploadFile = File(...)):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No image file provided.")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")

    try:
        contents = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read uploaded image.")

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="Uploaded image exceeds the file size limit.")

    try:
        result = predict_pose_image(contents)
    except ValueError:
        raise HTTPException(status_code=400, detail="Uploaded image is not a valid image.")
    except Exception:
        raise HTTPException(status_code=500, detail="Unable to process image at this time.")

    if result["status"] == "rejected":
        raise HTTPException(status_code=422, detail=result["message"])

    return result


@app.exception_handler(413)
async def request_entity_too_large_handler(_: Request, exc: Exception):
    return JSONResponse(status_code=413, content={"detail": "Uploaded image exceeds the file size limit."})

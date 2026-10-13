import cv2
import numpy as np
import tensorflow as tf
import tensorflow_hub as tfhub

from app.model_loader import load_model
from app.utils import build_57_feature_vector

# Load MoveNet & Production RF Model
print("📦 Loading MoveNet Lightning for production backend...")
movenet = tfhub.load("https://tfhub.dev/google/movenet/singlepose/lightning/4")
movenet_fn = movenet.signatures['serving_default']

print("📦 Loading Production RF Model from trusted backend artifact...")
rf_model = load_model()


def predict_pose_image(image_bytes: bytes):
    """Run the MoveNet + RF pipeline for a single uploaded image."""
    if not isinstance(image_bytes, (bytes, bytearray)) or not image_bytes:
        raise ValueError("Image bytes are missing or invalid.")

    nparr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None or img_bgr.size == 0:
        raise ValueError("Invalid or unreadable image file.")

    # Preprocessing matching validated pipeline: MoveNet SinglePose Lightning at 192x192
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    resized_img = cv2.resize(img_rgb, (192, 192))
    input_tensor = tf.cast(tf.expand_dims(resized_img, axis=0), dtype=tf.int32)

    outputs = movenet_fn(input_tensor)
    keypoints = outputs['output_0'].numpy()[0, 0, :, :]  # Shape: (17, 3)

    if keypoints.shape != (17, 3):
        raise ValueError("MoveNet produced an unexpected keypoint tensor shape.")

    mean_conf = float(np.mean(keypoints[:, 2]))
    if mean_conf < 0.15:
        return {
            "status": "rejected",
            "message": "No clear human pose detected in the image.",
            "mean_pose_confidence": mean_conf,
        }

    X_input = build_57_feature_vector(keypoints)

    prediction_cls = int(rf_model.predict(X_input)[0])
    probabilities = rf_model.predict_proba(X_input)[0]

    label_map = {0: "SAFE", 1: "RISK"}

    return {
        "status": "success",
        "prediction": label_map[prediction_cls],
        "risk_label": prediction_cls,
        "confidence": float(probabilities[prediction_cls]),
        "decision_strength": float(abs(probabilities[1] - probabilities[0])),
        "mean_pose_confidence": mean_conf,
    }
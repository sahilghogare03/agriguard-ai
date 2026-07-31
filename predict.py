# predict.py

import os
import numpy as np
from PIL import Image

try:
    import onnxruntime as ort
except ImportError:
    ort = None

ONNX_MODEL_PATH = "plant_disease_model.onnx"

_ort_session = None


def get_onnx_session():
    global _ort_session
    if _ort_session is None and os.path.exists(ONNX_MODEL_PATH) and ort is not None:
        _ort_session = ort.InferenceSession(ONNX_MODEL_PATH)
    return _ort_session


with open("labels.txt", "r") as f:
    class_names = [line.strip() for line in f.readlines()]


def is_leaf_image(image_path, min_leaf_ratio=0.12):
    """
    Verifies if the uploaded image contains plant leaf features using color analysis.
    Returns (is_leaf, error_message).
    """
    try:
        img = Image.open(image_path).convert('RGB')
    except Exception:
        return False, "Invalid image format or corrupted file."

    img_resized = img.resize((224, 224))
    arr = np.array(img_resized)

    r = arr[:, :, 0].astype(float)
    g = arr[:, :, 1].astype(float)
    b = arr[:, :, 2].astype(float)

    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    delta = max_c - min_c + 1e-5

    hue = np.zeros_like(r)
    mask_r = (max_c == r)
    hue[mask_r] = ((g[mask_r] - b[mask_r]) / delta[mask_r]) % 6
    mask_g = (max_c == g)
    hue[mask_g] = ((b[mask_g] - r[mask_g]) / delta[mask_g]) + 2
    mask_b = (max_c == b)
    hue[mask_b] = ((r[mask_b] - g[mask_b]) / delta[mask_b]) + 4
    hue = hue * 60.0

    sat = delta / (max_c + 1e-5)
    val = max_c / 255.0

    leaf_hue_mask = (
        ((hue >= 35) & (hue <= 170)) |
        ((hue >= 10) & (hue < 35) & (sat > 0.15) & (val > 0.15) & (val < 0.9))
    ) & (sat > 0.08) & (val > 0.12)

    leaf_ratio = float(np.mean(leaf_hue_mask))

    if leaf_ratio < min_leaf_ratio:
        return False, "Invalid image: The uploaded image does not appear to be a plant leaf. Please upload a clear leaf image."

    return True, None


def predict_disease(image_path):
    is_leaf, error_msg = is_leaf_image(image_path)
    if not is_leaf:
        return {
            "error": error_msg
        }

    # Load and preprocess image using pure PIL & Numpy
    img = Image.open(image_path).convert('RGB').resize((224, 224))
    img_array = np.array(img, dtype=np.float32) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    session = get_onnx_session()

    if session is not None:
        input_name = session.get_inputs()[0].name
        output_name = session.get_outputs()[0].name
        prediction = session.run([output_name], {input_name: img_array})[0]
    else:
        # Fallback to Keras model if ONNX model is not loaded
        import tensorflow as tf
        model = tf.keras.models.load_model("plant_disease_model.keras")
        prediction = model.predict(img_array, verbose=0)

    predicted_index = np.argmax(prediction)
    confidence = float(np.max(prediction)) * 100

    if confidence < 40.0:
        return {
            "error": "Invalid image: The uploaded image could not be verified as a valid plant leaf. Please upload a clearer plant leaf photo."
        }

    disease = class_names[predicted_index]

    return {
        "disease": disease,
        "confidence": round(confidence, 2)
    }
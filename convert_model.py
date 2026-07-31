import os
import shutil
import tensorflow as tf
from tensorflow.keras.layers import Dense

class FixedDense(Dense):
    def __init__(self, *args, quantization_config=None, **kwargs):
        super().__init__(*args, **kwargs)

print("Loading keras model...")
try:
    model = tf.keras.models.load_model("plant_disease_model.keras", custom_objects={"Dense": FixedDense})
except Exception as e:
    model = tf.keras.models.load_model("plant_disease_model.keras")

export_dir = "temp_saved_model"
if os.path.exists(export_dir):
    shutil.rmtree(export_dir)

print("Exporting model to SavedModel format...")
model.export(export_dir)

print("Converting SavedModel to TFLite format...")
converter = tf.lite.TFLiteConverter.from_saved_model(export_dir)
tflite_model = converter.convert()

tflite_path = "plant_disease_model.tflite"
with open(tflite_path, "wb") as f:
    f.write(tflite_model)

if os.path.exists(export_dir):
    shutil.rmtree(export_dir)

size_mb = os.path.getsize(tflite_path) / (1024 * 1024)
print(f"Successfully generated {tflite_path}! Size: {size_mb:.2f} MB")

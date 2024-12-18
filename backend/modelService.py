
import pickle
import numpy as np
from PIL import Image
import io
import base64
import sys
import json
import keras
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.models import Model
import os
import pathlib
import time
import datetime
import pickle
from matplotlib import pyplot as plt
from IPython import display

def load_gan_model(model_path):
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at: {model_path}")
    try:
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
            print("Model loaded successfully")
            return model
    except pickle.UnpicklingError as e:
        raise Exception(f"Error unpickling model: {str(e)}")
    except Exception as e:
        raise Exception(f"Error loading model: {str(e)}")


def process_image(image_data):
    image_bytes = base64.b64decode(image_data)
    image = Image.open(io.BytesIO(image_bytes))
    # Convert to RGB mode
    image = image.convert('RGB')
    image = image.resize((256, 256))
    image_array = np.array(image)
    image_array = image_array.astype('float32') / 255.0 
    image_array = np.expand_dims(image_array, axis=0)
    return image_array


def generate_gan_output(model_path, image_data):
    try:

        interpreter = tf.lite.Interpreter(model_path)
        interpreter.allocate_tensors()

        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()  
        processed_image = process_image(image_data)

        input_data = processed_image
        if input_details[0]['dtype'] == np.uint8:
            input_data = (processed_image * 255).astype(np.uint8)

        interpreter.set_tensor(input_details[0]['index'], input_data)
        interpreter.invoke()
        generated_output = interpreter.get_tensor(output_details[0]['index'])

        # Post-process the output
        generated_output = interpreter.get_tensor(output_details[0]['index'])
        
        # Convert to RGB if output is grayscale
        generated_output = (generated_output * 255).astype(np.uint8)
        if len(generated_output.shape) == 3:  # If single channel
            generated_output = np.stack([generated_output[0]] * 3, axis=-1)
        
        output_image = Image.fromarray(generated_output[0])
        
        buffer = io.BytesIO()
        output_image.save(buffer, format='JPEG', quality=95)
        output_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return output_base64
                
    except Exception as e:
        print("err: "+ str(e))
        return str(e)

model_path = '/home/saitejadamara/Documents/Sketch/backend/quantized_generator.tflite'
try:
    input_data = json.load(sys.stdin)
    image_base64 = input_data['image']
    result = generate_gan_output(model_path, image_base64)
    
    if isinstance(result, str) and result.startswith('err:'):
        print(json.dumps({"error": result}))
    else:
        print(json.dumps({"processed_image": result}))
    sys.stdout.flush()
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
 
import os
import subprocess
import google.generativeai as genai

# get key from railway
out = subprocess.check_output(["powershell", "-ExecutionPolicy", "Bypass", "-Command", "railway variables --kv | Select-String GEMINI_API_KEY"]).decode().strip()
key = out.split('=')[1].strip()
genai.configure(api_key=key)
print("Available models supporting generateContent:")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)

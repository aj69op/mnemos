from rembg import remove
from PIL import Image

input_path = 'public/logo.png'
output_path = 'public/logo_transparent.png'

print(f"Removing background from {input_path}...")
input_image = Image.open(input_path)
output_image = remove(input_image)
output_image.save(output_path)
print(f"Saved transparent logo to {output_path}")

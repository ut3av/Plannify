import imageio_ffmpeg
import subprocess
import sys

ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
input_file = r"C:\Users\vastu\.gemini\antigravity\brain\dbf75ead-e223-4a45-8347-d18728a12c77\ai_timetablex_demo_1777194125523.webp"
output_file = r"C:\Users\vastu\.gemini\antigravity\brain\dbf75ead-e223-4a45-8347-d18728a12c77\ai_timetablex_demo.mp4"

# Call ffmpeg directly
cmd = [
    ffmpeg_path,
    "-i", input_file,
    "-pix_fmt", "yuv420p", # Essential for widely supported mp4 playback
    "-c:v", "libx264",
    "-crf", "23",
    output_file
]

print(f"Running command: {' '.join(cmd)}")
result = subprocess.run(cmd, capture_output=True, text=True)

if result.returncode == 0:
    print("Conversion successful!")
else:
    print("Conversion failed!")
    print(result.stderr)

## Local image generation integration

The image helper uses a real local Stable Diffusion WebUI API. It does not connect to Manus Forge or return placeholder images. The engine must already be installed, have a model loaded and be running with --api. No engine or model is automatically downloaded.

Default endpoint: http://127.0.0.1:7860. Set LOCAL_IMAGE_API_URL to change it. The helper calls /sdapi/v1/txt2img for one 512x512 image at 20 steps and returns a data URI. Failures are reported as errors. Japanese prompts use the configured local text AI for English translation. Original-image editing is not supported by this helper.

Authenticated PC chat accepts direct requests such as 猫の画像を作って or /imagine a cat. Actual image bytes are validated, saved in an account-private directory and displayed only through authenticated image reads. Generated images include a save link.

Photo attachment and analysis are separate from generation. They use installed Ollama vision models, optionally selected with LOCAL_VISION_MODEL. See CHAT_PHOTOS.md for behavior and limitations.

Live PC vision and generation are unverified. No application build, test run, model download or restart was performed as part of implementation.

Windows setup helper: scripts/setup-image-engine.ps1. It uses the official Forge CUDA 12.1 / PyTorch 2.3.1 package plus the published SD 1.5 safetensors checkpoint in a separate per-user folder. Use -Start to launch its API; no PoiPoi build/restart or generated sample is run. See CHAT_PHOTOS.md for limits and configuration.

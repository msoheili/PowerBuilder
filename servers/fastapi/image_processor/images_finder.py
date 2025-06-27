import asyncio
import base64
import os
import uuid
import aiohttp
from langchain_google_genai import ChatGoogleGenerativeAI
from openai import OpenAI

from ppt_generator.models.query_and_prompt_models import (
    ImagePromptWithThemeAndAspectRatio,
)
from api.utils.utils import download_file, get_resource, is_ollama_selected


async def generate_image(
    input: ImagePromptWithThemeAndAspectRatio,
    output_directory: str,
) -> str:
    # Use image generation configuration
    image_llm = os.getenv("IMAGE_LLM") or os.getenv("LLM")
    is_ollama = image_llm == "ollama"
    is_pexels = image_llm == "pexels"

    image_prompt = (
        input.image_prompt
        if is_ollama or is_pexels
        else f"{input.image_prompt}, {input.theme_prompt}"
    )
    print(f"Request - Generating Image for {image_prompt}")

    try:
        image_gen_func = (
            get_image_from_pexels
            if is_ollama or is_pexels
            else (
                generate_image_openai
                if image_llm == "openai"
                else generate_image_google
            )
        )
        image_path = await image_gen_func(image_prompt, output_directory)
        if image_path and os.path.exists(image_path):
            return image_path
        raise Exception(f"Image not found at {image_path}")

    except Exception as e:
        print(f"Error generating image: {e}")
        return get_resource("assets/images/placeholder.jpg")


async def generate_image_openai(prompt: str, output_directory: str) -> str:
    # Use image generation configuration
    api_key = os.getenv("IMAGE_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
    api_address = os.getenv("IMAGE_API_ADDRESS")
    
    if api_address:
        client = OpenAI(api_key=api_key, base_url=api_address)
    else:
        client = OpenAI(api_key=api_key)
        
    result = await asyncio.to_thread(
        client.images.generate,
        model="dall-e-3",
        prompt=prompt,
        n=1,
        quality="standard",
        size="1024x1024",
    )
    image_url = result.data[0].url
    async with aiohttp.ClientSession() as session:
        async with session.get(image_url) as response:
            image_bytes = await response.read()
            image_path = os.path.join(output_directory, f"{str(uuid.uuid4())}.jpg")
            with open(image_path, "wb") as f:
                f.write(image_bytes)
            return image_path


async def generate_image_google(prompt: str, output_directory: str) -> str:
    # Use image generation configuration
    api_key = os.getenv("IMAGE_GOOGLE_API_KEY") or os.getenv("GOOGLE_API_KEY")
    model = os.getenv("IMAGE_GOOGLE_MODEL") or "gemini-2.0-flash-preview-image-generation"
    
    response = await ChatGoogleGenerativeAI(
        model=model,
        google_api_key=api_key
    ).ainvoke([prompt], generation_config={"response_modalities": ["TEXT", "IMAGE"]})

    image_block = next(
        block
        for block in response.content
        if isinstance(block, dict) and block.get("image_url")
    )

    base64_image = image_block["image_url"].get("url").split(",")[-1]
    image_path = os.path.join(output_directory, f"{str(uuid.uuid4())}.jpg")
    with open(image_path, "wb") as f:
        f.write(base64.b64decode(base64_image))

    return image_path


async def get_image_from_pexels(prompt: str, output_directory: str) -> str:
    # Use image generation configuration
    api_key = os.getenv("IMAGE_PEXELS_API_KEY") or os.getenv("PEXELS_API_KEY")
    
    async with aiohttp.ClientSession() as session:
        response = await session.get(
            f"https://api.pexels.com/v1/search?query={prompt}&per_page=1",
            headers={"Authorization": f'{api_key}'},
        )
        data = await response.json()
        image_url = data["photos"][0]["src"]["large"]
        image_path = os.path.join(output_directory, f"{str(uuid.uuid4())}.jpg")
        await download_file(image_url, image_path)
        return image_path

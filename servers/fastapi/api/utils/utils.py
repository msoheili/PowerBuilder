import asyncio
import json
import os
import sys
import traceback
import re
from typing import List, Optional

import aiohttp
from fastapi import HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI

from api.models import LogMetadata, UserConfig
from api.services.logging import LoggingService


def is_ollama_selected() -> bool:
    # Check for text generation LLM first, then fallback to legacy
    text_llm = os.getenv("TEXT_LLM") or os.getenv("LLM")
    return text_llm == "ollama"


def get_large_model():
    # Use text generation configuration
    selected_llm = os.getenv("TEXT_LLM") or os.getenv("LLM")
    api_address = os.getenv("TEXT_API_ADDRESS")
    
    if selected_llm == "openai":
        if api_address:
            return ChatOpenAI(model="gpt-4.1", base_url=api_address)
        return ChatOpenAI(model="gpt-4.1")
    elif selected_llm == "google":
        api_key = os.getenv("TEXT_GOOGLE_API_KEY") or os.getenv("GOOGLE_API_KEY")
        model = os.getenv("TEXT_GOOGLE_MODEL") or "gemini-2.0-flash"
        if api_key:
            return ChatGoogleGenerativeAI(model=model, google_api_key=api_key)
        return ChatGoogleGenerativeAI(model=model)
    else:
        model_name = os.getenv("TEXT_OLLAMA_MODEL") or os.getenv("OLLAMA_MODEL")
        if api_address:
            return ChatOllama(model=model_name, base_url=api_address, temperature=0.8)
        return ChatOllama(model=model_name, temperature=0.8)


def get_small_model():
    # Use text generation configuration
    selected_llm = os.getenv("TEXT_LLM") or os.getenv("LLM")
    api_address = os.getenv("TEXT_API_ADDRESS")
    
    if selected_llm == "openai":
        if api_address:
            return ChatOpenAI(model="gpt-4.1-mini", base_url=api_address)
        return ChatOpenAI(model="gpt-4.1-mini")
    elif selected_llm == "google":
        api_key = os.getenv("TEXT_GOOGLE_API_KEY") or os.getenv("GOOGLE_API_KEY")
        model = os.getenv("TEXT_GOOGLE_MODEL") or "gemini-2.0-flash"
        if api_key:
            return ChatGoogleGenerativeAI(model=model, google_api_key=api_key)
        return ChatGoogleGenerativeAI(model=model)
    else:
        model_name = os.getenv("TEXT_OLLAMA_MODEL") or os.getenv("OLLAMA_MODEL")
        if api_address:
            return ChatOllama(model=model_name, base_url=api_address, temperature=0.8)
        return ChatOllama(model=model_name, temperature=0.8)


def get_nano_model():
    # Use text generation configuration
    selected_llm = os.getenv("TEXT_LLM") or os.getenv("LLM")
    api_address = os.getenv("TEXT_API_ADDRESS")
    
    if selected_llm == "openai":
        if api_address:
            return ChatOpenAI(model="gpt-4.1-nano", base_url=api_address)
        return ChatOpenAI(model="gpt-4.1-nano")
    elif selected_llm == "google":
        api_key = os.getenv("TEXT_GOOGLE_API_KEY") or os.getenv("GOOGLE_API_KEY")
        model = os.getenv("TEXT_GOOGLE_MODEL") or "gemini-2.0-flash"
        if api_key:
            return ChatGoogleGenerativeAI(model=model, google_api_key=api_key)
        return ChatGoogleGenerativeAI(model=model)
    else:
        model_name = os.getenv("TEXT_OLLAMA_MODEL") or os.getenv("OLLAMA_MODEL")
        if api_address:
            return ChatOllama(model=model_name, base_url=api_address, temperature=0.8)
        return ChatOllama(model=model_name, temperature=0.8)


def get_presentation_dir(presentation_id: str) -> str:
    presentation_dir = os.path.join(os.getenv("APP_DATA_DIRECTORY"), presentation_id)
    os.makedirs(presentation_dir, exist_ok=True)
    return presentation_dir


def get_presentation_images_dir(presentation_id: str) -> str:
    presentation_images_dir = os.path.join(
        get_presentation_dir(presentation_id), "images"
    )
    os.makedirs(presentation_images_dir, exist_ok=True)
    return presentation_images_dir


def get_user_config():
    user_config_path = os.getenv("USER_CONFIG_PATH")

    existing_config = UserConfig()
    try:
        if os.path.exists(user_config_path):
            with open(user_config_path, "r") as f:
                existing_config = UserConfig(**json.load(f))
    except Exception as e:
        print("Error while loading user config")
        pass

    return UserConfig(
        # Text Generation Configuration
        TEXT_LLM=existing_config.TEXT_LLM or os.getenv("TEXT_LLM") or existing_config.LLM or os.getenv("LLM"),
        TEXT_OPENAI_API_KEY=existing_config.TEXT_OPENAI_API_KEY or os.getenv("TEXT_OPENAI_API_KEY") or existing_config.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY"),
        TEXT_GOOGLE_API_KEY=existing_config.TEXT_GOOGLE_API_KEY or os.getenv("TEXT_GOOGLE_API_KEY") or existing_config.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY"),
        TEXT_OLLAMA_MODEL=existing_config.TEXT_OLLAMA_MODEL or os.getenv("TEXT_OLLAMA_MODEL") or existing_config.OLLAMA_MODEL or os.getenv("OLLAMA_MODEL"),
        TEXT_API_ADDRESS=existing_config.TEXT_API_ADDRESS or os.getenv("TEXT_API_ADDRESS"),
        
        # Image Generation Configuration
        IMAGE_LLM=existing_config.IMAGE_LLM or os.getenv("IMAGE_LLM") or existing_config.LLM or os.getenv("LLM"),
        IMAGE_OPENAI_API_KEY=existing_config.IMAGE_OPENAI_API_KEY or os.getenv("IMAGE_OPENAI_API_KEY") or existing_config.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY"),
        IMAGE_GOOGLE_API_KEY=existing_config.IMAGE_GOOGLE_API_KEY or os.getenv("IMAGE_GOOGLE_API_KEY") or existing_config.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY"),
        IMAGE_PEXELS_API_KEY=existing_config.IMAGE_PEXELS_API_KEY or os.getenv("IMAGE_PEXELS_API_KEY") or existing_config.PEXELS_API_KEY or os.getenv("PEXELS_API_KEY"),
        IMAGE_API_ADDRESS=existing_config.IMAGE_API_ADDRESS or os.getenv("IMAGE_API_ADDRESS"),
        
        # Legacy fields for backward compatibility
        LLM=existing_config.LLM or os.getenv("LLM"),
        OPENAI_API_KEY=existing_config.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY"),
        GOOGLE_API_KEY=existing_config.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY"),
        OLLAMA_MODEL=existing_config.OLLAMA_MODEL or os.getenv("OLLAMA_MODEL"),
        PEXELS_API_KEY=existing_config.PEXELS_API_KEY or os.getenv("PEXELS_API_KEY"),
    )


def update_env_with_user_config():
    user_config = get_user_config()
    
    # Update environment with text generation config
    if user_config.TEXT_LLM:
        os.environ["TEXT_LLM"] = user_config.TEXT_LLM
    if user_config.TEXT_OPENAI_API_KEY:
        os.environ["TEXT_OPENAI_API_KEY"] = user_config.TEXT_OPENAI_API_KEY
    if user_config.TEXT_GOOGLE_API_KEY:
        os.environ["TEXT_GOOGLE_API_KEY"] = user_config.TEXT_GOOGLE_API_KEY
    if user_config.TEXT_OLLAMA_MODEL:
        os.environ["TEXT_OLLAMA_MODEL"] = user_config.TEXT_OLLAMA_MODEL
    if user_config.TEXT_API_ADDRESS:
        os.environ["TEXT_API_ADDRESS"] = user_config.TEXT_API_ADDRESS
    
    # Update environment with image generation config
    if user_config.IMAGE_LLM:
        os.environ["IMAGE_LLM"] = user_config.IMAGE_LLM
    if user_config.IMAGE_OPENAI_API_KEY:
        os.environ["IMAGE_OPENAI_API_KEY"] = user_config.IMAGE_OPENAI_API_KEY
    if user_config.IMAGE_GOOGLE_API_KEY:
        os.environ["IMAGE_GOOGLE_API_KEY"] = user_config.IMAGE_GOOGLE_API_KEY
    if user_config.IMAGE_PEXELS_API_KEY:
        os.environ["IMAGE_PEXELS_API_KEY"] = user_config.IMAGE_PEXELS_API_KEY
    if user_config.IMAGE_API_ADDRESS:
        os.environ["IMAGE_API_ADDRESS"] = user_config.IMAGE_API_ADDRESS
    
    # Legacy environment updates for backward compatibility
    if user_config.LLM:
        os.environ["LLM"] = user_config.LLM
    if user_config.OPENAI_API_KEY:
        os.environ["OPENAI_API_KEY"] = user_config.OPENAI_API_KEY
    if user_config.GOOGLE_API_KEY:
        os.environ["GOOGLE_API_KEY"] = user_config.GOOGLE_API_KEY
    if user_config.OLLAMA_MODEL:
        os.environ["OLLAMA_MODEL"] = user_config.OLLAMA_MODEL
    if user_config.PEXELS_API_KEY:
        os.environ["PEXELS_API_KEY"] = user_config.PEXELS_API_KEY


def get_resource(relative_path):
    base_path = getattr(
        sys,
        "_MEIPASS",
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    )
    return os.path.join(base_path, relative_path)


def replace_file_name(old_name: str, new_name: str) -> str:
    splitted = old_name.split(".")
    if len(splitted) < 1:
        return new_name
    else:
        return ".".join([new_name, splitted[-1]])


def save_uploaded_files(
    TEMP_FILE_SERVICE, files: List[UploadFile], file_paths: List[str], temp_dir: str
) -> List:
    full_file_paths = []
    for index, each_file in enumerate(files):
        temp_file_path = TEMP_FILE_SERVICE.create_temp_file(
            file_paths[index], each_file.file.read(), dir_path=temp_dir
        )
        full_file_paths.append(temp_file_path)
    return full_file_paths


async def download_file(url: str, save_path: str, headers: Optional[dict] = None):
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    with open(save_path, "wb") as file:
                        while True:
                            chunk = await response.content.read(1024)
                            if not chunk:
                                break
                            file.write(chunk)
                    print(f"File downloaded successfully to {save_path}")
                    return True
                else:
                    print(f"Failed to download file. HTTP status: {response.status}")
                    return False
    except Exception as e:
        print(e)
        print(f"Error while downloading file from {url} to {save_path}")
        return False


async def download_files(urls: List[str], save_paths: List[str]):
    for url, save_path in zip(urls, save_paths):
        print(url)
        print(save_path)
        print("-" * 10)
    coroutines = [
        download_file(url, save_paths[index]) for index, url in enumerate(urls)
    ]
    await asyncio.gather(*coroutines)


async def handle_errors(
    func, logging_service: LoggingService, log_metadata: LogMetadata, **kwargs
):
    try:
        logging_service.logger.info(f"START", extra=log_metadata.model_dump())
        response = await func(
            logging_service=logging_service, log_metadata=log_metadata, **kwargs
        )
        is_stream = isinstance(response, StreamingResponse)
        logging_service.logger.info(
            "STREAMING" if is_stream else "END", extra=log_metadata.model_dump()
        )
        return response

    except HTTPException as e:
        log_metadata.status_code = e.status_code
        logging_service.logger.error(
            f"Raised HTTPException - {e.detail}", extra=log_metadata.model_dump()
        )
        raise e
    except Exception as e:
        print(traceback.print_stack())
        print(traceback.print_exc())

        log_metadata.status_code = 400
        logging_service.logger.critical(
            "Unhandled Exception",
            exc_info=True,
            stack_info=True,
            extra=log_metadata.model_dump(),
        )
        raise HTTPException(400, "Something went wrong while processing your request.")


def sanitize_filename(filename: str) -> str:
    name, ext = os.path.splitext(filename)
    sanitized = re.sub(r'[\\/:*?"<>|]', "_", name)
    sanitized = re.sub(r"[\s_]+", "_", sanitized)
    sanitized = sanitized.strip(" .")

    if not sanitized:
        sanitized = "untitled"

    if len(sanitized) > 200:
        sanitized = sanitized[:200]

    return sanitized + ext

import json
from typing import Optional
from pydantic import BaseModel

from api.sql_models import PresentationSqlModel


class LogMetadata(BaseModel):
    presentation: Optional[str] = None
    title: Optional[str] = None
    endpoint: Optional[str] = None
    status_code: Optional[int] = None

    @classmethod
    def from_presentation(
        cls, presentation: PresentationSqlModel, endpoint: Optional[str] = None
    ):
        return cls(
            presentation=presentation.id,
            title=presentation.title,
            endpoint=endpoint,
        )

    @property
    def stream_name(self):
        return f"Endpoint - {self.endpoint}, Presentation - {self.presentation}"


class SessionModel(BaseModel):
    session: str


class SSEResponse(BaseModel):
    event: str
    data: str

    def to_string(self):
        return f"event: {self.event}\ndata: {self.data}\n\n"


class SSEStatusResponse(BaseModel):
    status: str

    def to_string(self):
        return SSEResponse(
            event="response", data=json.dumps({"type": "status", "status": self.status})
        ).to_string()


class SSECompleteResponse(BaseModel):
    key: str
    value: object

    def to_string(self):
        return SSEResponse(
            event="response",
            data=json.dumps({"type": "complete", self.key: self.value}),
        ).to_string()


class UserConfig(BaseModel):
    # Text Generation Configuration
    TEXT_LLM: Optional[str] = None
    TEXT_OPENAI_API_KEY: Optional[str] = None
    TEXT_GOOGLE_API_KEY: Optional[str] = None
    TEXT_OLLAMA_MODEL: Optional[str] = None
    TEXT_API_ADDRESS: Optional[str] = None
    TEXT_GOOGLE_MODEL: Optional[str] = None
    
    # Image Generation Configuration
    IMAGE_LLM: Optional[str] = None
    IMAGE_OPENAI_API_KEY: Optional[str] = None
    IMAGE_GOOGLE_API_KEY: Optional[str] = None
    IMAGE_PEXELS_API_KEY: Optional[str] = None
    IMAGE_API_ADDRESS: Optional[str] = None
    IMAGE_GOOGLE_MODEL: Optional[str] = None
    
    # Legacy fields for backward compatibility
    LLM: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    OLLAMA_MODEL: Optional[str] = None
    PEXELS_API_KEY: Optional[str] = None


class OllamaModelMetadata(BaseModel):
    label: str
    value: str
    description: str
    icon: str
    size: str
    supports_graph: bool

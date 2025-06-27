interface ShapeProps {
  id: string;
  type: 'rectangle' | 'circle' | 'line';
  position: { x: number; y: number };
  size: { width: number; height: number };
  // Add other properties as needed
}

interface TextFrameProps {
  id: string;
  content: string;
  position: { x: number; y: number };
  // Add other properties as needed
}

interface LLMConfig {
  // Text Generation Configuration
  TEXT_LLM?: string;
  TEXT_OPENAI_API_KEY?: string;
  TEXT_GOOGLE_API_KEY?: string;
  TEXT_OLLAMA_MODEL?: string;
  TEXT_API_ADDRESS?: string;
  TEXT_GOOGLE_MODEL?: string;
  
  // Image Generation Configuration
  IMAGE_LLM?: string;
  IMAGE_OPENAI_API_KEY?: string;
  IMAGE_GOOGLE_API_KEY?: string;
  IMAGE_PEXELS_API_KEY?: string;
  IMAGE_API_ADDRESS?: string;
  IMAGE_GOOGLE_MODEL?: string;
  
  // Legacy fields for backward compatibility
  LLM?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  PEXELS_API_KEY?: string;
  OLLAMA_MODEL?: string;
}
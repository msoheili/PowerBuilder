import { setLLMConfig } from "@/store/slices/userConfig";
import { store } from "@/store/store";

export const handleSaveLLMConfig = async (llmConfig: LLMConfig) => {
  if (!hasValidLLMConfig(llmConfig)) {
    throw new Error('API key cannot be empty');
  }

  await fetch('/api/user-config', {
    method: 'POST',
    body: JSON.stringify(llmConfig)
  });

  store.dispatch(setLLMConfig(llmConfig));
}

export const hasValidLLMConfig = (llmConfig: LLMConfig) => {
  // Check if we have the new separate configuration structure
  const hasTextConfig = llmConfig.TEXT_LLM && (
    (llmConfig.TEXT_LLM === 'openai' && llmConfig.TEXT_OPENAI_API_KEY) ||
    (llmConfig.TEXT_LLM === 'google' && llmConfig.TEXT_GOOGLE_API_KEY) ||
    (llmConfig.TEXT_LLM === 'ollama' && llmConfig.TEXT_OLLAMA_MODEL)
  );
  
  const hasImageConfig = llmConfig.IMAGE_LLM && (
    (llmConfig.IMAGE_LLM === 'openai' && llmConfig.IMAGE_OPENAI_API_KEY) ||
    (llmConfig.IMAGE_LLM === 'google' && llmConfig.IMAGE_GOOGLE_API_KEY) ||
    (llmConfig.IMAGE_LLM === 'ollama' && llmConfig.IMAGE_PEXELS_API_KEY)
  );
  
  // Allow saving if either text or image config is valid
  if (llmConfig.TEXT_LLM || llmConfig.IMAGE_LLM) {
    return hasTextConfig || hasImageConfig;
  }
  
  // Legacy validation for backward compatibility
  if (!llmConfig.LLM) return false;
  
  const OPENAI_API_KEY = llmConfig.OPENAI_API_KEY;
  const GOOGLE_API_KEY = llmConfig.GOOGLE_API_KEY;
  const OLLAMA_MODEL = llmConfig.OLLAMA_MODEL;
  const PEXELS_API_KEY = llmConfig.PEXELS_API_KEY;
  
  return llmConfig.LLM === 'openai' ?
    OPENAI_API_KEY !== '' && OPENAI_API_KEY !== null && OPENAI_API_KEY !== undefined :
    llmConfig.LLM === 'google' ?
      GOOGLE_API_KEY !== '' && GOOGLE_API_KEY !== null && GOOGLE_API_KEY !== undefined :
      llmConfig.LLM === 'ollama' ?
        PEXELS_API_KEY !== '' && PEXELS_API_KEY !== null && PEXELS_API_KEY !== undefined && OLLAMA_MODEL !== '' && OLLAMA_MODEL !== null && OLLAMA_MODEL !== undefined :
        false;
}
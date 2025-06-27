import { NextResponse } from 'next/server';
import fs from 'fs';

const userConfigPath = process.env.USER_CONFIG_PATH!;
const canChangeKeys = process.env.CAN_CHANGE_KEYS !== 'false';

export async function GET() {
  if (!canChangeKeys) {
    return NextResponse.json({
      error: 'You are not allowed to access this resource',
    })
  }

  if (!fs.existsSync(userConfigPath)) {
    return NextResponse.json({})
  }
  const configData = fs.readFileSync(userConfigPath, 'utf-8')
  return NextResponse.json(JSON.parse(configData))
}

export async function POST(request: Request) {
  if (!canChangeKeys) {
    return NextResponse.json({
      error: 'You are not allowed to access this resource',
    })
  }

  const userConfig = await request.json()

  let existingConfig: LLMConfig = {}
  if (fs.existsSync(userConfigPath)) {
    const configData = fs.readFileSync(userConfigPath, 'utf-8')
    existingConfig = JSON.parse(configData)
  }
  
  const mergedConfig: LLMConfig = {
    // Text Generation Configuration
    TEXT_LLM: userConfig.TEXT_LLM || existingConfig.TEXT_LLM || existingConfig.LLM,
    TEXT_OPENAI_API_KEY: userConfig.TEXT_OPENAI_API_KEY || existingConfig.TEXT_OPENAI_API_KEY || existingConfig.OPENAI_API_KEY,
    TEXT_GOOGLE_API_KEY: userConfig.TEXT_GOOGLE_API_KEY || existingConfig.TEXT_GOOGLE_API_KEY || existingConfig.GOOGLE_API_KEY,
    TEXT_OLLAMA_MODEL: userConfig.TEXT_OLLAMA_MODEL || existingConfig.TEXT_OLLAMA_MODEL || existingConfig.OLLAMA_MODEL,
    TEXT_API_ADDRESS: userConfig.TEXT_API_ADDRESS || existingConfig.TEXT_API_ADDRESS,
    TEXT_GOOGLE_MODEL: userConfig.TEXT_GOOGLE_MODEL || existingConfig.TEXT_GOOGLE_MODEL,
    
    // Image Generation Configuration
    IMAGE_LLM: userConfig.IMAGE_LLM || existingConfig.IMAGE_LLM || existingConfig.LLM,
    IMAGE_OPENAI_API_KEY: userConfig.IMAGE_OPENAI_API_KEY || existingConfig.IMAGE_OPENAI_API_KEY || existingConfig.OPENAI_API_KEY,
    IMAGE_GOOGLE_API_KEY: userConfig.IMAGE_GOOGLE_API_KEY || existingConfig.IMAGE_GOOGLE_API_KEY || existingConfig.GOOGLE_API_KEY,
    IMAGE_PEXELS_API_KEY: userConfig.IMAGE_PEXELS_API_KEY || existingConfig.IMAGE_PEXELS_API_KEY || existingConfig.PEXELS_API_KEY,
    IMAGE_API_ADDRESS: userConfig.IMAGE_API_ADDRESS || existingConfig.IMAGE_API_ADDRESS,
    IMAGE_GOOGLE_MODEL: userConfig.IMAGE_GOOGLE_MODEL || existingConfig.IMAGE_GOOGLE_MODEL,
    
    // Legacy fields for backward compatibility
    LLM: userConfig.LLM || existingConfig.LLM,
    OPENAI_API_KEY: userConfig.OPENAI_API_KEY || existingConfig.OPENAI_API_KEY,
    GOOGLE_API_KEY: userConfig.GOOGLE_API_KEY || existingConfig.GOOGLE_API_KEY,
    OLLAMA_MODEL: userConfig.OLLAMA_MODEL || existingConfig.OLLAMA_MODEL,
    PEXELS_API_KEY: userConfig.PEXELS_API_KEY || existingConfig.PEXELS_API_KEY,
  }
  fs.writeFileSync(userConfigPath, JSON.stringify(mergedConfig))
  return NextResponse.json(mergedConfig)
} 
'use client';
import React, { useState, useEffect } from "react";
import Header from "../dashboard/components/Header";
import Wrapper from "@/components/Wrapper";
import { Settings, Key, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RootState } from "@/store/store";
import { useSelector } from "react-redux";
import { handleSaveLLMConfig } from "@/utils/storeHelpers";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
    openai: {
        title: "OpenAI API Key",
        description: "Required for using OpenAI services",
        placeholder: "Enter your OpenAI API key",
    },
    google: {
        title: "Google API Key",
        description: "Required for using Google services",
        placeholder: "Enter your Google API key",
    },
    ollama: {
        title: "Ollama API Key",
        description: "Required for using Ollama services",
        placeholder: "Choose a model",
    },
    pexels: {
        title: "Pexels API Key",
        description: "Required for using Pexels image service",
        placeholder: "Enter your Pexels API key",
    }
};

const DEFAULT_TEXT_API_ADDRESSES: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta',
    ollama: 'http://localhost:11434',
};

const DEFAULT_IMAGE_API_ADDRESSES: Record<string, string> = {
    openai: 'https://api.openai.com/v1/images',
    ollama: 'http://localhost:11434',
    pexels: 'https://api.pexels.com/v1',
};

const GOOGLE_MODELS = {
    text: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    image: ['gemini-2.0-flash-preview-image-generation']
};

interface ProviderConfig {
    title: string;
    description: string;
    placeholder: string;
}

const SettingsPage = () => {
    const router = useRouter();

    const userConfigState = useSelector((state: RootState) => state.userConfig);
    const [llmConfig, setLlmConfig] = useState(userConfigState.llm_config);
    const canChangeKeys = userConfigState.can_change_keys;
    const [ollamaModels, setOllamaModels] = useState<{
        label: string;
        value: string;
        description: string;
        size: string;
        icon: string;
    }[]>([]);
    const [downloadingModel, setDownloadingModel] = useState({
        name: '',
        size: null,
        downloaded: null,
        status: '',
        done: false,
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [textApiAddress, setTextApiAddress] = useState(() => DEFAULT_TEXT_API_ADDRESSES[llmConfig.TEXT_LLM || llmConfig.LLM || 'openai'] || '');
    const [imageApiAddress, setImageApiAddress] = useState(() => DEFAULT_IMAGE_API_ADDRESSES[llmConfig.IMAGE_LLM || llmConfig.LLM || 'openai'] || '');

    const api_key_changed = (apiKey: string, type: 'text' | 'image', provider: string) => {
        if (type === 'text') {
            if (provider === 'openai') {
                setLlmConfig({ ...llmConfig, TEXT_OPENAI_API_KEY: apiKey });
            } else if (provider === 'google') {
                setLlmConfig({ ...llmConfig, TEXT_GOOGLE_API_KEY: apiKey });
            } else if (provider === 'ollama') {
                setLlmConfig({ ...llmConfig, TEXT_OLLAMA_MODEL: apiKey });
            }
        } else {
            if (provider === 'openai') {
                setLlmConfig({ ...llmConfig, IMAGE_OPENAI_API_KEY: apiKey });
            } else if (provider === 'google') {
                setLlmConfig({ ...llmConfig, IMAGE_GOOGLE_API_KEY: apiKey });
            } else if (provider === 'ollama') {
                setLlmConfig({ ...llmConfig, IMAGE_PEXELS_API_KEY: apiKey });
            } else if (provider === 'pexels') {
                setLlmConfig({ ...llmConfig, IMAGE_PEXELS_API_KEY: apiKey });
            }
        }
    };

    const api_address_changed = (address: string, type: 'text' | 'image') => {
        if (type === 'text') {
            setTextApiAddress(address);
            setLlmConfig({ ...llmConfig, TEXT_API_ADDRESS: address });
        } else {
            setImageApiAddress(address);
            setLlmConfig({ ...llmConfig, IMAGE_API_ADDRESS: address });
        }
    };

    const changeProvider = (provider: string, type: 'text' | 'image') => {
        if (type === 'text') {
            setLlmConfig({ ...llmConfig, TEXT_LLM: provider });
        } else {
            setLlmConfig({ ...llmConfig, IMAGE_LLM: provider });
        }
    };

    const getCurrentProvider = (type: 'text' | 'image') => {
        if (type === 'text') {
            return llmConfig.TEXT_LLM || llmConfig.LLM || 'openai';
        } else {
            return llmConfig.IMAGE_LLM || llmConfig.LLM || 'openai';
        }
    };

    const getCurrentApiKey = (type: 'text' | 'image', provider: string) => {
        if (type === 'text') {
            if (provider === 'openai') {
                return llmConfig.TEXT_OPENAI_API_KEY || llmConfig.OPENAI_API_KEY || '';
            } else if (provider === 'google') {
                return llmConfig.TEXT_GOOGLE_API_KEY || llmConfig.GOOGLE_API_KEY || '';
            } else if (provider === 'ollama') {
                return llmConfig.TEXT_OLLAMA_MODEL || llmConfig.OLLAMA_MODEL || '';
            }
        } else {
            if (provider === 'openai') {
                return llmConfig.IMAGE_OPENAI_API_KEY || llmConfig.OPENAI_API_KEY || '';
            } else if (provider === 'google') {
                return llmConfig.IMAGE_GOOGLE_API_KEY || llmConfig.GOOGLE_API_KEY || '';
            } else if (provider === 'ollama') {
                return llmConfig.IMAGE_PEXELS_API_KEY || llmConfig.PEXELS_API_KEY || '';
            } else if (provider === 'pexels') {
                return llmConfig.IMAGE_PEXELS_API_KEY || llmConfig.PEXELS_API_KEY || '';
            }
        }
        return '';
    };

    const getCurrentApiAddress = (type: 'text' | 'image') => {
        if (type === 'text') {
            return llmConfig.TEXT_API_ADDRESS || '';
        } else {
            return llmConfig.IMAGE_API_ADDRESS || '';
        }
    };

    const handleSaveConfig = async () => {
        if (llmConfig.LLM === 'ollama') {
            try {
                setIsLoading(true);
                await pullOllamaModels();
                toast({
                    title: 'Success',
                    description: 'Model downloaded successfully',
                });
            } catch (error) {
                console.error('Error pulling model:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to download model. Please try again.',
                    variant: 'destructive',
                });
                setIsLoading(false);
                return;
            }
        }
        try {
            await handleSaveLLMConfig(llmConfig);
            toast({
                title: 'Success',
                description: 'Configuration saved successfully',
            });
            setIsLoading(false);
            router.back();
        } catch (error) {
            console.error('Error:', error);
            toast({
                title: 'Error',
                description: 'Failed to save configuration',
                variant: 'destructive',
            });
            setIsLoading(false);
        }
    };

    const pullOllamaModels = async (): Promise<void> => {
        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                try {
                    const response = await fetch(`/api/v1/ppt/ollama/pull-model?name=${llmConfig.OLLAMA_MODEL}`);
                    if (response.status === 200) {

                        const data = await response.json();

                        if (data.done) {
                            clearInterval(interval);
                            setDownloadingModel(data);
                            resolve();
                        } else {
                            setDownloadingModel(data);
                        }
                    } else {
                        clearInterval(interval);
                        reject(new Error('Model pulling failed'));
                    }
                } catch (error) {

                    console.log('Error fetching ollama models:', error);
                    clearInterval(interval);
                    reject(error);
                }
            }, 1000);

        });
    }

    const fetchOllamaModels = async () => {
        try {
            const response = await fetch('/api/v1/ppt/ollama/list-supported-models');
            const data = await response.json();
            setOllamaModels(data.models);
        } catch (error) {
            console.error('Error fetching ollama models:', error);
        }
    }

    useEffect(() => {
        if (!canChangeKeys) {
            router.push("/dashboard");
        }
        if (userConfigState.llm_config.LLM === 'ollama') {
            fetchOllamaModels();
        }
    }, [userConfigState.llm_config.LLM]);

    useEffect(() => {
        const defaultAddr = DEFAULT_TEXT_API_ADDRESSES[llmConfig.TEXT_LLM || llmConfig.LLM || 'openai'] || '';
        if (!textApiAddress || Object.values(DEFAULT_TEXT_API_ADDRESSES).includes(textApiAddress)) {
            setTextApiAddress(defaultAddr);
            setLlmConfig((prev) => ({ ...prev, TEXT_API_ADDRESS: defaultAddr }));
        }
        // eslint-disable-next-line
    }, [llmConfig.TEXT_LLM]);

    useEffect(() => {
        const defaultAddr = DEFAULT_IMAGE_API_ADDRESSES[llmConfig.IMAGE_LLM || llmConfig.LLM || 'openai'] || '';
        if (!imageApiAddress || Object.values(DEFAULT_IMAGE_API_ADDRESSES).includes(imageApiAddress)) {
            setImageApiAddress(defaultAddr);
            setLlmConfig((prev) => ({ ...prev, IMAGE_API_ADDRESS: defaultAddr }));
        }
        // eslint-disable-next-line
    }, [llmConfig.IMAGE_LLM]);

    if (!canChangeKeys) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#E9E8F8] font-instrument_sans">
            <Header />
            <Wrapper className="lg:w-[80%]">
                <div className="py-8 space-y-6">
                    {/* Settings Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <Settings className="w-8 h-8 text-blue-600" />
                        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
                    </div>

                    {/* First-time user guidance */}
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-yellow-800">First time here?</span>
                            <span className="text-yellow-700">Please configure at least one of the following: <b>Text Generation</b> or <b>Image Generation</b>. For best results, set up both.</span>
                        </div>
                    </div>

                    {/* Text Generation Configuration Section */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Key className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-medium text-gray-900">Text Generation Configuration</h2>
                        </div>

                        {/* Provider Selection */}
                        <div className="mb-8">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Select AI Provider
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.keys(PROVIDER_CONFIGS).map((provider) => (
                                    <button
                                        key={provider}
                                        onClick={() => changeProvider(provider, 'text')}
                                        className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${getCurrentProvider('text') === provider
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-blue-200 hover:bg-gray-50"
                                            }`}
                                    >
                                        <div className="flex items-center justify-center gap-3">
                                            <span
                                                className={`font-medium text-center ${getCurrentProvider('text') === provider
                                                    ? "text-blue-700"
                                                    : "text-gray-700"
                                                    }`}
                                            >
                                                {provider.charAt(0).toUpperCase() + provider.slice(1)}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* API Address Input */}
                        {getCurrentProvider('text') !== 'google' && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    API Address (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={textApiAddress}
                                    onChange={(e) => api_address_changed(e.target.value, 'text')}
                                    className="w-full px-4 py-2.5 border border-gray-300 outline-none rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    placeholder="https://api.openai.com/v1 (leave empty for default)"
                                />
                                <p className="mt-2 text-sm text-gray-500">Custom API endpoint for text generation (optional)</p>
                            </div>
                        )}

                        {getCurrentProvider('text') === 'google' && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Model Name
                                </label>
                                <select
                                    value={llmConfig.TEXT_GOOGLE_MODEL || 'gemini-2.0-flash'}
                                    onChange={(e) => setLlmConfig({ ...llmConfig, TEXT_GOOGLE_MODEL: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 outline-none rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                >
                                    {GOOGLE_MODELS.text.map(model => (
                                        <option key={model} value={model}>{model}</option>
                                    ))}
                                </select>
                                <p className="mt-2 text-sm text-gray-500">Select the Google Gemini model for text generation</p>
                            </div>
                        )}

                        {/* API Key Input */}
                        {getCurrentProvider('text') !== 'ollama' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {PROVIDER_CONFIGS[getCurrentProvider('text')!].title}
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={getCurrentApiKey('text', getCurrentProvider('text'))}
                                            onChange={(e) => api_key_changed(e.target.value, 'text', getCurrentProvider('text'))}
                                            className="flex-1 px-4 py-2.5 border border-gray-300 outline-none rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                            placeholder={PROVIDER_CONFIGS[getCurrentProvider('text')!].placeholder}
                                        />
                                        <button
                                            onClick={handleSaveConfig}
                                            disabled={isLoading}
                                            className={`px-4 py-2 rounded-lg transition-colors ${isLoading
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                                } text-white`}
                                        >
                                            {isLoading ? (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Saving...
                                                </div>
                                            ) : (
                                                'Save'
                                            )}
                                        </button>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-500">{PROVIDER_CONFIGS[getCurrentProvider('text')!].description}</p>
                                </div>
                            </div>
                        )}

                        {/* Ollama Configuration */}
                        {getCurrentProvider('text') === 'ollama' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Choose a supported model
                                    </label>
                                    <div className="w-full">
                                        {ollamaModels.length > 0 ? (
                                            <Select value={llmConfig.OLLAMA_MODEL} onValueChange={(value) => setLlmConfig({ ...llmConfig, OLLAMA_MODEL: value })}>
                                                <SelectTrigger className="w-full h-12 px-4 py-4 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors hover:border-gray-400">
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex gap-3 items-center">
                                                            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <img
                                                                    src={ollamaModels.find(m => m.value === llmConfig.OLLAMA_MODEL)?.icon}
                                                                    alt={`${llmConfig.OLLAMA_MODEL} icon`}
                                                                    className="rounded-sm"
                                                                />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {llmConfig.OLLAMA_MODEL ? (
                                                                    ollamaModels.find(m => m.value === llmConfig.OLLAMA_MODEL)?.label || llmConfig.OLLAMA_MODEL
                                                                ) : (
                                                                    'Select a model'
                                                                )}
                                                            </span>
                                                            {llmConfig.OLLAMA_MODEL && (
                                                                <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-1">
                                                                    {ollamaModels.find(m => m.value === llmConfig.OLLAMA_MODEL)?.size}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="max-h-80">
                                                    <div className="p-2">
                                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pt-3 px-2">
                                                            Available Models
                                                        </div>
                                                        {ollamaModels.map((model, index) => (
                                                            <SelectItem
                                                                key={index}
                                                                value={model.value}
                                                                className="relative cursor-pointer rounded-md py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
                                                            >
                                                                <div className="flex gap-3 items-center">
                                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                        <img
                                                                            src={model.icon}
                                                                            alt={`${model.label} icon`}
                                                                            className=" rounded-sm"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col space-y-1 flex-1">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span className="text-sm font-medium text-gray-900 capitalize">
                                                                                {model.label}
                                                                            </span>
                                                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                                                {model.size}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-xs text-gray-600 leading-relaxed">
                                                                            {model.description}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </div>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="w-full border border-gray-300 rounded-lg p-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-4 h-4 bg-gray-200 rounded-full animate-pulse"></div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                                                        <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {ollamaModels.length === 0 && (
                                        <p className="mt-2 text-sm text-gray-500">
                                            Loading available models...
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Pexels API Key (required for images)
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            required
                                            placeholder="Enter your Pexels API key"
                                            className="flex-1 px-4 py-2.5 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                            value={getCurrentApiKey('image', getCurrentProvider('image'))}
                                            onChange={(e) => api_key_changed(e.target.value, 'image', getCurrentProvider('image'))}
                                        />
                                        <button
                                            onClick={handleSaveConfig}
                                            disabled={isLoading || !llmConfig.OLLAMA_MODEL}
                                            className={`px-4 py-2 rounded-lg transition-colors ${isLoading || !llmConfig.OLLAMA_MODEL
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                                } text-white`}
                                        >
                                            {isLoading ? (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    {downloadingModel.downloaded || 0 > 0
                                                        ? `Downloading (${(((downloadingModel.downloaded || 0) / (downloadingModel.size || 1)) * 100).toFixed(0)}%)`
                                                        : 'Saving...'
                                                    }
                                                </div>
                                            ) : (
                                                !llmConfig.OLLAMA_MODEL ? 'Select Model' : 'Save'
                                            )}
                                        </button>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-500">Required for using Ollama services with image generation</p>
                                </div>
                                {downloadingModel.status && downloadingModel.status !== 'pulled' && (
                                    <div className="text-sm text-center bg-green-100 rounded-lg p-2 font-semibold capitalize text-gray-600">
                                        {downloadingModel.status}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Image Generation Configuration Section */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Key className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-medium text-gray-900">Image Generation Configuration</h2>
                        </div>

                        {/* Provider Selection */}
                        <div className="mb-8">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Select Image Generation Provider
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.keys(PROVIDER_CONFIGS).map((provider) => (
                                    <button
                                        key={provider}
                                        onClick={() => changeProvider(provider, 'image')}
                                        className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${getCurrentProvider('image') === provider
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-blue-200 hover:bg-gray-50"
                                            }`}
                                    >
                                        <div className="flex items-center justify-center gap-3">
                                            <span
                                                className={`font-medium text-center ${getCurrentProvider('image') === provider
                                                    ? "text-blue-700"
                                                    : "text-gray-700"
                                                    }`}
                                            >
                                                {provider.charAt(0).toUpperCase() + provider.slice(1)}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* API Address Input */}
                        {getCurrentProvider('image') !== 'google' && getCurrentProvider('image') !== 'pexels' && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    API Address (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={imageApiAddress}
                                    onChange={(e) => api_address_changed(e.target.value, 'image')}
                                    className="w-full px-4 py-2.5 border border-gray-300 outline-none rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    placeholder="https://api.openai.com/v1/images (leave empty for default)"
                                />
                                <p className="mt-2 text-sm text-gray-500">Custom API endpoint for image generation (optional)</p>
                            </div>
                        )}

                        {getCurrentProvider('image') === 'google' && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Model Name
                                </label>
                                <select
                                    value={llmConfig.IMAGE_GOOGLE_MODEL || 'gemini-2.0-flash-preview-image-generation'}
                                    onChange={(e) => setLlmConfig({ ...llmConfig, IMAGE_GOOGLE_MODEL: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 outline-none rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                >
                                    {GOOGLE_MODELS.image.map(model => (
                                        <option key={model} value={model}>{model}</option>
                                    ))}
                                </select>
                                <p className="mt-2 text-sm text-gray-500">Select the Google Gemini model for image generation</p>
                            </div>
                        )}

                        {/* API Key Input */}
                        {getCurrentProvider('image') !== 'ollama' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {PROVIDER_CONFIGS[getCurrentProvider('image')!].title}
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={getCurrentApiKey('image', getCurrentProvider('image'))}
                                            onChange={(e) => api_key_changed(e.target.value, 'image', getCurrentProvider('image'))}
                                            className="flex-1 px-4 py-2.5 border border-gray-300 outline-none rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                            placeholder={PROVIDER_CONFIGS[getCurrentProvider('image')!].placeholder}
                                        />
                                        <button
                                            onClick={handleSaveConfig}
                                            disabled={isLoading}
                                            className={`px-4 py-2 rounded-lg transition-colors ${isLoading
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                                } text-white`}
                                        >
                                            {isLoading ? (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Saving...
                                                </div>
                                            ) : (
                                                'Save'
                                            )}
                                        </button>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-500">{PROVIDER_CONFIGS[getCurrentProvider('image')!].description}</p>
                                </div>
                            </div>
                        )}

                        {/* Ollama Image Configuration */}
                        {getCurrentProvider('image') === 'ollama' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Pexels API Key (required for images)
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            required
                                            placeholder="Enter your Pexels API key"
                                            className="flex-1 px-4 py-2.5 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                            value={getCurrentApiKey('image', 'ollama')}
                                            onChange={(e) => api_key_changed(e.target.value, 'image', 'ollama')}
                                        />
                                        <button
                                            onClick={handleSaveConfig}
                                            disabled={isLoading}
                                            className={`px-4 py-2 rounded-lg transition-colors ${isLoading
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                                } text-white`}
                                        >
                                            {isLoading ? (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Saving...
                                                </div>
                                            ) : (
                                                'Save'
                                            )}
                                        </button>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-500">Required for using Ollama services with image generation</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Wrapper>
        </div>
    );
};

export default SettingsPage;

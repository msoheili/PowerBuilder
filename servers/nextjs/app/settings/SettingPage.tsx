'use client';
import React, { useState, useEffect } from "react";
import Header from "../dashboard/components/Header";
import Wrapper from "@/components/Wrapper";
import { Settings, Key, Loader2, Palette, Type, Layout, MessageSquare, Plus, Trash2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RootState } from "@/store/store";
import { useSelector } from "react-redux";
import { handleSaveLLMConfig } from "@/utils/storeHelpers";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import DraggableElement from "@/components/DraggableElement";

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

// Theme creation interfaces
interface CustomTheme {
    id: string;
    name: string;
    colors: {
        background: string;
        slideBg: string;
        slideTitle: string;
        slideHeading: string;
        slideDescription: string;
        slideBox: string;
        iconBg: string;
        chartColors: string[];
    };
    font: {
        family: string;
        size: number;
        weight: number;
    };
    layouts: {
        enabled: number[];
        custom: CustomLayout[];
    };
    prompts: {
        imagePrompt: string;
        contentStyle: string;
        slideStructure: string;
    };
    isActive: boolean;
}

interface CustomLayout {
    id: string;
    name: string;
    type: string;
    structure: {
        x: number;
        y: number;
        width: number;
        height: number;
        content?: string;
        items?: string[];
        src?: string;
        chartType?: string;
        [key: string]: any;
    };
    preview: string;
}

const AVAILABLE_FONTS = [
    { value: "Inter", label: "Inter", family: "var(--font-inter)" },
    { value: "Fraunces", label: "Fraunces", family: "var(--font-fraunces)" },
    { value: "Montserrat", label: "Montserrat", family: "var(--font-montserrat)" },
    { value: "Inria Serif", label: "Inria Serif", family: "var(--font-inria-serif)" },
    { value: "Instrument Sans", label: "Instrument Sans", family: "var(--font-instrument-sans)" },
];

const AVAILABLE_LAYOUTS = [
    { id: 1, name: "Title + Content", type: "type1", description: "Title with content and image" },
    { id: 2, name: "List Layout", type: "type2", description: "Bullet points or numbered list" },
    { id: 4, name: "Grid Layout", type: "type4", description: "Grid of content items" },
    { id: 5, name: "Chart Layout", type: "type5", description: "Chart with description" },
    { id: 6, name: "Timeline", type: "type6", description: "Timeline layout" },
    { id: 7, name: "Icon Grid", type: "type7", description: "Icons with descriptions" },
    { id: 8, name: "Icon List", type: "type8", description: "Icons with list items" },
    { id: 9, name: "Numbered List", type: "type9", description: "Numbered list layout" },
];

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

    // Theme creation state
    const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
    const [activeThemeTab, setActiveThemeTab] = useState<string>("general");
    const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);
    const [showThemeCreator, setShowThemeCreator] = useState(false);

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

    // Theme creation functions
    const createNewTheme = () => {
        const newTheme: CustomTheme = {
            id: `theme_${Date.now()}`,
            name: "New Custom Theme",
            colors: {
                background: "#f8fafc",
                slideBg: "#ffffff",
                slideTitle: "#1e293b",
                slideHeading: "#334155",
                slideDescription: "#64748b",
                slideBox: "#f1f5f9",
                iconBg: "#3b82f6",
                chartColors: ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"],
            },
            font: {
                family: "Inter",
                size: 16,
                weight: 400,
            },
            layouts: {
                enabled: [1, 2, 4, 5, 6, 7, 8, 9],
                custom: [],
            },
            prompts: {
                imagePrompt: "Modern and professional with clean lines and minimal design. Use a sophisticated color palette with subtle gradients and professional typography.",
                contentStyle: "Professional and engaging content with clear hierarchy and concise messaging.",
                slideStructure: "Balanced layout with clear visual hierarchy, appropriate spacing, and professional presentation style.",
            },
            isActive: false,
        };
        setEditingTheme(newTheme);
        setShowThemeCreator(true);
    };

    const saveTheme = async (theme: CustomTheme) => {
        try {
            // Save theme to localStorage or API
            const existingThemes = customThemes.filter(t => t.id !== theme.id);
            const updatedThemes = [...existingThemes, theme];
            setCustomThemes(updatedThemes);
            localStorage.setItem('customThemes', JSON.stringify(updatedThemes));
            
            // Trigger custom event to notify other components
            window.dispatchEvent(new CustomEvent('customThemesUpdated'));
            
            toast({
                title: "Success",
                description: `Theme "${theme.name}" saved successfully`,
            });
            
            setShowThemeCreator(false);
            setEditingTheme(null);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save theme",
                variant: "destructive",
            });
        }
    };

    const deleteTheme = (themeId: string) => {
        const updatedThemes = customThemes.filter(t => t.id !== themeId);
        setCustomThemes(updatedThemes);
        localStorage.setItem('customThemes', JSON.stringify(updatedThemes));
        
        // Trigger custom event to notify other components
        window.dispatchEvent(new CustomEvent('customThemesUpdated'));
        
        toast({
            title: "Success",
            description: "Theme deleted successfully",
        });
    };

    const editTheme = (theme: CustomTheme) => {
        setEditingTheme(theme);
        setShowThemeCreator(true);
    };

    const toggleLayout = (themeId: string, layoutId: number) => {
        setCustomThemes((prev: CustomTheme[]) => prev.map(theme => {
            if (theme.id === themeId) {
                const enabled = theme.layouts.enabled.includes(layoutId)
                    ? theme.layouts.enabled.filter(id => id !== layoutId)
                    : [...theme.layouts.enabled, layoutId];
                return { ...theme, layouts: { ...theme.layouts, enabled } };
            }
            return theme;
        }));
    };

    // Dynamic layout builder functions
    const addElement = (type: string, name: string) => {
        if (!editingTheme) return;
        
        // Calculate better positioning based on existing elements
        const existingElements = editingTheme.layouts.custom;
        let x = 10, y = 10;
        
        if (existingElements.length > 0) {
            // Find a position that doesn't overlap with existing elements
            const gridSize = 20; // Grid size for positioning
            const maxAttempts = 50;
            let attempts = 0;
            
            while (attempts < maxAttempts) {
                x = Math.floor(Math.random() * 5) * gridSize + 10; // 10, 30, 50, 70, 90
                y = Math.floor(Math.random() * 4) * gridSize + 10; // 10, 30, 50, 70
                
                // Check if this position overlaps with existing elements
                const overlaps = existingElements.some(element => {
                    const elementRight = element.structure.x + element.structure.width;
                    const elementBottom = element.structure.y + element.structure.height;
                    const newRight = x + 30; // Default width
                    const newBottom = y + 20; // Default height
                    
                    return !(x >= elementRight || newRight <= element.structure.x ||
                           y >= elementBottom || newBottom <= element.structure.y);
                });
                
                if (!overlaps) break;
                attempts++;
            }
        }
        
        const newElement: CustomLayout = {
            id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name,
            type: type,
            structure: {
                x: x,
                y: y,
                width: 30,
                height: 20,
                content: '',
                items: [],
                src: '',
                chartType: 'bar'
            },
            preview: ''
        };
        
        setEditingTheme({
            ...editingTheme,
            id: editingTheme.id,
            layouts: {
                ...editingTheme.layouts,
                custom: [...editingTheme.layouts.custom, newElement]
            }
        });
    };

    const removeElement = (elementId: string) => {
        if (!editingTheme) return;
        
        setEditingTheme({
            ...editingTheme,
            id: editingTheme.id,
            layouts: {
                ...editingTheme.layouts,
                custom: editingTheme.layouts.custom.filter(element => element.id !== elementId)
            }
        });
    };

    const updateElementProperty = (elementId: string, property: string, value: any) => {
        if (!editingTheme) return;
        
        setEditingTheme({
            ...editingTheme,
            id: editingTheme.id,
            layouts: {
                ...editingTheme.layouts,
                custom: (editingTheme.layouts.custom || []).filter(Boolean).map(element => {
                    if (element.id === elementId) {
                        return {
                            ...element,
                            structure: {
                                ...element.structure,
                                [property]: value
                            }
                        };
                    }
                    return element;
                })
            }
        });
    };

    // Load saved themes on component mount
    useEffect(() => {
        const savedThemes = localStorage.getItem('customThemes');
        if (savedThemes) {
            setCustomThemes(JSON.parse(savedThemes));
        }
    }, []);

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

                    {/* Custom Theme Creation Section */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Palette className="w-5 h-5 text-blue-600" />
                                <h2 className="text-lg font-medium text-gray-900">Custom Theme Creation</h2>
                            </div>
                            <Button
                                onClick={createNewTheme}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create New Theme
                            </Button>
                        </div>

                        {/* Existing Custom Themes */}
                        {customThemes.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-md font-medium text-gray-700 mb-4">Your Custom Themes</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {customThemes.map((theme) => (
                                        <Card key={theme.id} className="relative">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-sm">{theme.name}</CardTitle>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => editTheme(theme)}
                                                            className="h-6 w-6 p-0"
                                                        >
                                                            <Palette className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => deleteTheme(theme.id)}
                                                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.colors.slideBg }}></div>
                                                        <span className="text-xs text-gray-600">{theme.font.family}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {(Array.isArray(theme?.layouts?.enabled) ? theme.layouts.enabled : []).slice(0, 3).map((layoutId) => {
                                                            const layout = AVAILABLE_LAYOUTS.find(l => l.id === layoutId);
                                                            return layout ? (
                                                                <Badge key={layoutId} variant="secondary" className="text-xs">
                                                                    {layout.name}
                                                                </Badge>
                                                            ) : null;
                                                        })}
                                                        {(Array.isArray(theme?.layouts?.enabled) ? theme.layouts.enabled : []).length > 3 && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                +{(Array.isArray(theme?.layouts?.enabled) ? theme.layouts.enabled : []).length - 3} more
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {customThemes.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <Palette className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>No custom themes created yet.</p>
                                <p className="text-sm">Create your first custom theme to get started!</p>
                            </div>
                        )}
                    </div>
                </div>
            </Wrapper>

            {/* Theme Creator Modal */}
            {showThemeCreator && editingTheme && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-semibold">Create Custom Theme</h2>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setShowThemeCreator(false);
                                    setEditingTheme(null);
                                }}
                            >
                                ×
                            </Button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            <Tabs value={activeThemeTab} onValueChange={setActiveThemeTab}>
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="general">General</TabsTrigger>
                                    <TabsTrigger value="colors">Colors</TabsTrigger>
                                    <TabsTrigger value="layouts">Layouts</TabsTrigger>
                                    <TabsTrigger value="prompts">Prompts</TabsTrigger>
                                </TabsList>

                                <TabsContent value="general" className="space-y-4">
                                    <div>
                                        <Label htmlFor="theme-name">Theme Name</Label>
                                        <Input
                                            id="theme-name"
                                            value={editingTheme.name}
                                            onChange={(e) => setEditingTheme({ ...editingTheme, name: e.target.value })}
                                            placeholder="Enter theme name"
                                        />
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="font-family">Font Family</Label>
                                        <Select
                                            value={editingTheme.font.family}
                                            onValueChange={(value) => setEditingTheme({
                                                ...editingTheme,
                                                font: { ...editingTheme.font, family: value }
                                            })}
                                        >
                                            <SelectTrigger>
                                                <SelectContent>
                                                    {AVAILABLE_FONTS.map((font) => (
                                                        <SelectItem key={font.value} value={font.value}>
                                                            {font.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </SelectTrigger>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="font-size">Font Size (px)</Label>
                                            <Input
                                                id="font-size"
                                                type="number"
                                                value={editingTheme.font.size}
                                                onChange={(e) => setEditingTheme({
                                                    ...editingTheme,
                                                    font: { ...editingTheme.font, size: parseInt(e.target.value) }
                                                })}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="font-weight">Font Weight</Label>
                                            <Input
                                                id="font-weight"
                                                type="number"
                                                min="100"
                                                max="900"
                                                step="100"
                                                value={editingTheme.font.weight}
                                                onChange={(e) => setEditingTheme({
                                                    ...editingTheme,
                                                    font: { ...editingTheme.font, weight: parseInt(e.target.value) }
                                                })}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="colors" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="background">Background Color</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="background"
                                                    type="color"
                                                    value={editingTheme.colors.background}
                                                    onChange={(e) => setEditingTheme({
                                                        ...editingTheme,
                                                        colors: { ...editingTheme.colors, background: e.target.value }
                                                    })}
                                                    className="w-16 h-10"
                                                />
                                                <Input
                                                    value={editingTheme.colors.background}
                                                    onChange={(e) => setEditingTheme({
                                                        ...editingTheme,
                                                        colors: { ...editingTheme.colors, background: e.target.value }
                                                    })}
                                                    placeholder="#ffffff"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="slide-bg">Slide Background</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="slide-bg"
                                                    type="color"
                                                    value={editingTheme.colors.slideBg}
                                                    onChange={(e) => setEditingTheme({
                                                        ...editingTheme,
                                                        colors: { ...editingTheme.colors, slideBg: e.target.value }
                                                    })}
                                                    className="w-16 h-10"
                                                />
                                                <Input
                                                    value={editingTheme.colors.slideBg}
                                                    onChange={(e) => setEditingTheme({
                                                        ...editingTheme,
                                                        colors: { ...editingTheme.colors, slideBg: e.target.value }
                                                    })}
                                                    placeholder="#ffffff"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="slide-title">Title Color</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="slide-title"
                                                    type="color"
                                                    value={editingTheme.colors.slideTitle}
                                                    onChange={(e) => setEditingTheme({
                                                        ...editingTheme,
                                                        colors: { ...editingTheme.colors, slideTitle: e.target.value }
                                                    })}
                                                    className="w-16 h-10"
                                                />
                                                <Input
                                                    value={editingTheme.colors.slideTitle}
                                                    onChange={(e) => setEditingTheme({
                                                        ...editingTheme,
                                                        colors: { ...editingTheme.colors, slideTitle: e.target.value }
                                                    })}
                                                    placeholder="#000000"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="slide-heading">Heading Color</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="slide-heading"
                                                    type="color"
                                                    value={editingTheme.colors.slideHeading}
                                                    onChange={(e) => setEditingTheme({
                                                        ...editingTheme,
                                                        colors: { ...editingTheme.colors, slideHeading: e.target.value }
                                                    })}
                                                    className="w-16 h-10"
                                                />
                                                <Input
                                                    value={editingTheme.colors.slideHeading}
                                                    onChange={(e) => setEditingTheme({
                                                        ...editingTheme,
                                                        colors: { ...editingTheme.colors, slideHeading: e.target.value }
                                                    })}
                                                    placeholder="#333333"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="slide-description">Description Color</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="slide-description"
                                                    type="color"
                                                    value={editingTheme.colors.slideDescription}
                                                    onChange={(e) => setEditingTheme({
                                                        ...editingTheme,
                                                        colors: { ...editingTheme.colors, slideDescription: e.target.value }
                                                    })}
                                                    className="w-16 h-10"
                                                />
                                                <Input
                                                    value={editingTheme.colors.slideDescription}
                                                    onChange={(e) => setEditingTheme({
                                                        ...editingTheme,
                                                        colors: { ...editingTheme.colors, slideDescription: e.target.value }
                                                    })}
                                                    placeholder="#666666"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="slide-box">Box Color</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="slide-box"
                                                    type="color"
                                                    value={editingTheme.colors.slideBox}
                                                    onChange={(e) => setEditingTheme({
                                                        ...editingTheme,
                                                        colors: { ...editingTheme.colors, slideBox: e.target.value }
                                                    })}
                                                    className="w-16 h-10"
                                                />
                                                <Input
                                                    value={editingTheme.colors.slideBox}
                                                    onChange={(e) => setEditingTheme({
                                                        ...editingTheme,
                                                        colors: { ...editingTheme.colors, slideBox: e.target.value }
                                                    })}
                                                    placeholder="#f5f5f5"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="icon-bg">Icon Background</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="icon-bg"
                                                    type="color"
                                                    value={editingTheme.colors.iconBg}
                                                    onChange={(e) => setEditingTheme({
                                                        ...editingTheme,
                                                        colors: { ...editingTheme.colors, iconBg: e.target.value }
                                                    })}
                                                    className="w-16 h-10"
                                                />
                                                <Input
                                                    value={editingTheme.colors.iconBg}
                                                    onChange={(e) => setEditingTheme({
                                                        ...editingTheme,
                                                        colors: { ...editingTheme.colors, iconBg: e.target.value }
                                                    })}
                                                    placeholder="#3b82f6"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <Label>Chart Colors</Label>
                                        <div className="grid grid-cols-5 gap-2 mt-2">
                                            {editingTheme.colors.chartColors.map((color, index) => (
                                                <div key={index} className="flex gap-1">
                                                    <Input
                                                        type="color"
                                                        value={color}
                                                        onChange={(e) => {
                                                            const newColors = [...editingTheme.colors.chartColors];
                                                            newColors[index] = e.target.value;
                                                            setEditingTheme({
                                                                ...editingTheme,
                                                                colors: { ...editingTheme.colors, chartColors: newColors }
                                                            });
                                                        }}
                                                        className="w-12 h-8"
                                                    />
                                                    <Input
                                                        value={color}
                                                        onChange={(e) => {
                                                            const newColors = [...editingTheme.colors.chartColors];
                                                            newColors[index] = e.target.value;
                                                            setEditingTheme({
                                                                ...editingTheme,
                                                                colors: { ...editingTheme.colors, chartColors: newColors }
                                                            });
                                                        }}
                                                        className="flex-1 text-xs"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="layouts" className="space-y-4">
                                    <div>
                                        <Label>Dynamic Slide Layout Builder</Label>
                                        <p className="text-sm text-gray-600 mb-4">Create custom slide layouts by adding and arranging elements</p>
                                        
                                        {/* Layout Preview */}
                                        <div className="mb-6">
                                            <Label className="text-sm font-medium mb-2 block">Layout Preview</Label>
                                            <div 
                                                className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 relative overflow-hidden"
                                                style={{ backgroundColor: editingTheme.colors.slideBg }}
                                                id="layout-preview-container"
                                            >
                                                {editingTheme.layouts.custom.length === 0 ? (
                                                    <div className="flex items-center justify-center h-full text-gray-500">
                                                        <div className="text-center">
                                                            <Layout className="w-8 h-8 mx-auto mb-2" />
                                                            <p>No elements added yet</p>
                                                            <p className="text-xs">Add elements below to build your layout</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 h-full relative">
                                                        {(editingTheme.layouts.custom || []).filter(Boolean).map((element, index) => (
                                                            <DraggableElement
                                                                key={element.id}
                                                                element={element}
                                                                onUpdate={(updatedElement) => {
                                                                    const newElements = [...editingTheme.layouts.custom];
                                                                    newElements[index] = updatedElement;
                                                                    setEditingTheme({
                                                                        ...editingTheme,
                                                                        layouts: { ...editingTheme.layouts, custom: newElements }
                                                                    });
                                                                }}
                                                                onRemove={() => removeElement(element.id)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Element Controls */}
                                        <div className="space-y-4">
                                            <div>
                                                <Label className="text-sm font-medium mb-2 block">Add Elements</Label>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                    <button
                                                        onClick={() => addElement('title', 'Title')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Title</div>
                                                        <div className="text-xs text-gray-600">Main heading</div>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => addElement('subtitle', 'Subtitle')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Subtitle</div>
                                                        <div className="text-xs text-gray-600">Secondary heading</div>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => addElement('text', 'Text Block')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Text Block</div>
                                                        <div className="text-xs text-gray-600">Paragraph text</div>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => addElement('bullet-list', 'Bullet List')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Bullet List</div>
                                                        <div className="text-xs text-gray-600">List items</div>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => addElement('image', 'Image')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Image</div>
                                                        <div className="text-xs text-gray-600">Photo or graphic</div>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => addElement('chart', 'Chart')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Chart</div>
                                                        <div className="text-xs text-gray-600">Data visualization</div>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => addElement('icon', 'Icon')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Icon</div>
                                                        <div className="text-xs text-gray-600">Small icon</div>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => addElement('divider', 'Divider')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Divider</div>
                                                        <div className="text-xs text-gray-600">Separator line</div>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Element Properties */}
                                            {editingTheme.layouts.custom.length > 0 && (
                                                <div>
                                                    <Label className="text-sm font-medium mb-2 block">Element Properties</Label>
                                                    <div className="space-y-3">
                                                        {(editingTheme.layouts.custom || []).filter(Boolean).map((element, index) => (
                                                            <div key={element.id} className="border border-gray-200 rounded-lg p-3">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="font-medium text-sm">{element.name}</span>
                                                                    <button
                                                                        onClick={() => removeElement(element.id)}
                                                                        className="text-red-500 hover:text-red-700 text-xs"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                                
                                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                                    <div>
                                                                        <Label className="text-xs">X Position (%)</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            value={element.structure?.x}
                                                                            onChange={(e) => updateElementProperty(element.id, 'x', parseInt(e.target.value))}
                                                                            className="h-6 text-xs"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs">Y Position (%)</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            value={element.structure?.y}
                                                                            onChange={(e) => updateElementProperty(element.id, 'y', parseInt(e.target.value))}
                                                                            className="h-6 text-xs"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs">Width (%)</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min="10"
                                                                            max="100"
                                                                            value={element.structure?.width}
                                                                            onChange={(e) => updateElementProperty(element.id, 'width', parseInt(e.target.value))}
                                                                            className="h-6 text-xs"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs">Height (%)</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min="10"
                                                                            max="100"
                                                                            value={element.structure?.height}
                                                                            onChange={(e) => updateElementProperty(element.id, 'height', parseInt(e.target.value))}
                                                                            className="h-6 text-xs"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Element-specific properties */}
                                                                {element.type === 'text' && (
                                                                    <div className="mt-2">
                                                                        <Label className="text-xs">Text Content</Label>
                                                                        <Textarea
                                                                            value={element.structure?.content || ''}
                                                                            onChange={(e) => updateElementProperty(element.id, 'content', e.target.value)}
                                                                            placeholder="Enter text content..."
                                                                            className="h-16 text-xs"
                                                                        />
                                                                    </div>
                                                                )}
                                                                
                                                                {element.type === 'bullet-list' && (
                                                                    <div className="mt-2">
                                                                        <Label className="text-xs">List Items (one per line)</Label>
                                                                        <Textarea
                                                                            value={element.structure?.items?.join('\n') || ''}
                                                                            onChange={(e) => updateElementProperty(element.id, 'items', e.target.value.split('\n').filter(item => item.trim()))}
                                                                            placeholder="Item 1&#10;Item 2&#10;Item 3"
                                                                            className="h-16 text-xs"
                                                                        />
                                                                    </div>
                                                                )}
                                                                
                                                                {element.type === 'image' && (
                                                                    <div className="mt-2">
                                                                        <Label className="text-xs">Image URL or Prompt</Label>
                                                                        <Input
                                                                            value={element.structure?.src || ''}
                                                                            onChange={(e) => updateElementProperty(element.id, 'src', e.target.value)}
                                                                            placeholder="Enter image URL or AI prompt..."
                                                                            className="h-6 text-xs"
                                                                        />
                                                                    </div>
                                                                )}
                                                                
                                                                {element.type === 'chart' && (
                                                                    <div className="mt-2">
                                                                        <Label className="text-xs">Chart Type</Label>
                                                                        <Select
                                                                            value={element.structure?.chartType || 'bar'}
                                                                            onValueChange={(value) => updateElementProperty(element.id, 'chartType', value)}
                                                                        >
                                                                            <SelectTrigger className="h-6 text-xs">
                                                                                <SelectContent>
                                                                                    <SelectItem value="bar">Bar Chart</SelectItem>
                                                                                    <SelectItem value="line">Line Chart</SelectItem>
                                                                                    <SelectItem value="pie">Pie Chart</SelectItem>
                                                                                    <SelectItem value="area">Area Chart</SelectItem>
                                                                                </SelectContent>
                                                                            </SelectTrigger>
                                                                        </Select>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="prompts" className="space-y-4">
                                    <div>
                                        <Label htmlFor="image-prompt">Image Generation Prompt</Label>
                                        <Textarea
                                            id="image-prompt"
                                            value={editingTheme.prompts.imagePrompt}
                                            onChange={(e) => setEditingTheme({
                                                ...editingTheme,
                                                prompts: { ...editingTheme.prompts, imagePrompt: e.target.value }
                                            })}
                                            placeholder="Describe the style for AI-generated images..."
                                            rows={3}
                                        />
                                        <p className="text-xs text-gray-600 mt-1">
                                            This prompt will be used to generate images that match your theme's style
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="content-style">Content Style Prompt</Label>
                                        <Textarea
                                            id="content-style"
                                            value={editingTheme.prompts.contentStyle}
                                            onChange={(e) => setEditingTheme({
                                                ...editingTheme,
                                                prompts: { ...editingTheme.prompts, contentStyle: e.target.value }
                                            })}
                                            placeholder="Describe the writing style for content..."
                                            rows={3}
                                        />
                                        <p className="text-xs text-gray-600 mt-1">
                                            This prompt will influence how content is written for your theme
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="slide-structure">Slide Structure Prompt</Label>
                                        <Textarea
                                            id="slide-structure"
                                            value={editingTheme.prompts.slideStructure}
                                            onChange={(e) => setEditingTheme({
                                                ...editingTheme,
                                                prompts: { ...editingTheme.prompts, slideStructure: e.target.value }
                                            })}
                                            placeholder="Describe the layout and structure preferences..."
                                            rows={3}
                                        />
                                        <p className="text-xs text-gray-600 mt-1">
                                            This prompt will guide how slides are structured and laid out
                                        </p>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-6 border-t">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowThemeCreator(false);
                                    setEditingTheme(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => saveTheme(editingTheme)}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Theme
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;

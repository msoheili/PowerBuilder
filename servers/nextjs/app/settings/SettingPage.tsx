'use client';
import React, { useState, useEffect, useRef } from "react";
import Header from "../dashboard/components/Header";
import Wrapper from "@/components/Wrapper";
import { Settings, Key, Loader2, Palette, Type, Layout, MessageSquare, Plus, Trash2, Save, Upload, Download } from 'lucide-react';
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
    selectedPage?: string;
    pages?: {
        [key: string]: {
            name: string;
            elements: CustomLayout[];
            description?: string;
        };
    };
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
        prompt?: string;
        font?: string;
        fontSize?: number;
        textColor?: string;
        alignment?: string;
        bulletType?: string;
        lineSpacing?: number;
        [key: string]: any;
    };
    preview: string;
    style?: {
        font?: string;
        fontSize?: number;
        textColor?: string;
        alignment?: string;
        bulletType?: string;
    };
    prompt?: string;
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
    const [importingTheme, setImportingTheme] = useState(false);

    // Drag and resize state
    const [draggingElement, setDraggingElement] = useState<CustomLayout | null>(null);
    const [resizingElement, setResizingElement] = useState<CustomLayout | null>(null);
    const [resizeDirection, setResizeDirection] = useState<string>('');
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });
    
    // Add refs to track drag/resize state more reliably
    const isDraggingRef = useRef(false);
    const isResizingRef = useRef(false);
    const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const currentDraggingElementRef = useRef<CustomLayout | null>(null);
    const currentResizingElementRef = useRef<CustomLayout | null>(null);
    const currentResizeDirectionRef = useRef<string>('');
    const dragStartRef = useRef({ x: 0, y: 0 });
    const elementStartPosRef = useRef({ x: 0, y: 0 });

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
            selectedPage: 'page1',
            pages: {
                page1: { 
                    name: 'Page 1', 
                    description: '',
                    elements: [] 
                },
            },
        };
        console.log('Creating new theme:', newTheme);
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
        // Ensure the theme has the new properties initialized
        const themeWithDefaults = {
            ...theme,
            selectedPage: theme.selectedPage || 'page1',
            pages: theme.pages || { 
                page1: { 
                    name: 'Page 1', 
                    description: '',
                    elements: [] 
                } 
            }
        };
        setEditingTheme(themeWithDefaults);
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

    const addElementToPage = (type: string, name: string) => {
        if (!editingTheme) return;
        if (!editingTheme.pages || !editingTheme.pages[editingTheme.selectedPage || 'page1']) {
            return;
        }

        const newElement: CustomLayout = {
            id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name,
            type: type,
            structure: {
                x: 10, // Default to 10% from left
                y: 10, // Default to 10% from top
                width: 30, // Default to 30% of container width
                height: 20, // Default to 20% of container height
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
            pages: {
                ...editingTheme.pages,
                [editingTheme.selectedPage || 'page1']: {
                    ...editingTheme.pages[editingTheme.selectedPage || 'page1'],
                    elements: [...editingTheme.pages[editingTheme.selectedPage || 'page1'].elements, newElement]
                }
            }
        });
    };

    const removeElementFromPage = (elementId: string) => {
        if (!editingTheme) return;
        if (!editingTheme.pages || !editingTheme.pages[editingTheme.selectedPage || 'page1']) {
            return;
        }

        setEditingTheme({
            ...editingTheme,
            id: editingTheme.id,
            pages: {
                ...editingTheme.pages,
                [editingTheme.selectedPage || 'page1']: {
                    ...editingTheme.pages[editingTheme.selectedPage || 'page1'],
                    elements: editingTheme.pages[editingTheme.selectedPage || 'page1'].elements.filter(element => element.id !== elementId)
                }
            }
        });
    };

    const updateElementPropertyInPage = (elementId: string, property: string, value: any) => {
        if (!editingTheme) return;
        if (!editingTheme.pages || !editingTheme.pages[editingTheme.selectedPage || 'page1']) {
            return;
        }

        console.log('Updating element property:', { elementId, property, value });

        setEditingTheme({
            ...editingTheme,
            id: editingTheme.id,
            pages: {
                ...editingTheme.pages,
                [editingTheme.selectedPage || 'page1']: {
                    ...editingTheme.pages[editingTheme.selectedPage || 'page1'],
                    elements: (editingTheme.pages[editingTheme.selectedPage || 'page1'].elements || []).filter(Boolean).map(element => {
                        if (element.id === elementId) {
                            console.log('Found element to update:', element.name, 'old value:', element.structure?.[property], 'new value:', value);
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
            }
        });
    };

    // Mouse event handlers for drag and resize
    const handleElementMouseDown = (e: React.MouseEvent, element: CustomLayout) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Element mouse down:', element.name, 'at', e.clientX, e.clientY);
        
        const container = document.getElementById('layout-preview-container');
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        console.log('Container rect:', rect, 'Mouse position:', { mouseX, mouseY });
        
        // Store initial mouse position and element position
        dragStartRef.current = { 
            x: mouseX, 
            y: mouseY 
        };
        elementStartPosRef.current = { 
            x: element.structure?.x || 0, 
            y: element.structure?.y || 0 
        };
        
        console.log('Initial drag setup:', {
            mouseX, mouseY,
            elementX: element.structure?.x || 0,
            elementY: element.structure?.y || 0,
            dragStart: dragStartRef.current,
            elementStart: elementStartPosRef.current
        });
        
        console.log('Drag start refs:', dragStartRef.current, 'Element start:', elementStartPosRef.current);
        
        // Set state immediately using refs
        setDraggingElement(element);
        setDragStart({ x: mouseX, y: mouseY });
        isDraggingRef.current = true;
        currentDraggingElementRef.current = element;
        
        console.log('Drag state set:', {
            isDragging: isDraggingRef.current,
            element: currentDraggingElementRef.current?.name,
            dragStart: dragStartRef.current,
            elementStart: elementStartPosRef.current,
            elementCurrentX: element.structure?.x,
            elementCurrentY: element.structure?.y
        });
        
        // Add global mouse event listeners with capture
        document.addEventListener('mousemove', handleGlobalMouseMove, { capture: true });
        document.addEventListener('mouseup', handleGlobalMouseUp, { capture: true });
        
        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'move';
        
        // Clear any existing timeout
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
        }
        
        // Add a small delay to prevent immediate mouse up
        dragTimeoutRef.current = setTimeout(() => {
            console.log('Drag state confirmed:', element.name);
        }, 10);
    };

    const handleResizeMouseDown = (e: React.MouseEvent, element: CustomLayout, direction: string = 'se') => {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        
        console.log('Resize mouse down:', element.name, direction, 'at', e.clientX, e.clientY);
        
        const container = document.getElementById('layout-preview-container');
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        console.log('Resize container rect:', rect, 'Mouse position:', { mouseX, mouseY });
        
        // Set state immediately using refs
        setResizingElement(element);
        setResizeDirection(direction);
        setResizeStart({ 
            x: mouseX, 
            y: mouseY, 
            width: element.structure?.width || 30, 
            height: element.structure?.height || 20 
        });
        isResizingRef.current = true;
        currentResizingElementRef.current = element;
        currentResizeDirectionRef.current = direction;
        
        console.log('Resize start refs:', { 
            isResizing: isResizingRef.current, 
            element: currentResizingElementRef.current?.name,
            direction: currentResizeDirectionRef.current,
            start: { x: mouseX, y: mouseY, width: element.structure?.width || 30, height: element.structure?.height || 20 }
        });
        
        // Add global mouse event listeners with capture
        document.addEventListener('mousemove', handleGlobalMouseMove, { capture: true });
        document.addEventListener('mouseup', handleGlobalMouseUp, { capture: true });
        
        // Prevent text selection during resize
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'se-resize';
        
        // Clear any existing timeout
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
        }
        
        // Add a small delay to prevent immediate mouse up
        dragTimeoutRef.current = setTimeout(() => {
            console.log('Resize state confirmed:', element.name, direction);
        }, 10);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!editingTheme) return;
        
        const container = document.getElementById('layout-preview-container');
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        
        const currentMouseX = e.clientX - rect.left;
        const currentMouseY = e.clientY - rect.top;
        
        console.log('Mouse move:', { 
            currentMouseX, 
            currentMouseY, 
            clientX: e.clientX,
            clientY: e.clientY,
            rectLeft: rect.left,
            rectTop: rect.top,
            dragging: isDraggingRef.current, 
            resizing: isResizingRef.current,
            draggingElement: currentDraggingElementRef.current?.name,
            resizingElement: currentResizingElementRef.current?.name,
            resizeDirection: currentResizeDirectionRef.current
        });
        
        // Handle dragging
        if (isDraggingRef.current && currentDraggingElementRef.current && !isResizingRef.current) {
            console.log('DRAG OPERATION DETECTED!');
            const element = currentDraggingElementRef.current;
            const deltaX = currentMouseX - dragStartRef.current.x;
            const deltaY = currentMouseY - dragStartRef.current.y;
            
            // Convert pixel deltas to percentage deltas
            const deltaXPercent = (deltaX / rect.width) * 100;
            const deltaYPercent = (deltaY / rect.height) * 100;
            
            // Calculate new position based on mouse movement
            const newX = Math.max(0, Math.min(100, 
                elementStartPosRef.current.x + deltaXPercent));
            const newY = Math.max(0, Math.min(100, 
                elementStartPosRef.current.y + deltaYPercent));
            
            console.log('Drag calculation:', {
                deltaX, deltaY,
                deltaXPercent, deltaYPercent,
                elementStartX: elementStartPosRef.current.x,
                elementStartY: elementStartPosRef.current.y,
                newX, newY,
                mouseStartX: dragStartRef.current.x,
                mouseStartY: dragStartRef.current.y,
                currentMouseX, currentMouseY
            });
            
            console.log('Dragging element:', { 
                newX, newY, deltaXPercent, deltaYPercent,
                deltaX, deltaY,
                startX: elementStartPosRef.current.x,
                startY: elementStartPosRef.current.y,
                mouseStartX: dragStartRef.current.x,
                mouseStartY: dragStartRef.current.y,
                rectWidth: rect.width,
                rectHeight: rect.height,
                currentMouseX,
                currentMouseY,
                elementWidth: element.structure?.width,
                elementHeight: element.structure?.height
            });
            
            // Force update even if values seem the same
            console.log('Setting element position:', { elementId: element.id, newX, newY, currentElementX: element.structure?.x, currentElementY: element.structure?.y });
            updateElementPropertyInPage(element.id, 'x', newX);
            updateElementPropertyInPage(element.id, 'y', newY);
        }
        
        // Handle resizing
        if (isResizingRef.current && currentResizingElementRef.current) {
            console.log('RESIZE OPERATION DETECTED!');
            const element = currentResizingElementRef.current;
            const direction = currentResizeDirectionRef.current;
            const resizeDeltaX = currentMouseX - resizeStart.x;
            const resizeDeltaY = currentMouseY - resizeStart.y;
            
            // Convert pixel deltas to percentage deltas
            const resizeDeltaXPercent = (resizeDeltaX / rect.width) * 100;
            const resizeDeltaYPercent = (resizeDeltaY / rect.height) * 100;
            
            // Get current element dimensions
            const currentWidth = element.structure?.width || 30;
            const currentHeight = element.structure?.height || 20;
            const currentX = element.structure?.x || 0;
            const currentY = element.structure?.y || 0;
            
            let newWidth = currentWidth;
            let newHeight = currentHeight;
            let newX = currentX;
            let newY = currentY;
            
            console.log('Resize calculation start:', { 
                resizeDeltaXPercent, resizeDeltaYPercent, 
                currentWidth, currentHeight, currentX, currentY,
                direction: direction
            });
            
            switch (direction) {
                case 'se': // bottom-right
                    newWidth = Math.max(10, Math.min(100 - currentX, currentWidth + resizeDeltaXPercent));
                    newHeight = Math.max(10, Math.min(100 - currentY, currentHeight + resizeDeltaYPercent));
                    break;
                case 'ne': // top-right
                    newWidth = Math.max(10, Math.min(100 - currentX, currentWidth + resizeDeltaXPercent));
                    newHeight = Math.max(10, Math.min(100, currentHeight - resizeDeltaYPercent));
                    newY = Math.max(0, Math.min(100 - newHeight, currentY + resizeDeltaYPercent));
                    break;
                case 'nw': // top-left
                    newWidth = Math.max(10, Math.min(100, currentWidth - resizeDeltaXPercent));
                    newHeight = Math.max(10, Math.min(100, currentHeight - resizeDeltaYPercent));
                    newX = Math.max(0, Math.min(100 - newWidth, currentX + resizeDeltaXPercent));
                    newY = Math.max(0, Math.min(100 - newHeight, currentY + resizeDeltaYPercent));
                    break;
                case 'sw': // bottom-left
                    newWidth = Math.max(10, Math.min(100, currentWidth - resizeDeltaXPercent));
                    newHeight = Math.max(10, Math.min(100 - currentY, currentHeight + resizeDeltaYPercent));
                    newX = Math.max(0, Math.min(100 - newWidth, currentX + resizeDeltaXPercent));
                    break;
            }
            
            console.log('Resizing element:', { 
                newWidth, newHeight, newX, newY, 
                direction: direction,
                resizeDeltaXPercent, resizeDeltaYPercent
            });
            
            // Update the element properties
            updateElementPropertyInPage(element.id, 'width', newWidth);
            updateElementPropertyInPage(element.id, 'height', newHeight);
            updateElementPropertyInPage(element.id, 'x', newX);
            updateElementPropertyInPage(element.id, 'y', newY);
            
            // Update resize start for next calculation
            setResizeStart({ x: currentMouseX, y: currentMouseY, width: newWidth, height: newHeight });
        }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
        console.log('Mouse up - clearing drag/resize state', { 
            wasDragging: isDraggingRef.current, 
            wasResizing: isResizingRef.current 
        });
        
        // Clear any existing timeout
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
            dragTimeoutRef.current = null;
        }
        
        // Remove global event listeners immediately
        document.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
        document.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });
        
        // Restore body styles
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        
        // Clear refs immediately
        isDraggingRef.current = false;
        isResizingRef.current = false;
        currentDraggingElementRef.current = null;
        currentResizingElementRef.current = null;
        currentResizeDirectionRef.current = '';
        
        // Clear state immediately
        setDraggingElement(null);
        setResizingElement(null);
        setResizeDirection('');
    };



    // Load saved themes on component mount
    useEffect(() => {
        const savedThemes = localStorage.getItem('customThemes');
        if (savedThemes) {
            setCustomThemes(JSON.parse(savedThemes));
        }
    }, []);

    // Cleanup effect
    useEffect(() => {
        return () => {
            // Clean up event listeners
            document.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
            document.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });
            
            // Clean up timeout
            if (dragTimeoutRef.current) {
                clearTimeout(dragTimeoutRef.current);
            }
            
            // Restore body styles
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, []);

    // YAML import functions
    const parseYamlTheme = (yamlContent: string): CustomTheme | null => {
        try {
            console.log('=== YAML PARSING START ===');
            console.log('Raw YAML content:', yamlContent);
            
            const lines = yamlContent.split('\n');
            console.log('Total lines in YAML:', lines.length);
            
            let theme: any = {
                name: '',
                colors: {},
                fonts: {},
                defaults: {},
                pages: {}
            };
            
            let currentPage: any = null;
            let currentElement: any = null;
            let inLayout = false;
            let inStyle = false;
            let inPosition = false;
            let inSize = false;
            
            console.log('Starting to parse lines...');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const indent = (line.match(/^\s*/)?.[0]?.length || 0);
                const trimmedLine = line.trim();
                
                console.log(`Line ${i + 1} (indent: ${indent}): "${line}"`);
                
                if (trimmedLine === '') {
                    console.log('  -> Empty line, skipping');
                    continue;
                }

                // Check for template section
                if (trimmedLine === 'template:') {
                    console.log('  -> Found template section');
                }
                // Check for theme name (indent 2)
                else if (indent === 2 && trimmedLine.startsWith('name:')) {
                    theme.name = trimmedLine.split('name:')[1].trim().replace(/"/g, '');
                    console.log('  -> Set theme name:', theme.name);
                }
                // Check for theme description (indent 2)
                else if (indent === 2 && trimmedLine.startsWith('description:')) {
                    theme.description = trimmedLine.split('description:')[1].trim().replace(/"/g, '');
                    console.log('  -> Set theme description:', theme.description);
                }
                // Check for general_style section (indent 2)
                else if (indent === 2 && trimmedLine === 'general_style:') {
                    console.log('  -> Found general_style section');
                    // Parse general style properties
                    i++;
                    while (i < lines.length && lines[i].trim() && ((lines[i].match(/^\s*/)?.[0]?.length || 0) > 2)) {
                        const styleLine = lines[i].trim();
                        console.log(`    -> Processing style line: "${styleLine}"`);
                        
                        if (styleLine.startsWith('background_color:')) {
                            theme.colors.background = styleLine.split('background_color:')[1].trim().replace(/"/g, '');
                            console.log('      -> Set background color:', theme.colors.background);
                        } else if (styleLine.startsWith('text_color:')) {
                            theme.colors.slideTitle = styleLine.split('text_color:')[1].trim().replace(/"/g, '');
                            console.log('      -> Set text color:', theme.colors.slideTitle);
                        } else if (styleLine === 'fonts:') {
                            console.log('      -> Found fonts section');
                            i++;
                            while (i < lines.length && lines[i].trim() && ((lines[i].match(/^\s*/)?.[0]?.length || 0) > 4)) {
                                const fontLine = lines[i].trim();
                                console.log(`        -> Processing font line: "${fontLine}"`);
                                
                                if (fontLine.startsWith('title:')) {
                                    theme.fonts.title = fontLine.split('title:')[1].trim().replace(/"/g, '');
                                    console.log('          -> Set title font:', theme.fonts.title);
                                } else if (fontLine.startsWith('subtitle:')) {
                                    theme.fonts.subtitle = fontLine.split('subtitle:')[1].trim().replace(/"/g, '');
                                    console.log('          -> Set subtitle font:', theme.fonts.subtitle);
                                } else if (fontLine.startsWith('heading:')) {
                                    theme.fonts.heading = fontLine.split('heading:')[1].trim().replace(/"/g, '');
                                    console.log('          -> Set heading font:', theme.fonts.heading);
                                } else if (fontLine.startsWith('body:')) {
                                    theme.fonts.body = fontLine.split('body:')[1].trim().replace(/"/g, '');
                                    console.log('          -> Set body font:', theme.fonts.body);
                                } else if (fontLine.startsWith('caption:')) {
                                    theme.fonts.caption = fontLine.split('caption:')[1].trim().replace(/"/g, '');
                                    console.log('          -> Set caption font:', theme.fonts.caption);
                                }
                                i++;
                            }
                            i--;
                        } else if (styleLine === 'defaults:') {
                            console.log('      -> Found defaults section');
                            i++;
                            while (i < lines.length && lines[i].trim() && ((lines[i].match(/^\s*/)?.[0]?.length || 0) > 4)) {
                                const defaultLine = lines[i].trim();
                                console.log(`        -> Processing default line: "${defaultLine}"`);
                                
                                if (defaultLine.startsWith('title_font_size:')) {
                                    theme.defaults.titleFontSize = parseInt(defaultLine.split('title_font_size:')[1].trim());
                                    console.log('          -> Set title font size:', theme.defaults.titleFontSize);
                                } else if (defaultLine.startsWith('subtitle_font_size:')) {
                                    theme.defaults.subtitleFontSize = parseInt(defaultLine.split('subtitle_font_size:')[1].trim());
                                    console.log('          -> Set subtitle font size:', theme.defaults.subtitleFontSize);
                                } else if (defaultLine.startsWith('heading_font_size:')) {
                                    theme.defaults.headingFontSize = parseInt(defaultLine.split('heading_font_size:')[1].trim());
                                    console.log('          -> Set heading font size:', theme.defaults.headingFontSize);
                                } else if (defaultLine.startsWith('body_font_size:')) {
                                    theme.defaults.bodyFontSize = parseInt(defaultLine.split('body_font_size:')[1].trim());
                                    console.log('          -> Set body font size:', theme.defaults.bodyFontSize);
                                } else if (defaultLine.startsWith('caption_font_size:')) {
                                    theme.defaults.captionFontSize = parseInt(defaultLine.split('caption_font_size:')[1].trim());
                                    console.log('          -> Set caption font size:', theme.defaults.captionFontSize);
                                } else if (defaultLine.startsWith('text_alignment:')) {
                                    theme.defaults.textAlignment = defaultLine.split('text_alignment:')[1].trim().replace(/"/g, '');
                                    console.log('          -> Set text alignment:', theme.defaults.textAlignment);
                                }
                                i++;
                            }
                            i--;
                        } else if (styleLine.startsWith('line_spacing:')) {
                            theme.lineSpacing = parseFloat(styleLine.split('line_spacing:')[1].trim());
                            console.log('      -> Set line spacing:', theme.lineSpacing);
                        }
                        i++;
                    }
                    i--;
                }
                // Check for page_templates section (indent 2)
                else if (indent === 2 && trimmedLine === 'page_templates:') {
                    console.log('  -> Found page_templates section');
                    // Initialize pages object
                    theme.pages = {};
                }
                // Check for page template start (indent 4, starts with - name:)
                else if (indent === 4 && trimmedLine.startsWith('- name:')) {
                    // Start of a page template
                    console.log('  -> Found page template start');
                    if (currentPage && currentElement) {
                        currentPage.elements.push(currentElement);
                        console.log('    -> Added pending element to page:', currentElement.id, 'Total elements in page now:', currentPage.elements.length);
                        currentElement = null;
                    }
                    if (currentPage) {
                        const pageKey = `page${Object.keys(theme.pages || {}).length + 1}`;
                        theme.pages[pageKey] = currentPage;
                        console.log(`    -> Stored page "${currentPage.name}" with key "${pageKey}"`);
                    }
                    const pageName = trimmedLine.split('name:')[1].trim().replace(/"/g, '');
                    currentPage = {
                        name: pageName,
                        elements: []
                    };
                    inLayout = false;
                    inStyle = false;
                    inPosition = false;
                    inSize = false;
                    console.log('    -> Started new page:', pageName);
                }
                // Check for page description (indent 6)
                else if (indent === 6 && trimmedLine.startsWith('description:')) {
                    if (currentPage) {
                        currentPage.description = trimmedLine.split('description:')[1].trim().replace(/"/g, '');
                        console.log('    -> Set page description:', currentPage.description);
                    }
                }
                // Check for layout section (indent 6)
                else if (indent === 6 && trimmedLine === 'layout:') {
                    inLayout = true;
                    console.log('    -> Started layout section for page:', currentPage?.name);
                }
                // Check for layout element start (indent 8, starts with - id:)
                else if (indent === 8 && trimmedLine.startsWith('- id:') && inLayout) {
                    // Start of a layout element
                    if (currentElement && currentPage) {
                        currentPage.elements.push(currentElement);
                        console.log('    -> Added pending element to page:', currentElement.id, 'Total elements in page now:', currentPage.elements.length);
                        currentElement = null;
                    }
                    const elementId = trimmedLine.split('id:')[1].trim().replace(/"/g, '');
                    currentElement = {
                        id: elementId,
                        structure: {},
                        style: {},
                        prompt: ''
                    };
                    inStyle = false;
                    inPosition = false;
                    inSize = false;
                    console.log('    -> Started new element:', elementId, 'for page:', currentPage?.name);
                }
                // Check for element type (indent 10)
                else if (indent === 10 && trimmedLine.startsWith('type:')) {
                    if (currentElement) {
                        currentElement.type = trimmedLine.split('type:')[1].trim().replace(/"/g, '');
                        console.log('      -> Element type:', currentElement.type);
                    }
                }
                // Check for position section (indent 10)
                else if (indent === 10 && trimmedLine === 'position:') {
                    inPosition = true;
                    inSize = false;
                    inStyle = false;
                }
                // Check for position coordinates (indent 12)
                else if (inPosition && indent === 12) {
                    if (trimmedLine.startsWith('x:') && currentElement) {
                        currentElement.structure.x = parseInt(trimmedLine.split('x:')[1].trim());
                    } else if (trimmedLine.startsWith('y:') && currentElement) {
                        currentElement.structure.y = parseInt(trimmedLine.split('y:')[1].trim());
                    }
                }
                // Check for size section (indent 10)
                else if (indent === 10 && trimmedLine === 'size:') {
                    inSize = true;
                    inPosition = false;
                    inStyle = false;
                }
                // Check for size dimensions (indent 12)
                else if (inSize && indent === 12) {
                    if (trimmedLine.startsWith('width:') && currentElement) {
                        currentElement.structure.width = parseInt(trimmedLine.split('width:')[1].trim());
                    } else if (trimmedLine.startsWith('height:') && currentElement) {
                        currentElement.structure.height = parseInt(trimmedLine.split('height:')[1].trim());
                    }
                }
                // Check for style section (indent 10)
                else if (indent === 10 && trimmedLine === 'style:') {
                    inStyle = true;
                    inPosition = false;
                    inSize = false;
                }
                // Check for style properties (indent 12)
                else if (inStyle && indent === 12) {
                    // Parse element style properties
                    if (trimmedLine.startsWith('font:') && currentElement) {
                        currentElement.style.font = trimmedLine.split('font:')[1].trim().replace(/"/g, '');
                    } else if (trimmedLine.startsWith('font_size:') && currentElement) {
                        currentElement.style.fontSize = parseInt(trimmedLine.split('font_size:')[1].trim());
                    } else if (trimmedLine.startsWith('text_color:') && currentElement) {
                        currentElement.style.textColor = trimmedLine.split('text_color:')[1].trim().replace(/"/g, '');
                    } else if (trimmedLine.startsWith('alignment:') && currentElement) {
                        currentElement.style.alignment = trimmedLine.split('alignment:')[1].trim().replace(/"/g, '');
                    } else if (trimmedLine.startsWith('bullet_type:') && currentElement) {
                        currentElement.style.bulletType = trimmedLine.split('bullet_type:')[1].trim().replace(/"/g, '');
                    }
                }
                // Check for placeholder text (indent 10)
                else if (indent === 10 && trimmedLine.startsWith('placeholder_text:')) {
                    // Handle multi-line placeholder text
                    let placeholderText = trimmedLine.split('placeholder_text:')[1].trim().replace(/"/g, '');
                    if (placeholderText === '|') {
                        // Multi-line text
                        i++;
                        placeholderText = '';
                        while (i < lines.length && lines[i].trim() && ((lines[i].match(/^\s*/)?.[0]?.length || 0) > 10)) {
                            placeholderText += lines[i].trim() + '\n';
                            i++;
                        }
                        i--;
                        placeholderText = placeholderText.trim();
                    }
                    if (currentElement) {
                        currentElement.structure.content = placeholderText;
                        console.log('      -> Set placeholder text:', placeholderText);
                    }
                }
                // Check for placeholder image URL (indent 10)
                else if (indent === 10 && trimmedLine.startsWith('placeholder_image_url:')) {
                    if (currentElement) {
                        currentElement.structure.src = trimmedLine.split('placeholder_image_url:')[1].trim().replace(/"/g, '');
                    }
                }
                // Check for prompt (indent 10)
                else if (indent === 10 && trimmedLine.startsWith('prompt:')) {
                    // Handle multi-line prompts
                    let prompt = trimmedLine.split('prompt:')[1].trim().replace(/"/g, '');
                    if (prompt === '|') {
                        // Multi-line prompt
                        i++;
                        prompt = '';
                        while (i < lines.length && lines[i].trim() && ((lines[i].match(/^\s*/)?.[0]?.length || 0) > 10)) {
                            prompt += lines[i].trim() + '\n';
                            i++;
                        }
                        i--;
                        prompt = prompt.trim();
                    }
                    if (currentElement) {
                        currentElement.prompt = prompt;
                    }
                }
                else {
                    // Debug: show what lines are not being matched
                    if (trimmedLine.includes('name:') || trimmedLine.includes('page_templates:') || trimmedLine.includes('layout:') || trimmedLine.includes('- id:')) {
                        console.log(`  -> DEBUG: Unmatched line "${line}" with indent ${indent}`);
                    }
                }
            }
            
            // Add the last page and element
            if (currentElement && currentPage) {
                currentPage.elements.push(currentElement);
                console.log('Added final element to page:', currentElement.id, 'Total elements in page now:', currentPage.elements.length);
            }
            if (currentPage) {
                const pageKey = `page${Object.keys(theme.pages || {}).length + 1}`;
                theme.pages[pageKey] = currentPage;
                console.log('Added final page:', currentPage.name, 'with', currentPage.elements.length, 'elements');
            }
            
            console.log('Parsed theme:', theme);
            console.log('Available pages after parsing:', Object.keys(theme.pages || {}).map(key => ({
                key,
                name: theme.pages[key].name,
                elementCount: theme.pages[key].elements.length,
                elementIds: theme.pages[key].elements.map((el: any) => el.id)
            })));
            
            console.log('=== YAML PARSING SUMMARY ===');
            console.log('Theme name:', theme.name);
            console.log('Theme description:', theme.description);
            console.log('Colors found:', theme.colors);
            console.log('Fonts found:', theme.fonts);
            console.log('Defaults found:', theme.defaults);
            console.log('Pages found:', Object.keys(theme.pages || {}).length);
            console.log('Page details:', Object.keys(theme.pages || {}).map(key => ({
                key,
                name: theme.pages[key].name,
                description: theme.pages[key].description,
                elementCount: theme.pages[key].elements.length,
                elementIds: theme.pages[key].elements.map((el: any) => el.id)
            })));
            console.log('=== END YAML PARSING ===');
            
            console.log('=== BEFORE CUSTOM THEME CREATION ===');
            console.log('theme.pages:', theme.pages);
            console.log('theme.pages keys:', Object.keys(theme.pages || {}));
            console.log('theme.pages content:', theme.pages);
            
            // Convert to our CustomTheme format
            const customTheme: CustomTheme = {
                id: `theme_${Date.now()}`,
                name: theme.name || "Imported Theme",
                colors: {
                    background: theme.colors?.background || "#f8fafc",
                    slideBg: theme.colors?.background || "#ffffff",
                    slideTitle: theme.colors?.slideTitle || "#1e293b",
                    slideHeading: "#334155",
                    slideDescription: "#64748b",
                    slideBox: "#f1f5f9",
                    iconBg: "#3b82f6",
                    chartColors: ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"],
                },
                font: {
                    family: theme.fonts?.title || "Inter",
                    size: theme.defaults?.titleFontSize || 16,
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
                selectedPage: 'page1',
                pages: theme.pages || { page1: { name: 'Page 1', elements: [] } },
            };
            
            console.log('=== AFTER CUSTOM THEME CREATION ===');
            console.log('customTheme.pages:', customTheme.pages);
            console.log('customTheme.pages keys:', Object.keys(customTheme.pages || {}));
            
            // Convert elements to our format with all properties
            Object.keys(customTheme.pages || {}).forEach(pageKey => {
                const page = customTheme.pages![pageKey];
                console.log(`Converting ${page.elements.length} elements for page ${pageKey}:`, page.elements);
                page.elements = page.elements.map(element => {
                    const convertedElement = {
                        id: element.id,
                        name: element.id.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
                        type: element.type === 'textbox' ? 'text' : 
                              element.type === 'bullet_list' ? 'bullet-list' : 
                              element.type === 'image' ? 'image' : 'text',
                        structure: {
                            x: element.structure.x || 10,
                            y: element.structure.y || 10,
                            width: element.structure.width || 30,
                            height: element.structure.height || 20,
                            content: element.structure.content || '',
                            items: element.type === 'bullet_list' ? element.structure.content?.split('\n').filter(item => item.trim()) || [] : [],
                            src: element.structure.src || '',
                            chartType: 'bar',
                            prompt: element.prompt || '',
                            // Add style properties
                            font: element.style?.font || '',
                            fontSize: element.style?.fontSize || theme.defaults?.bodyFontSize || 18,
                            textColor: element.style?.textColor || theme.colors?.slideTitle || '#333333',
                            alignment: element.style?.alignment || theme.defaults?.textAlignment || 'left',
                            bulletType: element.style?.bulletType || 'disc',
                            lineSpacing: theme.lineSpacing || 1.2
                        },
                        preview: ''
                    };
                    console.log(`Converted element ${element.id} to:`, convertedElement);
                    return convertedElement;
                });
                console.log(`Page ${pageKey} now has ${page.elements.length} converted elements`);
            });
            
            // Ensure selectedPage is set to the first available page
            const pageKeys = Object.keys(customTheme.pages || {});
            if (pageKeys.length > 0) {
                customTheme.selectedPage = pageKeys[0];
            }
            
            console.log('Final custom theme:', customTheme);
            console.log('Available pages:', Object.keys(customTheme.pages || {}));
            console.log('Selected page:', customTheme.selectedPage);
            return customTheme;
        } catch (error) {
            console.error('Error parsing YAML theme:', error);
            return null;
        }
    };

    const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        setImportingTheme(true);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const yamlContent = e.target?.result as string;
                console.log('=== IMPORTING YAML INTO CURRENT THEME ===');
                console.log('Raw YAML content:', yamlContent);
                
                // Parse YAML and extract pages directly
                const lines = yamlContent.split('\n');
                console.log('Total lines in YAML:', lines.length);
                
                let theme: any = {
                    name: '',
                    colors: {},
                    fonts: {},
                    defaults: {},
                    pages: {}
                };
                
                let currentPage: any = null;
                let currentElement: any = null;
                let inLayout = false;
                let inStyle = false;
                let inPosition = false;
                let inSize = false;
                
                console.log('Starting to parse lines...');
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const indent = (line.match(/^\s*/)?.[0]?.length || 0);
                    const trimmedLine = line.trim();
                    
                    console.log(`Line ${i + 1} (indent: ${indent}): "${line}"`);
                    
                    if (trimmedLine === '') {
                        console.log('  -> Empty line, skipping');
                        continue;
                    }

                    // Check for template section
                    if (trimmedLine === 'template:') {
                        console.log('  -> Found template section');
                    }
                    // Check for theme name (indent 2)
                    else if (indent === 2 && trimmedLine.startsWith('name:')) {
                        theme.name = trimmedLine.split('name:')[1].trim().replace(/"/g, '');
                        console.log('  -> Set theme name:', theme.name);
                    }
                    // Check for theme description (indent 2)
                    else if (indent === 2 && trimmedLine.startsWith('description:')) {
                        theme.description = trimmedLine.split('description:')[1].trim().replace(/"/g, '');
                        console.log('  -> Set theme description:', theme.description);
                    }
                    // Check for general_style section (indent 2)
                    else if (indent === 2 && trimmedLine === 'general_style:') {
                        console.log('  -> Found general_style section');
                        // Parse general style properties
                        i++;
                        while (i < lines.length && lines[i].trim() && ((lines[i].match(/^\s*/)?.[0]?.length || 0) > 2)) {
                            const styleLine = lines[i].trim();
                            console.log(`    -> Processing style line: "${styleLine}"`);
                            
                            if (styleLine.startsWith('background_color:')) {
                                theme.colors.background = styleLine.split('background_color:')[1].trim().replace(/"/g, '');
                                console.log('      -> Set background color:', theme.colors.background);
                            } else if (styleLine.startsWith('text_color:')) {
                                theme.colors.slideTitle = styleLine.split('text_color:')[1].trim().replace(/"/g, '');
                                console.log('      -> Set text color:', theme.colors.slideTitle);
                            } else if (styleLine === 'fonts:') {
                                console.log('      -> Found fonts section');
                                i++;
                                while (i < lines.length && lines[i].trim() && ((lines[i].match(/^\s*/)?.[0]?.length || 0) > 4)) {
                                    const fontLine = lines[i].trim();
                                    console.log(`        -> Processing font line: "${fontLine}"`);
                                    
                                    if (fontLine.startsWith('title:')) {
                                        theme.fonts.title = fontLine.split('title:')[1].trim().replace(/"/g, '');
                                        console.log('          -> Set title font:', theme.fonts.title);
                                    } else if (fontLine.startsWith('subtitle:')) {
                                        theme.fonts.subtitle = fontLine.split('subtitle:')[1].trim().replace(/"/g, '');
                                        console.log('          -> Set subtitle font:', theme.fonts.subtitle);
                                    } else if (fontLine.startsWith('heading:')) {
                                        theme.fonts.heading = fontLine.split('heading:')[1].trim().replace(/"/g, '');
                                        console.log('          -> Set heading font:', theme.fonts.heading);
                                    } else if (fontLine.startsWith('body:')) {
                                        theme.fonts.body = fontLine.split('body:')[1].trim().replace(/"/g, '');
                                        console.log('          -> Set body font:', theme.fonts.body);
                                    } else if (fontLine.startsWith('caption:')) {
                                        theme.fonts.caption = fontLine.split('caption:')[1].trim().replace(/"/g, '');
                                        console.log('          -> Set caption font:', theme.fonts.caption);
                                    }
                                    i++;
                                }
                                i--;
                            } else if (styleLine === 'defaults:') {
                                console.log('      -> Found defaults section');
                                i++;
                                while (i < lines.length && lines[i].trim() && ((lines[i].match(/^\s*/)?.[0]?.length || 0) > 4)) {
                                    const defaultLine = lines[i].trim();
                                    console.log(`        -> Processing default line: "${defaultLine}"`);
                                    
                                    if (defaultLine.startsWith('title_font_size:')) {
                                        theme.defaults.titleFontSize = parseInt(defaultLine.split('title_font_size:')[1].trim());
                                        console.log('          -> Set title font size:', theme.defaults.titleFontSize);
                                    } else if (defaultLine.startsWith('subtitle_font_size:')) {
                                        theme.defaults.subtitleFontSize = parseInt(defaultLine.split('subtitle_font_size:')[1].trim());
                                        console.log('          -> Set subtitle font size:', theme.defaults.subtitleFontSize);
                                    } else if (defaultLine.startsWith('heading_font_size:')) {
                                        theme.defaults.headingFontSize = parseInt(defaultLine.split('heading_font_size:')[1].trim());
                                        console.log('          -> Set heading font size:', theme.defaults.headingFontSize);
                                    } else if (defaultLine.startsWith('body_font_size:')) {
                                        theme.defaults.bodyFontSize = parseInt(defaultLine.split('body_font_size:')[1].trim());
                                        console.log('          -> Set body font size:', theme.defaults.bodyFontSize);
                                    } else if (defaultLine.startsWith('caption_font_size:')) {
                                        theme.defaults.captionFontSize = parseInt(defaultLine.split('caption_font_size:')[1].trim());
                                        console.log('          -> Set caption font size:', theme.defaults.captionFontSize);
                                    } else if (defaultLine.startsWith('text_alignment:')) {
                                        theme.defaults.textAlignment = defaultLine.split('text_alignment:')[1].trim().replace(/"/g, '');
                                        console.log('          -> Set text alignment:', theme.defaults.textAlignment);
                                    }
                                    i++;
                                }
                                i--;
                            } else if (styleLine.startsWith('line_spacing:')) {
                                theme.lineSpacing = parseFloat(styleLine.split('line_spacing:')[1].trim());
                                console.log('      -> Set line spacing:', theme.lineSpacing);
                            }
                            i++;
                        }
                        i--;
                    }
                    // Check for page_templates section (indent 2)
                    else if (indent === 2 && trimmedLine === 'page_templates:') {
                        console.log('  -> Found page_templates section');
                        // Initialize pages object
                        theme.pages = {};
                    }
                    // Check for page template start (indent 4, starts with - name:)
                    else if (indent === 4 && trimmedLine.startsWith('- name:')) {
                        // Start of a page template
                        console.log('  -> Found page template start');
                        if (currentPage && currentElement) {
                            currentPage.elements.push(currentElement);
                            console.log('    -> Added pending element to page:', currentElement.id, 'Total elements in page now:', currentPage.elements.length);
                            currentElement = null;
                        }
                        if (currentPage) {
                            const pageKey = `page${Object.keys(theme.pages || {}).length + 1}`;
                            theme.pages[pageKey] = currentPage;
                            console.log(`    -> Stored page "${currentPage.name}" with key "${pageKey}"`);
                        }
                        const pageName = trimmedLine.split('name:')[1].trim().replace(/"/g, '');
                        currentPage = {
                            name: pageName,
                            elements: []
                        };
                        inLayout = false;
                        inStyle = false;
                        inPosition = false;
                        inSize = false;
                        console.log('    -> Started new page:', pageName);
                    }
                    // Check for page description (indent 6)
                    else if (indent === 6 && trimmedLine.startsWith('description:')) {
                        if (currentPage) {
                            currentPage.description = trimmedLine.split('description:')[1].trim().replace(/"/g, '');
                            console.log('    -> Set page description:', currentPage.description);
                        }
                    }
                    // Check for layout section (indent 6)
                    else if (indent === 6 && trimmedLine === 'layout:') {
                        inLayout = true;
                        console.log('    -> Started layout section for page:', currentPage?.name);
                    }
                    // Check for layout element start (indent 8, starts with - id:)
                    else if (indent === 8 && trimmedLine.startsWith('- id:') && inLayout) {
                        // Start of a layout element
                        if (currentElement && currentPage) {
                            currentPage.elements.push(currentElement);
                            console.log('    -> Added pending element to page:', currentElement.id, 'Total elements in page now:', currentPage.elements.length);
                            currentElement = null;
                        }
                        const elementId = trimmedLine.split('id:')[1].trim().replace(/"/g, '');
                        currentElement = {
                            id: elementId,
                            structure: {},
                            style: {},
                            prompt: ''
                        };
                        inStyle = false;
                        inPosition = false;
                        inSize = false;
                        console.log('    -> Started new element:', elementId, 'for page:', currentPage?.name);
                    }
                    // Check for element type (indent 10)
                    else if (indent === 10 && trimmedLine.startsWith('type:')) {
                        if (currentElement) {
                            currentElement.type = trimmedLine.split('type:')[1].trim().replace(/"/g, '');
                            console.log('      -> Element type:', currentElement.type);
                        }
                    }
                    // Check for position section (indent 10)
                    else if (indent === 10 && trimmedLine === 'position:') {
                        inPosition = true;
                        inSize = false;
                        inStyle = false;
                    }
                    // Check for position coordinates (indent 12)
                    else if (inPosition && indent === 12) {
                        if (trimmedLine.startsWith('x:') && currentElement) {
                            currentElement.structure.x = parseInt(trimmedLine.split('x:')[1].trim());
                        } else if (trimmedLine.startsWith('y:') && currentElement) {
                            currentElement.structure.y = parseInt(trimmedLine.split('y:')[1].trim());
                        }
                    }
                    // Check for size section (indent 10)
                    else if (indent === 10 && trimmedLine === 'size:') {
                        inSize = true;
                        inPosition = false;
                        inStyle = false;
                    }
                    // Check for size dimensions (indent 12)
                    else if (inSize && indent === 12) {
                        if (trimmedLine.startsWith('width:') && currentElement) {
                            currentElement.structure.width = parseInt(trimmedLine.split('width:')[1].trim());
                        } else if (trimmedLine.startsWith('height:') && currentElement) {
                            currentElement.structure.height = parseInt(trimmedLine.split('height:')[1].trim());
                        }
                    }
                    // Check for style section (indent 10)
                    else if (indent === 10 && trimmedLine === 'style:') {
                        inStyle = true;
                        inPosition = false;
                        inSize = false;
                    }
                    // Check for style properties (indent 12)
                    else if (inStyle && indent === 12) {
                        // Parse element style properties
                        if (trimmedLine.startsWith('font:') && currentElement) {
                            currentElement.style.font = trimmedLine.split('font:')[1].trim().replace(/"/g, '');
                        } else if (trimmedLine.startsWith('font_size:') && currentElement) {
                            currentElement.style.fontSize = parseInt(trimmedLine.split('font_size:')[1].trim());
                        } else if (trimmedLine.startsWith('text_color:') && currentElement) {
                            currentElement.style.textColor = trimmedLine.split('text_color:')[1].trim().replace(/"/g, '');
                        } else if (trimmedLine.startsWith('alignment:') && currentElement) {
                            currentElement.style.alignment = trimmedLine.split('alignment:')[1].trim().replace(/"/g, '');
                        } else if (trimmedLine.startsWith('bullet_type:') && currentElement) {
                            currentElement.style.bulletType = trimmedLine.split('bullet_type:')[1].trim().replace(/"/g, '');
                        }
                    }
                    // Check for placeholder text (indent 10)
                    else if (indent === 10 && trimmedLine.startsWith('placeholder_text:')) {
                        // Handle multi-line placeholder text
                        let placeholderText = trimmedLine.split('placeholder_text:')[1].trim().replace(/"/g, '');
                        if (placeholderText === '|') {
                            // Multi-line text
                            i++;
                            placeholderText = '';
                            while (i < lines.length && lines[i].trim() && ((lines[i].match(/^\s*/)?.[0]?.length || 0) > 10)) {
                                placeholderText += lines[i].trim() + '\n';
                                i++;
                            }
                            i--;
                            placeholderText = placeholderText.trim();
                        }
                        if (currentElement) {
                            currentElement.structure.content = placeholderText;
                            console.log('      -> Set placeholder text:', placeholderText);
                        }
                    }
                    // Check for placeholder image URL (indent 10)
                    else if (indent === 10 && trimmedLine.startsWith('placeholder_image_url:')) {
                        if (currentElement) {
                            currentElement.structure.src = trimmedLine.split('placeholder_image_url:')[1].trim().replace(/"/g, '');
                        }
                    }
                    // Check for prompt (indent 10)
                    else if (indent === 10 && trimmedLine.startsWith('prompt:')) {
                        // Handle multi-line prompts
                        let prompt = trimmedLine.split('prompt:')[1].trim().replace(/"/g, '');
                        if (prompt === '|') {
                            // Multi-line prompt
                            i++;
                            prompt = '';
                            while (i < lines.length && lines[i].trim() && ((lines[i].match(/^\s*/)?.[0]?.length || 0) > 10)) {
                                prompt += lines[i].trim() + '\n';
                                i++;
                            }
                            i--;
                            prompt = prompt.trim();
                        }
                        if (currentElement) {
                            currentElement.prompt = prompt;
                        }
                    }
                    else {
                        // Debug: show what lines are not being matched
                        if (trimmedLine.includes('name:') || trimmedLine.includes('page_templates:') || trimmedLine.includes('layout:') || trimmedLine.includes('- id:')) {
                            console.log(`  -> DEBUG: Unmatched line "${line}" with indent ${indent}`);
                        }
                    }
                }
                
                // Add the last page and element
                if (currentElement && currentPage) {
                    currentPage.elements.push(currentElement);
                    console.log('    -> Added final element to page:', currentElement.id, 'Total elements in page now:', currentPage.elements.length);
                }
                if (currentPage) {
                    const pageKey = `page${Object.keys(theme.pages || {}).length + 1}`;
                    theme.pages[pageKey] = currentPage;
                    console.log('    -> Added final page:', currentPage.name, 'with', currentPage.elements.length, 'elements');
                }
                
                console.log('=== YAML PARSING SUMMARY ===');
                console.log('Theme name:', theme.name);
                console.log('Theme description:', theme.description);
                console.log('Colors found:', theme.colors);
                console.log('Fonts found:', theme.fonts);
                console.log('Defaults found:', theme.defaults);
                console.log('Pages found:', Object.keys(theme.pages || {}).length);
                console.log('Page details:', Object.keys(theme.pages || {}).map(key => ({
                    key,
                    name: theme.pages[key].name,
                    description: theme.pages[key].description,
                    elementCount: theme.pages[key].elements.length,
                    elementIds: theme.pages[key].elements.map((el: any) => el.id)
                })));
                
                // Now import the parsed pages directly into the current editing theme
                if (Object.keys(theme.pages || {}).length > 0) {
                    // Create or update the editing theme
                    const updatedTheme: CustomTheme = {
                        id: editingTheme?.id || `theme_${Date.now()}`,
                        name: editingTheme?.name || theme.name || "Imported Theme",
                        colors: {
                            background: theme.colors?.background || editingTheme?.colors.background || "#f8fafc",
                            slideBg: theme.colors?.background || editingTheme?.colors.slideBg || "#ffffff",
                            slideTitle: theme.colors?.slideTitle || editingTheme?.colors.slideTitle || "#1e293b",
                            slideHeading: editingTheme?.colors.slideHeading || "#334155",
                            slideDescription: editingTheme?.colors.slideDescription || "#64748b",
                            slideBox: editingTheme?.colors.slideBox || "#f1f5f9",
                            iconBg: editingTheme?.colors.iconBg || "#3b82f6",
                            chartColors: editingTheme?.colors.chartColors || ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"],
                        },
                        font: {
                            family: theme.fonts?.title || editingTheme?.font.family || "Inter",
                            size: theme.defaults?.titleFontSize || editingTheme?.font.size || 16,
                            weight: editingTheme?.font.weight || 400,
                        },
                        layouts: editingTheme?.layouts || {
                            enabled: [1, 2, 4, 5, 6, 7, 8, 9],
                            custom: [],
                        },
                        prompts: editingTheme?.prompts || {
                            imagePrompt: "Modern and professional with clean lines and minimal design. Use a sophisticated color palette with subtle gradients and professional typography.",
                            contentStyle: "Professional and engaging content with clear hierarchy and concise messaging.",
                            slideStructure: "Balanced layout with clear visual hierarchy, appropriate spacing, and professional presentation style.",
                        },
                        isActive: editingTheme?.isActive || false,
                        selectedPage: 'page1',
                        pages: {}
                    };
                    
                    // Convert and import the parsed pages
                    Object.keys(theme.pages || {}).forEach((pageKey, index) => {
                        const parsedPage = theme.pages[pageKey];
                        const newPageKey = `page${index + 1}`;
                        
                        updatedTheme.pages![newPageKey] = {
                            name: parsedPage.name,
                            description: parsedPage.description || '',
                            elements: parsedPage.elements.map((element: any) => ({
                                id: element.id,
                                name: element.id.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
                                type: element.type === 'textbox' ? 'text' : 
                                      element.type === 'bullet_list' ? 'bullet-list' : 
                                      element.type === 'image' ? 'image' : 'text',
                                structure: {
                                    x: element.structure.x || 10,
                                    y: element.structure.y || 10,
                                    width: element.structure.width || 30,
                                    height: element.structure.height || 20,
                                    content: element.structure.content || '',
                                    items: element.type === 'bullet_list' ? element.structure.content?.split('\n').filter((item: string) => item.trim()) || [] : [],
                                    src: element.structure.src || '',
                                    chartType: 'bar',
                                    prompt: element.prompt || '',
                                    // Add style properties
                                    font: element.style?.font || '',
                                    fontSize: element.style?.fontSize || theme.defaults?.bodyFontSize || 18,
                                    textColor: element.style?.textColor || theme.colors?.slideTitle || '#333333',
                                    alignment: element.style?.alignment || theme.defaults?.textAlignment || 'left',
                                    bulletType: element.style?.bulletType || 'disc',
                                    lineSpacing: theme.lineSpacing || 1.2
                                },
                                preview: ''
                            }))
                        };
                        
                        console.log(`Imported page "${parsedPage.name}" as "${newPageKey}" with ${parsedPage.elements.length} elements`);
                    });
                    
                    console.log('Final updated theme:', updatedTheme);
                    console.log('Pages imported:', Object.keys(updatedTheme.pages || {}));
                    
                    setEditingTheme(updatedTheme);
                    setShowThemeCreator(true);
                    setActiveThemeTab("layouts");
                    
                    toast({
                        title: "Success",
                        description: `Theme "${updatedTheme.name}" imported successfully with ${Object.keys(updatedTheme.pages || {}).length} page(s)`,
                    });
                } else {
                    toast({
                        title: "Error",
                        description: "No pages found in YAML file",
                        variant: "destructive",
                    });
                }
            } catch (error) {
                console.error('Error importing theme:', error);
                toast({
                    title: "Error",
                    description: "Failed to import theme file",
                    variant: "destructive",
                });
            } finally {
                setImportingTheme(false);
                // Reset file input
                event.target.value = '';
            }
        };
        
        reader.onerror = () => {
            toast({
                title: "Error",
                description: "Failed to read theme file",
                variant: "destructive",
            });
            setImportingTheme(false);
            event.target.value = '';
        };
        
        reader.readAsText(file);
    };

    // Helper: Convert JS object to YAML (for export)
    function themeToYaml(theme: CustomTheme): string {
        // Helper for indentation
        const indent = (level: number) => '  '.repeat(level);
        let yaml = 'template:\n';
        yaml += `${indent(1)}name: "${theme.name}"\n`;
        yaml += `${indent(1)}description: "${(theme.pages?.page1 as any)?.description || ''}"\n`;
        yaml += `${indent(1)}general_style:\n`;
        yaml += `${indent(2)}background_color: "${theme.colors.background}"\n`;
        yaml += `${indent(2)}text_color: "${theme.colors.slideTitle}"\n`;
        yaml += `${indent(2)}fonts:\n`;
        yaml += `${indent(3)}title: "${theme.font.family}"\n`;
        yaml += `${indent(3)}subtitle: "${theme.font.family}"\n`;
        yaml += `${indent(3)}heading: "${theme.font.family}"\n`;
        yaml += `${indent(3)}body: "${theme.font.family}"\n`;
        yaml += `${indent(3)}caption: "${theme.font.family}"\n`;
        yaml += `${indent(2)}defaults:\n`;
        yaml += `${indent(3)}title_font_size: ${theme.font.size}\n`;
        yaml += `${indent(3)}subtitle_font_size: ${Math.floor(theme.font.size * 0.8)}\n`;
        yaml += `${indent(3)}heading_font_size: ${Math.floor(theme.font.size * 0.9)}\n`;
        yaml += `${indent(3)}body_font_size: ${theme.font.size}\n`;
        yaml += `${indent(3)}caption_font_size: ${Math.floor(theme.font.size * 0.7)}\n`;
        yaml += `${indent(3)}text_alignment: "left"\n`;
        yaml += `${indent(2)}line_spacing: 1.2\n`;
        yaml += `${indent(1)}page_templates:\n`;
        
        if (theme.pages) {
            Object.values(theme.pages).forEach((page: any) => {
                console.log('Exporting page:', page.name, 'with elements:', page.elements);
                yaml += `${indent(2)}- name: "${page.name}"\n`;
                yaml += `${indent(3)}description: "${page?.description || ''}"\n`;
                yaml += `${indent(3)}layout:\n`;
                
                // Check if elements exist and have content
                if (page.elements && Array.isArray(page.elements) && page.elements.length > 0) {
                    console.log('Processing', page.elements.length, 'elements');
                    page.elements.forEach((el: any, index: number) => {
                        console.log('Processing element', index, ':', el);
                        yaml += `${indent(4)}- id: "${el.id}"\n`;
                        
                        // Convert type to YAML format
                        let elementType = el.type;
                        if (el.type === 'text') elementType = 'textbox';
                        else if (el.type === 'bullet-list') elementType = 'bullet_list';
                        yaml += `${indent(5)}type: "${elementType}"\n`;
                        
                        // Position
                        yaml += `${indent(5)}position:\n`;
                        yaml += `${indent(6)}x: ${el.structure.x || 10}\n`;
                        yaml += `${indent(6)}y: ${el.structure.y || 10}\n`;
                        
                        // Size
                        yaml += `${indent(5)}size:\n`;
                        yaml += `${indent(6)}width: ${el.structure.width || 30}\n`;
                        yaml += `${indent(6)}height: ${el.structure.height || 20}\n`;
                        
                        // Style
                        yaml += `${indent(5)}style:\n`;
                        if (el.structure.font) {
                            yaml += `${indent(6)}font: "${el.structure.font}"\n`;
                        } else {
                            yaml += `${indent(6)}font: "${theme.font.family}"\n`;
                        }
                        
                        if (el.structure.fontSize) {
                            yaml += `${indent(6)}font_size: ${el.structure.fontSize}\n`;
                        } else {
                            yaml += `${indent(6)}font_size: ${theme.font.size}\n`;
                        }
                        
                        if (el.structure.textColor) {
                            yaml += `${indent(6)}text_color: "${el.structure.textColor}"\n`;
                        } else {
                            yaml += `${indent(6)}text_color: "${theme.colors.slideTitle}"\n`;
                        }
                        
                        if (el.structure.alignment) {
                            yaml += `${indent(6)}alignment: "${el.structure.alignment}"\n`;
                        } else {
                            yaml += `${indent(6)}alignment: "left"\n`;
                        }
                        
                        if (el.structure.bulletType) {
                            yaml += `${indent(6)}bullet_type: "${el.structure.bulletType}"\n`;
                        }
                        
                        // Content
                        if (el.type === 'image' && el.structure.src) {
                            yaml += `${indent(5)}placeholder_image_url: "${el.structure.src}"\n`;
                        } else if (el.structure.content) {
                            if (el.type === 'bullet-list' && el.structure.items && el.structure.items.length > 0) {
                                yaml += `${indent(5)}placeholder_text: |\n`;
                                el.structure.items.forEach((item: string) => {
                                    yaml += `${indent(6)}- ${item}\n`;
                                });
                            } else {
                                // Handle multi-line content
                                const content = el.structure.content;
                                if (content.includes('\n')) {
                                    yaml += `${indent(5)}placeholder_text: |\n`;
                                    content.split('\n').forEach((line: string) => {
                                        yaml += `${indent(6)}${line}\n`;
                                    });
                                } else {
                                    yaml += `${indent(5)}placeholder_text: "${content.replace(/"/g, '\\"')}"\n`;
                                }
                            }
                        }
                        
                        // Prompt
                        if (el.structure.prompt) {
                            const prompt = el.structure.prompt;
                            if (prompt.includes('\n')) {
                                yaml += `${indent(5)}prompt: |\n`;
                                prompt.split('\n').forEach((line: string) => {
                                    yaml += `${indent(6)}${line}\n`;
                                });
                            } else {
                                yaml += `${indent(5)}prompt: "${prompt.replace(/"/g, '\\"')}"\n`;
                            }
                        }
                    });
                } else {
                    console.log('No elements found for page:', page.name);
                    // Add a default element if none exist
                    yaml += `${indent(4)}- id: "default_title"\n`;
                    yaml += `${indent(5)}type: "textbox"\n`;
                    yaml += `${indent(5)}position:\n`;
                    yaml += `${indent(6)}x: 10\n`;
                    yaml += `${indent(6)}y: 10\n`;
                    yaml += `${indent(5)}size:\n`;
                    yaml += `${indent(6)}width: 80\n`;
                    yaml += `${indent(6)}height: 20\n`;
                    yaml += `${indent(5)}style:\n`;
                    yaml += `${indent(6)}font: "${theme.font.family}"\n`;
                    yaml += `${indent(6)}font_size: ${theme.font.size}\n`;
                    yaml += `${indent(6)}text_color: "${theme.colors.slideTitle}"\n`;
                    yaml += `${indent(6)}alignment: "left"\n`;
                    yaml += `${indent(5)}placeholder_text: "Sample Title"\n`;
                }
            });
        } else {
            console.log('No pages found in theme');
            // Add a default page if none exist
            yaml += `${indent(2)}- name: "Default Page"\n`;
            yaml += `${indent(3)}description: "Default page template"\n`;
            yaml += `${indent(3)}layout:\n`;
            yaml += `${indent(4)}- id: "default_title"\n`;
            yaml += `${indent(5)}type: "textbox"\n`;
            yaml += `${indent(5)}position:\n`;
            yaml += `${indent(6)}x: 10\n`;
            yaml += `${indent(6)}y: 10\n`;
            yaml += `${indent(5)}size:\n`;
            yaml += `${indent(6)}width: 80\n`;
            yaml += `${indent(6)}height: 20\n`;
            yaml += `${indent(5)}style:\n`;
            yaml += `${indent(6)}font: "${theme.font.family}"\n`;
            yaml += `${indent(6)}font_size: ${theme.font.size}\n`;
            yaml += `${indent(6)}text_color: "${theme.colors.slideTitle}"\n`;
            yaml += `${indent(6)}alignment: "left"\n`;
            yaml += `${indent(5)}placeholder_text: "Sample Title"\n`;
        }
        
        console.log('Generated YAML:', yaml);
        return yaml;
    }

    function downloadYamlFile(yaml: string, filename: string) {
        const blob = new Blob([yaml], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }

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
                            <div className="flex gap-2">
                                <Button
                                    onClick={createNewTheme}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create New Theme
                                </Button>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".yaml,.yml"
                                        onChange={handleImportTheme}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={importingTheme}
                                    />
                                    <Button
                                        className={`${importingTheme ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white`}
                                        disabled={importingTheme}
                                    >
                                        {importingTheme ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Upload className="w-4 h-4 mr-2" />
                                        )}
                                        {importingTheme ? 'Importing...' : 'Import Theme'}
                                    </Button>
                                </div>
                            </div>
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
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                const yaml = themeToYaml(theme);
                                                                downloadYamlFile(yaml, `${theme.name.replace(/\s+/g, '_').toLowerCase() || 'theme'}.yaml`);
                                                            }}
                                                            className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
                                                            title="Export as YAML"
                                                        >
                                                            <Download className="w-3 h-3" />
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
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="general">General</TabsTrigger>
                                    <TabsTrigger value="colors">Colors</TabsTrigger>
                                    <TabsTrigger value="layouts">Page Templates</TabsTrigger>
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
                                        <Label>Page Templates Builder</Label>
                                        <p className="text-sm text-gray-600 mb-4">Create custom page layouts by adding and arranging elements for each page</p>
                                        
                                        {/* Page Selection */}
                                        <div className="mb-6">
                                            <Label className="text-sm font-medium mb-2 block">Select Page</Label>
                                            <div className="flex gap-2">
                                                <select 
                                                    value={editingTheme.selectedPage || 'page1'} 
                                                    onChange={(e) => {
                                                        console.log('Page selection changed:', e.target.value);
                                                        setEditingTheme({
                                                            ...editingTheme,
                                                            selectedPage: e.target.value,
                                                            pages: editingTheme.pages || { page1: { name: 'Page 1', elements: [] } }
                                                        });
                                                    }}
                                                    className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    {(() => {
                                                        const pages = editingTheme.pages || { page1: { name: 'Page 1', elements: [] } };
                                                        const pageKeys = Object.keys(pages);
                                                        console.log('Page dropdown - Available pages:', pages, 'Keys:', pageKeys, 'Selected:', editingTheme.selectedPage);
                                                        console.log('Page dropdown - editingTheme:', editingTheme);
                                                        console.log('Page dropdown - editingTheme.pages:', editingTheme.pages);
                                                        if (pageKeys.length === 0) {
                                                            console.log('WARNING: No pages found in editingTheme.pages');
                                                            console.log('WARNING: editingTheme.pages is:', editingTheme.pages);
                                                        }
                                                        return pageKeys.map((pageKey) => {
                                                            const page = pages[pageKey];
                                                            console.log(`Page ${pageKey}:`, page);
                                                            return (
                                                                <option key={pageKey} value={pageKey}>
                                                                    {page?.name || pageKey}
                                                                </option>
                                                            );
                                                        });
                                                    })()}
                                                </select>
                                                <Button
                                                    onClick={() => {
                                                        const pageCount = Object.keys(editingTheme.pages || { page1: { name: 'Page 1', elements: [] } }).length;
                                                        const newPageKey = `page${pageCount + 1}`;
                                                        const newPages = {
                                                            ...(editingTheme.pages || { page1: { name: 'Page 1', elements: [] } }),
                                                            [newPageKey]: { 
                                                                name: `Page ${pageCount + 1}`, 
                                                                description: '',
                                                                elements: [] 
                                                            }
                                                        };
                                                        setEditingTheme({
                                                            ...editingTheme,
                                                            pages: newPages,
                                                            selectedPage: newPageKey
                                                        });
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Add Page
                                                </Button>
                                            </div>
                                            
                                            {/* Page Name Editor */}
                                            {editingTheme.selectedPage && editingTheme.pages && editingTheme.pages[editingTheme.selectedPage] && (
                                                <div className="mt-3 space-y-3">
                                                    <div>
                                                        <Label className="text-sm font-medium mb-2 block">Page Name</Label>
                                                        <Input
                                                            value={editingTheme.pages[editingTheme.selectedPage].name}
                                                            onChange={(e) => {
                                                                if (!editingTheme.pages) return;
                                                                setEditingTheme({
                                                                    ...editingTheme,
                                                                    pages: {
                                                                        ...editingTheme.pages,
                                                                        [editingTheme.selectedPage || 'page1']: {
                                                                            ...editingTheme.pages[editingTheme.selectedPage || 'page1'],
                                                                            name: e.target.value
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                            placeholder="Enter page name..."
                                                            className="w-64"
                                                        />
                                                    </div>
                                                    
                                                    <div>
                                                        <Label className="text-sm font-medium mb-2 block">Page Description</Label>
                                                        <textarea
                                                            value={editingTheme.pages[editingTheme.selectedPage].description || ''}
                                                            onChange={(e) => {
                                                                if (!editingTheme.pages) return;
                                                                setEditingTheme({
                                                                    ...editingTheme,
                                                                    pages: {
                                                                        ...editingTheme.pages,
                                                                        [editingTheme.selectedPage || 'page1']: {
                                                                            ...editingTheme.pages[editingTheme.selectedPage || 'page1'],
                                                                            description: e.target.value
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                            placeholder="Enter page description..."
                                                            className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                            rows={3}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Layout Preview */}
                                        <div className="mb-6">
                                            <Label className="text-sm font-medium mb-2 block">Layout Preview</Label>
                                            <div 
                                                className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 relative overflow-hidden"
                                                style={{ backgroundColor: editingTheme.colors.slideBg }}
                                                id="layout-preview-container"
                                            >
                                                {(!editingTheme.pages || !editingTheme.pages[editingTheme.selectedPage || 'page1'] || 
                                                  editingTheme.pages[editingTheme.selectedPage || 'page1'].elements.length === 0) ? (
                                                    <div className="flex items-center justify-center h-full text-gray-500">
                                                        <div className="text-center">
                                                            <Layout className="w-8 h-8 mx-auto mb-2" />
                                                            <p>No elements added yet</p>
                                                            <p className="text-xs">Add elements below to build your layout</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                                        <div className="h-full relative">
                        {(editingTheme.pages[editingTheme.selectedPage || 'page1'].elements || []).filter(Boolean).map((element, index) => (
                                                            <div
                                                                key={element.id}
                                                                className={`absolute border-2 border-blue-400 bg-blue-100 bg-opacity-50 rounded cursor-move hover:border-blue-600 transition-colors ${
                                                                    draggingElement?.id === element.id ? 'border-blue-600 bg-blue-200' : ''
                                                                } ${
                                                                    resizingElement?.id === element.id ? 'border-green-600 bg-green-200' : ''
                                                                }`}
                                                                style={{
                                                                    left: `${element.structure?.x || 0}%`,
                                                                    top: `${element.structure?.y || 0}%`,
                                                                    width: `${element.structure?.width || 30}%`,
                                                                    height: `${element.structure?.height || 20}%`,
                                                                    zIndex: (draggingElement?.id === element.id || resizingElement?.id === element.id) ? 1000 : index + 1
                                                                }}
                                                                title={element.name}
                                                                onMouseDown={(e) => handleElementMouseDown(e, element)}
                                                            >
                                                                {/* Element Content Preview */}
                                                                <div className="p-2 h-full overflow-hidden">
                                                                    {element.type === 'title' && (
                                                                        <div className="text-sm font-bold text-blue-800 truncate">
                                                                            {element.structure?.content || 'Title Text'}
                                                                        </div>
                                                                    )}
                                                                    {element.type === 'subtitle' && (
                                                                        <div className="text-xs font-semibold text-blue-700 truncate">
                                                                            {element.structure?.content || 'Subtitle Text'}
                                                                        </div>
                                                                    )}
                                                                    {element.type === 'text' && (
                                                                        <div className="text-xs text-blue-700 leading-tight">
                                                                            {element.structure?.content || 'Text content...'}
                                                                        </div>
                                                                    )}
                                                                    {element.type === 'bullet-list' && (
                                                                        <div className="text-xs text-blue-700">
                                                                            {element.structure?.items && element.structure.items.length > 0 ? (
                                                                                <ul className="list-disc list-inside space-y-0.5">
                                                                                    {element.structure.items.slice(0, 3).map((item, idx) => (
                                                                                        <li key={idx} className="truncate">{item}</li>
                                                                                    ))}
                                                                                    {element.structure.items.length > 3 && (
                                                                                        <li className="text-blue-500">+{element.structure.items.length - 3} more</li>
                                                                                    )}
                                                                                </ul>
                                                                            ) : (
                                                                                <div>• List item 1<br/>• List item 2<br/>• List item 3</div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {element.type === 'image' && (
                                                                        <div className="flex items-center justify-center h-full">
                                                                            <div className="text-xs text-blue-600 text-center">
                                                                                {element.structure?.src ? (
                                                                                    <div>
                                                                                        <div className="w-8 h-8 bg-blue-200 rounded mx-auto mb-1 flex items-center justify-center">
                                                                                            📷
                                                                        </div>
                                                                                        <div className="truncate">{element.structure.src}</div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div>
                                                                                        <div className="w-8 h-8 bg-blue-200 rounded mx-auto mb-1 flex items-center justify-center">
                                                                                            📷
                                                                        </div>
                                                                                        <div>Image</div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {element.type === 'chart' && (
                                                                        <div className="flex items-center justify-center h-full">
                                                                            <div className="text-xs text-blue-600 text-center">
                                                                                <div className="w-8 h-8 bg-blue-200 rounded mx-auto mb-1 flex items-center justify-center">
                                                                                    📊
                                                                        </div>
                                                                                <div>{element.structure?.chartType || 'bar'} Chart</div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {element.type === 'icon' && (
                                                                        <div className="flex items-center justify-center h-full">
                                                                            <div className="text-xs text-blue-600 text-center">
                                                                                <div className="w-6 h-6 bg-blue-200 rounded mx-auto mb-1 flex items-center justify-center">
                                                                                    ⭐
                                                                        </div>
                                                                                <div>Icon</div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {element.type === 'divider' && (
                                                                        <div className="flex items-center justify-center h-full">
                                                                            <div className="w-full h-0.5 bg-blue-400"></div>
                                                                        </div>
                                                                    )}
                                                                    {/* Fallback for unknown types */}
                                                                    {!['title', 'subtitle', 'text', 'bullet-list', 'image', 'chart', 'icon', 'divider'].includes(element.type) && (
                                                                        <div className="text-xs text-center font-medium text-blue-800">
                                                                            {element.name}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {/* Resize handles */}
                                                                <div 
                                                                    className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-tl cursor-se-resize hover:bg-blue-700 z-10 flex items-center justify-center"
                                                                    onMouseDown={(e) => {
                                                                        console.log('SE resize handle clicked');
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        e.nativeEvent.stopImmediatePropagation();
                                                                        handleResizeMouseDown(e, element, 'se');
                                                                    }}
                                                                >
                                                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                                                </div>
                                                                <div 
                                                                    className="absolute top-0 right-0 w-8 h-8 bg-blue-600 rounded-bl cursor-ne-resize hover:bg-blue-700 z-10 flex items-center justify-center"
                                                                    onMouseDown={(e) => {
                                                                        console.log('NE resize handle clicked');
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        e.nativeEvent.stopImmediatePropagation();
                                                                        handleResizeMouseDown(e, element, 'ne');
                                                                    }}
                                                                >
                                                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                                                </div>
                                                                <div 
                                                                    className="absolute bottom-0 left-0 w-8 h-8 bg-blue-600 rounded-tr cursor-nw-resize hover:bg-blue-700 z-10 flex items-center justify-center"
                                                                    onMouseDown={(e) => {
                                                                        console.log('NW resize handle clicked');
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        e.nativeEvent.stopImmediatePropagation();
                                                                        handleResizeMouseDown(e, element, 'nw');
                                                                    }}
                                                                >
                                                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                                                </div>
                                                                <div 
                                                                    className="absolute top-0 left-0 w-8 h-8 bg-blue-600 rounded-br cursor-sw-resize hover:bg-blue-700 z-10 flex items-center justify-center"
                                                                    onMouseDown={(e) => {
                                                                        console.log('SW resize handle clicked');
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        e.nativeEvent.stopImmediatePropagation();
                                                                        handleResizeMouseDown(e, element, 'sw');
                                                                    }}
                                                                >
                                                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                                                </div>
                                                            </div>
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
                                                        onClick={() => addElementToPage('title', 'Title')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Title</div>
                                                        <div className="text-xs text-gray-600">Main heading</div>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => addElementToPage('subtitle', 'Subtitle')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Subtitle</div>
                                                        <div className="text-xs text-gray-600">Secondary heading</div>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => addElementToPage('text', 'Text Block')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Text Block</div>
                                                        <div className="text-xs text-gray-600">Paragraph text</div>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => addElementToPage('bullet-list', 'Bullet List')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Bullet List</div>
                                                        <div className="text-xs text-gray-600">List items</div>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => addElementToPage('image', 'Image')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Image</div>
                                                        <div className="text-xs text-gray-600">Photo or graphic</div>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => addElementToPage('chart', 'Chart')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Chart</div>
                                                        <div className="text-xs text-gray-600">Data visualization</div>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => addElementToPage('icon', 'Icon')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Icon</div>
                                                        <div className="text-xs text-gray-600">Small icon</div>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => addElementToPage('divider', 'Divider')}
                                                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                                    >
                                                        <div className="text-sm font-medium">Divider</div>
                                                        <div className="text-xs text-gray-600">Separator line</div>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Element Properties */}
                                            {editingTheme.pages && editingTheme.pages[editingTheme.selectedPage || 'page1'] && 
                                             editingTheme.pages[editingTheme.selectedPage || 'page1'].elements.length > 0 && (
                                                <div>
                                                    <Label className="text-sm font-medium mb-2 block">Element Properties</Label>
                                                    <div className="space-y-3">
                                                        {(editingTheme.pages[editingTheme.selectedPage || 'page1'].elements || []).filter(Boolean).map((element, index) => (
                                                            <div key={element.id} className="border border-gray-200 rounded-lg p-3">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="font-medium text-sm">{element.name}</span>
                                                                    <button
                                                                        onClick={() => removeElementFromPage(element.id)}
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
                                                                            value={element.structure?.x || 0}
                                                                            onChange={(e) => updateElementPropertyInPage(element.id, 'x', parseInt(e.target.value))}
                                                                            className="h-6 text-xs"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs">Y Position (%)</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            value={element.structure?.y || 0}
                                                                            onChange={(e) => updateElementPropertyInPage(element.id, 'y', parseInt(e.target.value))}
                                                                            className="h-6 text-xs"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs">Width (%)</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min="10"
                                                                            max="100"
                                                                            value={element.structure?.width || 30}
                                                                            onChange={(e) => updateElementPropertyInPage(element.id, 'width', parseInt(e.target.value))}
                                                                            className="h-6 text-xs"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs">Height (%)</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min="10"
                                                                            max="100"
                                                                            value={element.structure?.height || 20}
                                                                            onChange={(e) => updateElementPropertyInPage(element.id, 'height', parseInt(e.target.value))}
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
                                                                            onChange={(e) => updateElementPropertyInPage(element.id, 'content', e.target.value)}
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
                                                                            onChange={(e) => updateElementPropertyInPage(element.id, 'items', e.target.value.split('\n').filter(item => item.trim()))}
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
                                                                            onChange={(e) => updateElementPropertyInPage(element.id, 'src', e.target.value)}
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
                                                                            onValueChange={(value) => updateElementPropertyInPage(element.id, 'chartType', value)}
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

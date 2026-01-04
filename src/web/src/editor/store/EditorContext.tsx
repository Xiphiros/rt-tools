import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react';
import { editorReducer, initialHistory, EditorAction, initialMapData } from './editorReducer';
import { useEditorAudio } from '../hooks/useEditorAudio';
import { EditorMapData, EditorSettings, PlaybackState, EditorTool } from '../types';
import { loadProjectJSON, saveProjectJSON, readFileFromProject, createProject } from '../utils/opfs';

interface EditorContextState {
    mapData: EditorMapData;
    canUndo: boolean;
    canRedo: boolean;
    
    playback: PlaybackState;
    audio: ReturnType<typeof useEditorAudio>;

    settings: EditorSettings;
    activeTool: EditorTool;
    setActiveTool: (tool: EditorTool) => void;
    
    activeProjectId: string | null;
    loadProject: (id: string) => Promise<void>;
    createNewProject: () => Promise<void>;
    
    bgBlobUrl: string | null;
    reloadAssets: () => void;
    
    dispatch: React.Dispatch<EditorAction>;
    setSettings: React.Dispatch<React.SetStateAction<EditorSettings>>;
}

const EditorContext = createContext<EditorContextState | null>(null);

export const EditorProvider = ({ children }: { children: ReactNode }) => {
    const [history, dispatch] = useReducer(editorReducer, initialHistory);
    const audioHook = useEditorAudio();
    
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [bgBlobUrl, setBgBlobUrl] = useState<string | null>(null);
    const [assetsVersion, setAssetsVersion] = useState(0);
    const [activeTool, setActiveTool] = useState<EditorTool>('select');

    const [settings, setSettings] = React.useState<EditorSettings>({
        snapDivisor: 4,
        playbackSpeed: 1.0,
        zoom: 150, 
        metronome: false,
        snappingEnabled: true,
        showWaveform: true
    });

    // Auto-Save to Active Project
    useEffect(() => {
        if (!activeProjectId) return;
        
        const timer = setTimeout(() => {
            saveProjectJSON(activeProjectId, history.present);
        }, 2000);
        return () => clearTimeout(timer);
    }, [history.present, activeProjectId]);

    // Load Project Logic
    const loadProject = async (id: string) => {
        const data = await loadProjectJSON(id);
        if (data) {
            setActiveProjectId(id);
            dispatch({ type: 'LOAD_MAP', payload: data });
            
            // Reset Audio/Visuals
            audioHook.pause();
            audioHook.seek(0);
            
            // Trigger Asset Reload
            setAssetsVersion(v => v + 1);
        }
    };

    const createNewProject = async () => {
        const newId = crypto.randomUUID();
        const emptyData = { ...initialMapData }; 
        await createProject(newId, emptyData);
        await loadProject(newId);
    };

    // Asset Loading Logic (Scoped to Active Project)
    useEffect(() => {
        if (!activeProjectId) return;

        const loadAssets = async () => {
            const meta = history.present.metadata;
            
            if (meta.audioFile) {
                const file = await readFileFromProject(activeProjectId, meta.audioFile);
                if (file) {
                    await audioHook.load(file);
                }
            }

            if (meta.backgroundFile) {
                const file = await readFileFromProject(activeProjectId, meta.backgroundFile);
                if (file) {
                    const url = URL.createObjectURL(file);
                    setBgBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
                }
            }
        };
        loadAssets();
    }, [assetsVersion, activeProjectId, history.present.metadata.audioFile, history.present.metadata.backgroundFile]);

    // Initialize Default Project if none exists
    useEffect(() => {
        if (!activeProjectId) {
            // We could load the most recent project here in a real app
            // createNewProject(); 
        }
    }, []);

    useEffect(() => {
        audioHook.setRate(settings.playbackSpeed);
    }, [settings.playbackSpeed, audioHook]);

    const value: EditorContextState = {
        mapData: history.present,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
        
        playback: {
            isPlaying: audioHook.isPlaying,
            currentTime: audioHook.currentTime,
            playbackRate: settings.playbackSpeed,
            duration: audioHook.duration
        },
        audio: audioHook,
        
        settings,
        setSettings,
        dispatch,
        
        activeTool,
        setActiveTool,
        
        activeProjectId,
        loadProject,
        createNewProject,
        
        bgBlobUrl,
        reloadAssets: () => setAssetsVersion(v => v + 1)
    };

    return (
        <EditorContext.Provider value={value}>
            {children}
        </EditorContext.Provider>
    );
};

export const useEditor = () => {
    const context = useContext(EditorContext);
    if (!context) throw new Error("useEditor must be used within an EditorProvider");
    return context;
};
import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react';
import { editorReducer, initialHistory, EditorAction, initialMapData } from './editorReducer';
import { useEditorAudio } from '../hooks/useEditorAudio';
import { EditorMapData, EditorSettings, PlaybackState, EditorTool } from '../types';
import { loadProjectJSON, saveProjectJSON, readFileFromOPFS } from '../utils/opfs';

interface EditorContextState {
    mapData: EditorMapData;
    canUndo: boolean;
    canRedo: boolean;
    
    playback: PlaybackState;
    audio: ReturnType<typeof useEditorAudio>;

    settings: EditorSettings;
    activeTool: EditorTool;
    setActiveTool: (tool: EditorTool) => void;
    
    audioBlobUrl: string | null;
    bgBlobUrl: string | null;
    reloadAssets: () => void;
}

interface EditorContextDispatch {
    dispatch: React.Dispatch<EditorAction>;
    setSettings: React.Dispatch<React.SetStateAction<EditorSettings>>;
}

const EditorContext = createContext<(EditorContextState & EditorContextDispatch) | null>(null);

export const EditorProvider = ({ children }: { children: ReactNode }) => {
    const [history, dispatch] = useReducer(editorReducer, initialHistory);
    const audioHook = useEditorAudio();
    
    const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
    const [bgBlobUrl, setBgBlobUrl] = useState<string | null>(null);
    const [assetsVersion, setAssetsVersion] = useState(0);
    const [activeTool, setActiveTool] = useState<EditorTool>('select');

    // Settings
    const [settings, setSettings] = React.useState<EditorSettings>({
        snapDivisor: 4,
        playbackSpeed: 1.0,
        zoom: 150, 
        metronome: false,
        snappingEnabled: true
    });

    // Auto-Load
    useEffect(() => {
        const load = async () => {
            const data = await loadProjectJSON();
            if (data) {
                dispatch({ type: 'LOAD_MAP', payload: data });
                setAssetsVersion(v => v + 1); 
            }
        };
        load();
    }, []);

    // Auto-Save
    useEffect(() => {
        const timer = setTimeout(() => {
            if (history.present !== initialMapData) {
                saveProjectJSON(history.present);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [history.present]);

    // Asset Loading
    useEffect(() => {
        const loadAssets = async () => {
            const meta = history.present.metadata;
            if (meta.audioFile) {
                const file = await readFileFromOPFS(meta.audioFile);
                if (file) {
                    const url = URL.createObjectURL(file);
                    setAudioBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
                    audioHook.load(url);
                }
            }
            if (meta.backgroundFile) {
                const file = await readFileFromOPFS(meta.backgroundFile);
                if (file) {
                    const url = URL.createObjectURL(file);
                    setBgBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
                }
            }
        };
        loadAssets();
    }, [assetsVersion, history.present.metadata.audioFile, history.present.metadata.backgroundFile]);

    useEffect(() => {
        audioHook.setRate(settings.playbackSpeed);
    }, [settings.playbackSpeed, audioHook]);

    const value: EditorContextState & EditorContextDispatch = {
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
        
        audioBlobUrl,
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
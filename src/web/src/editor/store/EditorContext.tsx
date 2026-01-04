import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { editorReducer, initialHistory, EditorAction } from './editorReducer';
import { useEditorAudio } from '../hooks/useEditorAudio';
import { EditorMapData, EditorSettings, PlaybackState } from '../types';

// --- STATE DEFINITION ---
interface EditorContextState {
    // Data (History Wrapper)
    mapData: EditorMapData;
    canUndo: boolean;
    canRedo: boolean;
    
    // Playback
    playback: PlaybackState;
    audio: ReturnType<typeof useEditorAudio>;

    // Settings
    settings: EditorSettings;
}

interface EditorContextDispatch {
    dispatch: React.Dispatch<EditorAction>;
    setSettings: React.Dispatch<React.SetStateAction<EditorSettings>>;
}

const EditorContext = createContext<(EditorContextState & EditorContextDispatch) | null>(null);

export const EditorProvider = ({ children }: { children: ReactNode }) => {
    // 1. Logic State (Redux-like)
    const [history, dispatch] = useReducer(editorReducer, initialHistory);

    // 2. Audio State (Hook)
    const audioHook = useEditorAudio();

    // 3. UI Settings (Local State)
    const [settings, setSettings] = React.useState<EditorSettings>({
        snapDivisor: 4, // 1/4 beat
        playbackSpeed: 1.0,
        zoom: 100, // 100px per second
        metronome: false
    });

    // Sync Audio Rate with Settings
    React.useEffect(() => {
        audioHook.setRate(settings.playbackSpeed);
    }, [settings.playbackSpeed, audioHook]);

    // Derived State
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
        dispatch
    };

    return (
        <EditorContext.Provider value={value}>
            {children}
        </EditorContext.Provider>
    );
};

export const useEditor = () => {
    const context = useContext(EditorContext);
    if (!context) {
        throw new Error("useEditor must be used within an EditorProvider");
    }
    return context;
};
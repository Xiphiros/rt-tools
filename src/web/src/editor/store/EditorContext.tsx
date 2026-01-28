import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react';
import { editorReducer, initialHistory, EditorAction, initialMapData, DEFAULT_LAYER_ID } from './editorReducer';
import { useEditorAudio } from '../hooks/useEditorAudio';
import { EditorMapData, EditorSettings, PlaybackState, EditorTool, HitsoundSettings } from '../types';
import { loadProjectAnyDiff, loadDifficulty, saveDifficulty, createProject, readFileFromProject } from '../utils/opfs';

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
    switchDifficulty: (diffId: string) => Promise<void>;
    createNewProject: () => Promise<void>;
    createNewDifficulty: (name: string, copySettings: boolean) => Promise<void>;
    bgBlobUrl: string | null;
    reloadAssets: () => void;
    activeLayerId: string;
    setActiveLayerId: (id: string) => void;
    defaultHitsounds: HitsoundSettings;
    setDefaultHitsounds: React.Dispatch<React.SetStateAction<HitsoundSettings>>;
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
    const [activeLayerId, setActiveLayerId] = useState<string>(DEFAULT_LAYER_ID);

    // Global default for new notes
    const [defaultHitsounds, setDefaultHitsounds] = useState<HitsoundSettings>({
        sampleSet: 'normal',
        volume: 100,
        additions: { whistle: false, finish: false, clap: false }
    });

    const [settings, setSettings] = React.useState<EditorSettings>({
        snapDivisor: 4,
        playbackSpeed: 1.0,
        zoom: 150, 
        metronome: false,
        snappingEnabled: true,
        showWaveform: true,
        dimInactiveLayers: true,
        
        // Visual Defaults
        rowOffsets: [0, 0, 0], // Top, Home, Bot offsets
        noteShape: 'circle',
        approachStyle: 'standard',
        approachRate: 0.5, // 500ms default

        masterVolume: 80,
        musicVolume: 70,
        hitsoundVolume: 100,
        metronomeVolume: 60
    });

    // Ensure active layer exists
    useEffect(() => {
        const layers = history.present.layers;
        if (!layers.find(l => l.id === activeLayerId) && layers.length > 0) {
            setActiveLayerId(layers[0].id);
        }
    }, [history.present.layers, activeLayerId]);

    // --- VOLUME SYNC ---
    const { setMasterVolume, setMusicVolume, setHitsoundVolume, setMetronomeVolume } = audioHook;
    useEffect(() => { setMasterVolume(settings.masterVolume); }, [settings.masterVolume, setMasterVolume]);
    useEffect(() => { setMusicVolume(settings.musicVolume); }, [settings.musicVolume, setMusicVolume]);
    useEffect(() => { setHitsoundVolume(settings.hitsoundVolume); }, [settings.hitsoundVolume, setHitsoundVolume]);
    useEffect(() => { setMetronomeVolume(settings.metronomeVolume); }, [settings.metronomeVolume, setMetronomeVolume]);

    // Auto-Save
    useEffect(() => {
        if (!activeProjectId) return;
        const timer = setTimeout(() => {
            saveDifficulty(activeProjectId, history.present);
        }, 2000);
        return () => clearTimeout(timer);
    }, [history.present, activeProjectId]);

    const loadProject = async (id: string) => {
        const data = await loadProjectAnyDiff(id);
        if (data) {
            setActiveProjectId(id);
            dispatch({ type: 'LOAD_MAP', payload: data });
            audioHook.pause();
            audioHook.seek(0);
            setAssetsVersion(v => v + 1);
        }
    };

    const switchDifficulty = async (diffId: string) => {
        if (!activeProjectId) return;
        await saveDifficulty(activeProjectId, history.present);
        
        const data = await loadDifficulty(activeProjectId, diffId);
        if (data) {
            dispatch({ type: 'LOAD_MAP', payload: data });
            setAssetsVersion(v => v + 1);
        }
    };

    const createNewProject = async () => {
        const newId = crypto.randomUUID();
        const emptyData = { ...initialMapData, diffId: crypto.randomUUID() }; 
        await createProject(newId, emptyData);
        await loadProject(newId);
    };

    const createNewDifficulty = async (name: string, copySettings: boolean) => {
        if (!activeProjectId) return;
        await saveDifficulty(activeProjectId, history.present);

        const newId = crypto.randomUUID();
        const base = history.present;
        
        const newData: EditorMapData = {
            ...initialMapData,
            diffId: newId,
            metadata: {
                ...base.metadata,
                difficultyName: name
            },
            timingPoints: copySettings ? [...base.timingPoints] : base.timingPoints,
            bpm: base.bpm,
            offset: base.offset
        };

        if (copySettings) {
             newData.metadata = { ...base.metadata, difficultyName: name };
             newData.timingPoints = [...base.timingPoints];
        }

        await saveDifficulty(activeProjectId, newData);
        dispatch({ type: 'LOAD_MAP', payload: newData });
    };

    useEffect(() => {
        if (!activeProjectId) return;
        const loadAssets = async () => {
            const meta = history.present.metadata;
            if (meta.audioFile) {
                const file = await readFileFromProject(activeProjectId, meta.audioFile);
                if (file) await audioHook.load(file);
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
        switchDifficulty,
        createNewProject,
        createNewDifficulty,
        bgBlobUrl,
        reloadAssets: () => setAssetsVersion(v => v + 1),
        activeLayerId,
        setActiveLayerId,
        defaultHitsounds,
        setDefaultHitsounds
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
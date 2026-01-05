import { useState } from 'react';
import { useEditor } from '../store/EditorContext';
import { EditorLayer } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, 
    faEye, 
    faEyeSlash, 
    faLock, 
    faLockOpen, 
    faTrash, 
    faLayerGroup,
    faPen,
    faCheck
} from '@fortawesome/free-solid-svg-icons';

const LayerItem = ({ 
    layer, 
    isActive, 
    onActivate, 
    onToggleVisible, 
    onToggleLock, 
    onDelete, 
    onRename 
}: { 
    layer: EditorLayer;
    isActive: boolean;
    onActivate: () => void;
    onToggleVisible: () => void;
    onToggleLock: () => void;
    onDelete: () => void;
    onRename: (name: string) => void;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(layer.name);

    const handleSaveName = () => {
        if (tempName.trim()) onRename(tempName);
        setIsEditing(false);
    };

    return (
        <div 
            onClick={onActivate}
            className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all duration-200 select-none ${
                isActive 
                ? 'bg-primary/10 border-primary/50 shadow-[0_0_10px_rgba(34,211,238,0.1)]' 
                : 'bg-card border-transparent hover:bg-white/5 hover:border-white/10'
            }`}
        >
            {/* Color Indicator */}
            <div 
                className="w-1 h-8 rounded-full" 
                style={{ backgroundColor: layer.color }} 
            />

            {/* Controls */}
            <div className="flex flex-col gap-1 text-xs text-muted">
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
                    className={`hover:text-white transition-colors ${!layer.visible ? 'text-white/20' : ''}`}
                    title={layer.visible ? "Hide Layer" : "Show Layer"}
                >
                    <FontAwesomeIcon icon={layer.visible ? faEye : faEyeSlash} fixedWidth />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
                    className={`hover:text-white transition-colors ${layer.locked ? 'text-warning' : ''}`}
                    title={layer.locked ? "Unlock Layer" : "Lock Layer"}
                >
                    <FontAwesomeIcon icon={layer.locked ? faLock : faLockOpen} fixedWidth />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center h-full ml-1">
                {isEditing ? (
                    <div className="flex items-center gap-1">
                        <input 
                            type="text" 
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-input border border-primary rounded px-1 py-0.5 text-xs text-white focus:outline-none"
                            autoFocus
                        />
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleSaveName(); }}
                            className="text-success hover:text-white p-1"
                        >
                            <FontAwesomeIcon icon={faCheck} />
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-between items-center group/title">
                        <span className={`text-sm font-semibold truncate ${!layer.visible ? 'opacity-50 line-through decoration-white/20' : 'text-white'}`}>
                            {layer.name}
                        </span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setTempName(layer.name); setIsEditing(true); }}
                            className="opacity-0 group-hover/title:opacity-100 text-[10px] text-muted hover:text-white transition-opacity p-1"
                        >
                            <FontAwesomeIcon icon={faPen} />
                        </button>
                    </div>
                )}
                <span className="text-[10px] text-muted opacity-0 group-hover:opacity-60 transition-opacity">
                    ID: {layer.id.slice(0, 4)}...
                </span>
            </div>

            {/* Actions */}
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-danger/20 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
                title="Delete Layer"
            >
                <FontAwesomeIcon icon={faTrash} size="xs" />
            </button>
        </div>
    );
};

export const EditorRightBar = () => {
    const { mapData, dispatch, activeLayerId, setActiveLayerId } = useEditor();

    // Render in reverse order (Top layer visually at top of list)
    const reversedLayers = [...mapData.layers].reverse();

    const handleAddLayer = () => {
        const id = crypto.randomUUID();
        const colors = ['#38bdf8', '#c084fc', '#f472b6', '#4ade80', '#fbbf24'];
        const randomColor = colors[mapData.layers.length % colors.length];
        
        const newLayer: EditorLayer = {
            id,
            name: `Pattern ${mapData.layers.length + 1}`,
            visible: true,
            locked: false,
            color: randomColor
        };

        dispatch({ type: 'ADD_LAYER', payload: newLayer });
        setActiveLayerId(id);
    };

    return (
        <div className="w-64 bg-[#121212] border-l border-white/10 flex flex-col h-full select-none z-40 shadow-xl">
            {/* Header */}
            <div className="h-10 flex items-center justify-between px-4 border-b border-white/10 bg-card/50">
                <div className="flex items-center gap-2 text-muted text-xs font-bold uppercase tracking-wider">
                    <FontAwesomeIcon icon={faLayerGroup} />
                    Layers
                </div>
                <button 
                    onClick={handleAddLayer}
                    className="w-6 h-6 rounded flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-black transition-colors"
                    title="Add New Layer"
                >
                    <FontAwesomeIcon icon={faPlus} size="xs" />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {reversedLayers.map(layer => (
                    <LayerItem 
                        key={layer.id}
                        layer={layer}
                        isActive={layer.id === activeLayerId}
                        onActivate={() => setActiveLayerId(layer.id)}
                        onToggleVisible={() => dispatch({ 
                            type: 'UPDATE_LAYER', 
                            payload: { id: layer.id, changes: { visible: !layer.visible } } 
                        })}
                        onToggleLock={() => dispatch({ 
                            type: 'UPDATE_LAYER', 
                            payload: { id: layer.id, changes: { locked: !layer.locked } } 
                        })}
                        onRename={(name) => dispatch({
                            type: 'UPDATE_LAYER',
                            payload: { id: layer.id, changes: { name } }
                        })}
                        onDelete={() => {
                            if (mapData.layers.length > 1 && confirm(`Delete layer "${layer.name}" and all its notes?`)) {
                                dispatch({ type: 'REMOVE_LAYER', payload: layer.id });
                                // If we deleted active layer, context will auto-switch in effect
                            }
                        }}
                    />
                ))}
            </div>

            {/* Footer / Stats */}
            <div className="p-3 border-t border-white/10 text-[10px] text-muted text-center">
                {mapData.notes.length} Total Objects
            </div>
        </div>
    );
};
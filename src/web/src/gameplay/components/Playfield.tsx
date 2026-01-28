import React from 'react';
import { EditorMapData, EditorNote } from '../../editor/types';
import { NOTE_SIZE, ROW_COLORS, KEY_TO_ROW } from '../constants';
import { getNoteCoordinates } from '../utils/playfieldCoordinates';

interface PlayfieldProps {
    mapData: EditorMapData;
    currentTime: number; 
    playbackRate: number;
    showApproachCircles?: boolean;
    scale?: number;
    activeLayerId?: string;
    dimInactiveLayers?: boolean;
    
    // Visual Settings
    rowOffsets?: [number, number, number];
    rowXOffsets?: [number, number, number];
    noteShape?: 'circle' | 'diamond' | 'square';
    approachStyle?: 'standard' | 'inverted';
    approachRate?: number; 

    // Interaction
    highlightedNoteId?: string | null; // NEW: ID of note to glow/highlight
    onNoteClick?: (e: React.MouseEvent, note: EditorNote) => void;
    onBackgroundClick?: (e: React.MouseEvent) => void;
}

export const Playfield = ({ 
    mapData, 
    currentTime, 
    showApproachCircles = true, 
    scale = 1.0,
    onNoteClick,
    onBackgroundClick,
    activeLayerId,
    dimInactiveLayers = true,
    rowOffsets = [0, 0, 0], 
    rowXOffsets = [0, 0, 0],
    noteShape = 'circle',
    approachStyle = 'standard',
    approachRate = 0.5,
    highlightedNoteId = null
}: PlayfieldProps) => {
    
    const PREEMPT = approachRate * 1000; 
    const FADE_OUT = 200;

    const layerMap = new Map(mapData.layers.map(l => [l.id, l]));

    const visibleNotes = mapData.notes.filter(n => {
        const relativeTime = n.time - currentTime;
        const endTime = n.type === 'hold' ? n.time + (n.duration || 0) : n.time;
        if (relativeTime > PREEMPT || (endTime - currentTime) < -FADE_OUT) return false;

        const layer = layerMap.get(n.layerId);
        if (layer && !layer.visible) return false;

        return true;
    });

    const actualSize = NOTE_SIZE * scale;
    const borderRadius = noteShape === 'circle' ? '50%' : '0%';
    const rotation = noteShape === 'diamond' ? 'rotate(45deg)' : 'none';

    const renderGhosts = () => {
        // Ghost rendering logic remains similar but uses the utility
        // For brevity/DRY, we iterate keys
        const elements: React.ReactNode[] = [];
        // Hardcoded iteration to match utils logic implicitly
        const rows = [0, 1, 2];
        const keys = [
            ['q','w','e','r','t','y','u','i','o','p'],
            ['a','s','d','f','g','h','j','k','l',';'],
            ['z','x','c','v','b','n','m',',','.','/']
        ];

        rows.forEach(r => {
            keys[r].forEach(char => {
                const pos = getNoteCoordinates({ 
                    row: r, 
                    key: char, 
                    rowOffsets, 
                    rowXOffsets 
                });
                
                elements.push(
                    <div 
                        key={`ghost-${char}`}
                        className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    >
                        <div 
                            className="border-2 border-white/5 bg-white/5 flex items-center justify-center"
                            style={{ 
                                width: actualSize, 
                                height: actualSize,
                                borderRadius: borderRadius,
                                transform: rotation
                            }}
                        >
                            <span 
                                className="font-bold text-white/10 font-mono" 
                                style={{ 
                                    fontSize: actualSize * 0.4,
                                    transform: noteShape === 'diamond' ? 'rotate(-45deg)' : 'none'
                                }}
                            >
                                {char.toUpperCase()}
                            </span>
                        </div>
                    </div>
                );
            });
        });
        return elements;
    };

    const handleBgClick = (e: React.MouseEvent) => {
        if (onBackgroundClick) onBackgroundClick(e);
    };

    return (
        <div 
            className="relative w-full h-full bg-black/40 overflow-hidden select-none isolate"
            onMouseDown={handleBgClick} 
        >
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
            />

            {renderGhosts()}

            {visibleNotes.map(note => {
                const pos = getNoteCoordinates({ 
                    row: note.column, 
                    key: note.key, 
                    rowOffsets, 
                    rowXOffsets 
                });
                
                const relativeTime = note.time - currentTime;
                const endTime = note.type === 'hold' ? note.time + (note.duration || 0) : note.time;
                const isHolding = note.type === 'hold' && currentTime >= note.time && currentTime <= endTime;
                
                let opacity = 1;
                if (relativeTime > PREEMPT - 200) {
                    opacity = (PREEMPT - relativeTime) / 200;
                } else if (relativeTime < 0 && !isHolding) {
                    opacity = 1 - (Math.abs(relativeTime) / FADE_OUT);
                }

                if (dimInactiveLayers && activeLayerId && note.layerId !== activeLayerId) {
                    opacity *= 0.3; 
                }

                const progress = 1 - (relativeTime / PREEMPT);
                
                let approachScale = 1;
                if (approachStyle === 'standard') {
                     approachScale = 2.5 - (1.5 * progress);
                } else {
                     approachScale = progress * 1.3;
                }

                const colors = ROW_COLORS as Record<number, string>;
                const row = KEY_TO_ROW[note.key.toLowerCase()] ?? note.column;
                
                const noteLayer = layerMap.get(note.layerId);
                const layerColor = noteLayer ? noteLayer.color : '#fff';
                const rowColor = colors[row] || '#fff';

                const zIndex = 5000 - (Math.floor(note.time) % 5000); 
                
                const isSelected = note.selected;
                const isHighlighted = highlightedNoteId === note.id;
                
                const borderColor = isSelected 
                    ? '#fff' 
                    : (isHolding ? '#fff' : (isHighlighted ? '#22d3ee' : rowColor));
                
                const borderWidth = (isSelected || isHighlighted) ? '6px' : '4px';
                
                // Add highlight glow effect
                const boxShowExtras = isHighlighted ? `0 0 25px #22d3ee, inset 0 0 10px #22d3ee` : '';

                return (
                    <div 
                        key={note.id}
                        className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 will-change-transform cursor-pointer"
                        style={{
                            left: `${pos.x}%`,
                            top: `${pos.y}%`,
                            opacity: Math.max(0, opacity),
                            zIndex: isHighlighted ? 9999 : zIndex // Pop targeted notes to top
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            if (onNoteClick) onNoteClick(e, note);
                        }}
                    >
                        {isHolding && (
                            <div 
                                className="absolute animate-pulse pointer-events-none"
                                style={{
                                    width: actualSize * 1.4,
                                    height: actualSize * 1.4,
                                    backgroundColor: rowColor,
                                    opacity: 0.3,
                                    filter: 'blur(8px)',
                                    borderRadius: borderRadius
                                }}
                            />
                        )}

                        <div 
                            className="flex items-center justify-center shadow-lg transition-all duration-100 hover:brightness-125"
                            style={{
                                width: actualSize,
                                height: actualSize,
                                backgroundColor: isHolding ? '#fff' : '#18181b', 
                                border: `${borderWidth} solid ${borderColor}`,
                                boxShadow: isHolding 
                                    ? `0 0 20px ${rowColor}, inset 0 0 10px ${rowColor}`
                                    : (isSelected 
                                        ? `0 0 15px ${rowColor}, inset 0 0 5px white` 
                                        : `0 0 10px ${rowColor}40 ${boxShowExtras ? ', ' + boxShowExtras : ''}`),
                                borderRadius: borderRadius,
                                transform: rotation
                            }}
                        >
                            <span 
                                className="font-bold font-mono drop-shadow-md" 
                                style={{ 
                                    fontSize: actualSize * 0.4,
                                    color: isHolding ? '#000' : '#fff',
                                    transform: noteShape === 'diamond' ? 'rotate(-45deg)' : 'none'
                                }}
                            >
                                {note.key.toUpperCase()}
                            </span>
                        </div>

                        {showApproachCircles && relativeTime > 0 && relativeTime <= PREEMPT && (
                            <div 
                                className="absolute border-2 pointer-events-none"
                                style={{
                                    width: actualSize,
                                    height: actualSize,
                                    borderColor: rowColor,
                                    opacity: 0.6,
                                    borderRadius: borderRadius,
                                    transform: `${rotation} scale(${approachScale})`
                                }}
                            />
                        )}
                        
                        {activeLayerId && note.layerId !== activeLayerId && dimInactiveLayers && (
                            <div 
                                className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-black"
                                style={{ backgroundColor: layerColor }}
                                title={`Layer: ${noteLayer?.name}`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};
import React from 'react';
import { EditorMapData, EditorNote } from '../../editor/types';
import { NOTE_SIZE, ROW_COLORS, ROW_TOP, ROW_HOME, ROW_BOTTOM, KEY_TO_ROW } from '../constants';

interface PlayfieldProps {
    mapData: EditorMapData;
    currentTime: number; 
    playbackRate: number;
    showApproachCircles?: boolean;
    scale?: number;
    activeLayerId?: string;
    dimInactiveLayers?: boolean;
    
    // Visual Settings Props
    rowOffsets?: [number, number, number];  // Y
    rowXOffsets?: [number, number, number]; // X
    noteShape?: 'circle' | 'diamond' | 'square';
    approachStyle?: 'standard' | 'inverted';
    approachRate?: number; 

    onNoteClick?: (e: React.MouseEvent, note: EditorNote) => void;
    onBackgroundClick?: (e: React.MouseEvent) => void;
}

const CENTER_X = 50; 
const CENTER_Y = 50; 

const BASE_ROW_Y_OFFSETS: Record<number, number> = {
    [ROW_TOP]: -15,     
    [ROW_HOME]: 0,      
    [ROW_BOTTOM]: 15    
};

const KEY_ORDER: Record<number, string[]> = {
    [ROW_TOP]: ['q','w','e','r','t','y','u','i','o','p'],
    [ROW_HOME]: ['a','s','d','f','g','h','j','k','l',';'],
    [ROW_BOTTOM]: ['z','x','c','v','b','n','m',',','.','/']
};

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
    rowXOffsets = [0, 0, 0], // New X Defaults
    noteShape = 'circle',
    approachStyle = 'standard',
    approachRate = 0.5
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

    const getPosition = (row: number, char: string) => {
        const lowerChar = char.toLowerCase();
        let targetRow = row;
        
        if (KEY_TO_ROW[lowerChar] !== undefined) {
            targetRow = KEY_TO_ROW[lowerChar];
        }

        const rowKeys = KEY_ORDER[targetRow] || [];
        const keyIndex = rowKeys.indexOf(lowerChar);
        
        const baseY = BASE_ROW_Y_OFFSETS[targetRow] || 0;
        const userOffsetY = (rowOffsets[targetRow] || 0) * 0.25;
        
        // Apply X Offset
        // Default stagger logic
        let rowStagger = 0;
        if (targetRow === ROW_HOME) rowStagger = 2; 
        if (targetRow === ROW_BOTTOM) rowStagger = 4;

        // User X Override
        // 1 unit = 1% width approx
        const userOffsetX = (rowXOffsets[targetRow] || 0);

        // If user sets X to something specific, maybe we should disable default stagger?
        // Let's Add them. If user wants aligned, they can compensate or we provide a "Flat" mode later.
        // Actually, request said "0,0,0 resulting in perfect alignment".
        // So we should remove rowStagger if offsets are being used? 
        // No, let's keep it additive. To get alignment, user sets offsets to cancel stagger.
        // Wait, "0,0,0 resulting in perfectly aligned" implies the BASE stagger should be removed or controllable.
        // Let's remove the hardcoded stagger and rely on the new offsets + key position.
        
        // REVISED: Remove `rowStagger` hardcoded variable. 
        // The default `rowXOffsets` in context should reproduce the stagger if desired, 
        // OR we just make 0,0,0 the "flat" grid.
        
        // Going with "0,0,0 is flat grid".
        // To preserve legacy look, defaults in Context should be [0, 2, 4]?
        // The user asked for "0,0,0 resulting in aligned". So base calc should be aligned.

        if (keyIndex !== -1) {
            const rowWidth = rowKeys.length;
            const xOffsetPct = ((keyIndex - (rowWidth / 2)) + 0.5) * 8; 

            return {
                x: CENTER_X + xOffsetPct + userOffsetX,
                y: CENTER_Y + baseY + userOffsetY
            };
        } else {
            return { x: CENTER_X + userOffsetX, y: CENTER_Y + baseY + userOffsetY };
        }
    };

    const actualSize = NOTE_SIZE * scale;
    const borderRadius = noteShape === 'circle' ? '50%' : '0%';
    const rotation = noteShape === 'diamond' ? 'rotate(45deg)' : 'none';

    const renderGhosts = () => {
        const elements: React.ReactNode[] = [];
        [ROW_TOP, ROW_HOME, ROW_BOTTOM].forEach(row => {
            KEY_ORDER[row].forEach(char => {
                const pos = getPosition(row, char);
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
                const pos = getPosition(note.column, note.key);
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
                const borderColor = isSelected 
                    ? '#fff' 
                    : (isHolding ? '#fff' : rowColor);
                
                const borderWidth = isSelected ? '6px' : '4px';

                return (
                    <div 
                        key={note.id}
                        className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 will-change-transform cursor-pointer"
                        style={{
                            left: `${pos.x}%`,
                            top: `${pos.y}%`,
                            opacity: Math.max(0, opacity),
                            zIndex: zIndex
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
                                    : (isSelected ? `0 0 15px ${rowColor}, inset 0 0 5px white` : `0 0 10px ${rowColor}40`),
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
import { useEditor } from '../store/EditorContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faMousePointer, faMagnet, faTh, faMagic, faSlidersH
} from '@fortawesome/free-solid-svg-icons';

interface EditorToolboxProps {
    onOpenModal?: (modal: string) => void;
}

export const EditorToolbox = ({ onOpenModal }: EditorToolboxProps) => {
    const { activeTool, setActiveTool, settings, setSettings, mapData } = useEditor();
    
    // Disable edit button if nothing selected
    const hasSelection = mapData.notes.some(n => n.selected);

    return (
        <div className="flex flex-col bg-card border border-border rounded-lg shadow-xl overflow-hidden w-10">
            {/* Tools */}
            <button 
                onClick={() => setActiveTool('select')}
                className={`w-10 h-10 flex items-center justify-center transition-colors ${activeTool === 'select' ? 'bg-primary text-black' : 'text-muted hover:text-white hover:bg-white/5'}`}
                title="Select (V)"
            >
                <FontAwesomeIcon icon={faMousePointer} />
            </button>

            <div className="h-[1px] bg-border mx-2 my-1" />

            {/* Actions */}
            <button 
                onClick={() => onOpenModal && onOpenModal('resnap')}
                className={`w-10 h-10 flex items-center justify-center transition-colors text-muted hover:text-white hover:bg-white/5`}
                title="Quantize / Re-snap"
            >
                <FontAwesomeIcon icon={faMagic} />
            </button>

            <button 
                onClick={() => hasSelection && onOpenModal && onOpenModal('properties')}
                className={`w-10 h-10 flex items-center justify-center transition-colors ${hasSelection ? 'text-secondary hover:text-white' : 'text-muted/30 cursor-not-allowed'}`}
                title="Edit Note Properties"
                disabled={!hasSelection}
            >
                <FontAwesomeIcon icon={faSlidersH} />
            </button>

            <div className="h-[1px] bg-border mx-2 my-1" />

            {/* Toggles */}
            <button 
                onClick={() => setSettings(s => ({ ...s, snappingEnabled: !s.snappingEnabled }))}
                className={`w-10 h-10 flex items-center justify-center transition-colors ${settings.snappingEnabled ? 'text-primary' : 'text-muted opacity-50'}`}
                title="Toggle Snapping"
            >
                <FontAwesomeIcon icon={faMagnet} />
            </button>
            
            <button 
                className={`w-10 h-10 flex items-center justify-center transition-colors text-muted hover:text-white`}
                title="Grid Settings"
            >
                <FontAwesomeIcon icon={faTh} />
            </button>
        </div>
    );
};
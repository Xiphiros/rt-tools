import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useEditor } from '../store/EditorContext';
import { ProjectSummary } from '../types';
import { listProjects, deleteProject } from '../utils/opfs';
import { importRtmPackage } from '../utils/importer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, faUpload, faTrash, faFolderOpen, faFileExport, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { exportBeatmapPackage } from '../utils/exporter';

interface ProjectManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProjectManagerModal = ({ isOpen, onClose }: ProjectManagerModalProps) => {
    const { loadProject, activeProjectId, createNewProject, mapData } = useEditor();
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);

    const refreshList = async () => {
        setLoading(true);
        const list = await listProjects();
        setProjects(list);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) refreshList();
    }, [isOpen]);

    const handleLoad = async (id: string) => {
        await loadProject(id);
        onClose();
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this project? This cannot be undone.")) {
            await deleteProject(id);
            await refreshList();
            if (id === activeProjectId) {
                // If we deleted the active project, create a new blank one
                createNewProject();
            }
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        setImporting(true);
        try {
            const file = e.target.files[0];
            const newId = await importRtmPackage(file);
            if (newId) {
                await refreshList();
                await loadProject(newId);
                onClose();
            }
        } finally {
            setImporting(false);
        }
    };

    const handleCreateNew = async () => {
        await createNewProject();
        onClose();
    };

    const handleExport = (e: React.MouseEvent) => {
        e.stopPropagation();
        exportBeatmapPackage(mapData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Project Manager">
            <div className="flex flex-col h-[500px]">
                {/* Actions */}
                <div className="flex gap-2 mb-4">
                    <button 
                        onClick={handleCreateNew}
                        className="px-3 py-1.5 bg-primary text-black font-bold rounded shadow-sm hover:bg-primary-hover transition-colors flex items-center gap-2 text-sm"
                    >
                        <FontAwesomeIcon icon={faPlus} /> New Project
                    </button>
                    
                    <label className="px-3 py-1.5 bg-input border border-border text-white rounded hover:bg-white/5 transition-colors flex items-center gap-2 text-sm cursor-pointer">
                        {importing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faUpload} />}
                        <span>Import .rtm</span>
                        <input type="file" accept=".rtm,.zip" className="hidden" onChange={handleImport} disabled={importing} />
                    </label>
                </div>

                {/* List */}
                <div className="flex-1 bg-input/30 rounded-lg border border-border overflow-hidden flex flex-col">
                    <div className="grid grid-cols-12 gap-2 p-3 bg-input border-b border-border text-xs font-bold text-muted uppercase tracking-wider">
                        <div className="col-span-6">Title</div>
                        <div className="col-span-4">Artist</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>
                    
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-muted">
                                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Loading...
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-muted text-sm">
                                No projects found. Create or import one.
                            </div>
                        ) : (
                            projects.map(p => (
                                <div 
                                    key={p.id}
                                    className={`grid grid-cols-12 gap-2 p-3 border-b border-border/50 items-center text-sm cursor-pointer hover:bg-white/5 transition-colors ${p.id === activeProjectId ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}
                                    onClick={() => handleLoad(p.id)}
                                >
                                    <div className="col-span-6 font-semibold text-white truncate">
                                        {p.title}
                                        {p.id === activeProjectId && <span className="ml-2 text-xs text-primary font-normal">(Active)</span>}
                                    </div>
                                    <div className="col-span-4 text-muted truncate">{p.artist}</div>
                                    <div className="col-span-2 text-right flex justify-end gap-2">
                                        {p.id === activeProjectId && (
                                            <button 
                                                onClick={handleExport}
                                                className="p-2 text-muted hover:text-white transition-colors"
                                                title="Export Active Project"
                                            >
                                                <FontAwesomeIcon icon={faFileExport} />
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => handleDelete(p.id, e)}
                                            className="p-2 text-danger hover:text-danger-light transition-colors"
                                            title="Delete Project"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
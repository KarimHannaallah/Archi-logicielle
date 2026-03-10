import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, createProject, deleteProject } from '../api/client';
import type { Project } from '../types';

export default function ProjectList() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [name, setName] = useState('');

    useEffect(() => {
        getProjects().then(setProjects).catch(() => setProjects([]));
    }, []);

    const handleCreate = async () => {
        if (!name.trim()) return;
        const project = await createProject(name.trim());
        setProjects(prev => [...prev, project]);
        setName('');
    };

    const handleDelete = async (id: string) => {
        await deleteProject(id);
        setProjects(prev => prev.filter(p => p.id !== id));
    };

    return (
        <>
            <h3 className="mb-3">Mes Projets</h3>

            <div className="input-group mb-3">
                <input
                    className="form-control"
                    placeholder="Nom du projet"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
                <button className="btn btn-primary" onClick={handleCreate}>
                    Créer
                </button>
            </div>

            {projects.length === 0 && (
                <p className="text-center text-muted">Aucun projet. Créez-en un ci-dessus !</p>
            )}

            {projects.map(project => (
                <div key={project.id} className="card mb-2">
                    <div className="card-body d-flex align-items-center justify-content-between">
                        <div>
                            <Link to={`/projects/${project.id}`} className="fw-bold text-decoration-none">
                                {project.name}
                            </Link>
                            <div className="text-muted small">
                                {project.completedTasks}/{project.totalTasks} tâches
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <span className={`badge ${project.status === 'open' ? 'bg-success' : 'bg-danger'}`}>
                                {project.status}
                            </span>
                            <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleDelete(project.id)}
                            >
                                <i className="fa fa-trash" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}

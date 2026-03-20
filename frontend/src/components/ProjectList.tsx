import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, deleteProject } from '../api/client';
import type { Project } from '../types';
import CreateProjectForm from './CreateProjectForm';

export default function ProjectList() {
    const [projects, setProjects] = useState<Project[] | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        getProjects()
            .then(setProjects)
            .catch(() => setProjects([]));
    }, []);

    const onProjectCreated = (p: Project) => {
        setProjects(prev => prev ? [p, ...prev] : [p]);
    };

    const onDelete = async (p: Project) => {
        try {
            await deleteProject(p.id);
            setProjects(prev => prev ? prev.filter(x => x.id !== p.id) : []);
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (projects === null) return <div className="text-center mt-5 text-muted">Chargement...</div>;

    return (
        <div className="page-fade">
            <div className="mb-4">
                <h3 className="page-title mb-1">Mes Projets</h3>
                <p className="text-muted mb-0">Gérez vos projets et suivez l'avancement</p>
            </div>

            {error && <div className="alert alert-danger py-2">{error}</div>}

            <CreateProjectForm onProjectCreated={onProjectCreated} />

            {projects.length === 0 ? (
                <div className="empty-state mt-4">
                    <div className="empty-icon">📁</div>
                    <p className="fw-semibold mb-1">Aucun projet pour le moment</p>
                    <p className="empty-text">Créez votre premier projet ci-dessus pour commencer !</p>
                </div>
            ) : (
                <div className="d-flex flex-column gap-2">
                    {projects.map(p => {
                        const pct = p.totalTasks > 0
                            ? Math.round((p.completedTasks / p.totalTasks) * 100)
                            : 0;
                        return (
                            <div key={p.id} className="project-card d-flex align-items-center gap-3">
                                <div className="text-muted" style={{ fontSize: '1.4rem' }}>📂</div>
                                <Link to={`/projects/${p.id}`} className="text-decoration-none flex-grow-1">
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <span className={`badge-status ${p.status === 'closed' ? 'closed' : 'open'}`}>
                                            {p.status === 'closed' ? 'Fermé' : 'Ouvert'}
                                        </span>
                                        <span className="project-name">{p.name}</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="progress flex-grow-1" style={{ height: '5px' }}>
                                            <div
                                                className="progress-bar"
                                                role="progressbar"
                                                style={{ width: `${pct}%` }}
                                                aria-valuenow={pct}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                            />
                                        </div>
                                        <small className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                                            {p.completedTasks}/{p.totalTasks} tâche{p.totalTasks !== 1 ? 's' : ''}
                                        </small>
                                    </div>
                                </Link>
                                <button
                                    className="btn btn-link btn-sm text-danger p-0 ms-2"
                                    onClick={() => onDelete(p)}
                                    aria-label="Supprimer le projet"
                                >
                                    <i className="fa fa-trash" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

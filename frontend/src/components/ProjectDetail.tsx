import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject, getTasksByProject, apiPost, apiPut, apiDelete } from '../api/client';
import type { Project, TodoItem } from '../types';

export default function ProjectDetail() {
    const { id } = useParams<{ id: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<TodoItem[]>([]);
    const [taskName, setTaskName] = useState('');

    const refresh = useCallback(async () => {
        if (!id) return;
        const [p, t] = await Promise.all([getProject(id), getTasksByProject(id)]);
        setProject(p);
        setTasks(t);
    }, [id]);

    useEffect(() => { refresh(); }, [refresh]);

    const handleAddTask = async () => {
        if (!taskName.trim() || !id) return;
        await apiPost('/items', { name: taskName.trim(), projectId: id });
        setTaskName('');
        // Petit délai pour laisser le temps à l'event TaskCreated d'incrémenter totalTasks
        setTimeout(refresh, 500);
    };

    const handleToggle = async (task: TodoItem) => {
        await apiPut(`/items/${task.id}`, { name: task.name, completed: !task.completed });
        setTimeout(refresh, 500);
    };

    const handleDeleteTask = async (task: TodoItem) => {
        await apiDelete(`/items/${task.id}`);
        setTasks(prev => prev.filter(t => t.id !== task.id));
    };

    if (!project) return <p className="text-center">Chargement...</p>;

    const todo = tasks.filter(t => !t.completed);
    const done = tasks.filter(t => t.completed);

    return (
        <>
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                    <Link to="/" className="text-decoration-none">&larr; Retour</Link>
                    <h3 className="mt-1 mb-0">{project.name}</h3>
                </div>
                <span className={`badge fs-6 ${project.status === 'open' ? 'bg-success' : 'bg-danger'}`}>
                    {project.status}
                </span>
            </div>

            <p className="text-muted">
                {project.completedTasks}/{project.totalTasks} tâches terminées
            </p>

            <div className="input-group mb-3">
                <input
                    className="form-control"
                    placeholder="Nouvelle tâche"
                    value={taskName}
                    onChange={e => setTaskName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                />
                <button className="btn btn-primary" onClick={handleAddTask}>
                    Ajouter
                </button>
            </div>

            <div className="row">
                <div className="col-6">
                    <h5 className="text-center">
                        <span className="badge bg-secondary">À faire ({todo.length})</span>
                    </h5>
                    {todo.map(task => (
                        <div key={task.id} className="card mb-2">
                            <div className="card-body d-flex align-items-center justify-content-between py-2">
                                <span>{task.name}</span>
                                <div>
                                    <button
                                        className="btn btn-outline-success btn-sm me-1"
                                        onClick={() => handleToggle(task)}
                                        title="Terminer"
                                    >
                                        <i className="fa fa-check" />
                                    </button>
                                    <button
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => handleDeleteTask(task)}
                                        title="Supprimer"
                                    >
                                        <i className="fa fa-trash" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {todo.length === 0 && <p className="text-muted text-center small">Aucune tâche</p>}
                </div>

                <div className="col-6">
                    <h5 className="text-center">
                        <span className="badge bg-success">Terminées ({done.length})</span>
                    </h5>
                    {done.map(task => (
                        <div key={task.id} className="card mb-2 border-success">
                            <div className="card-body d-flex align-items-center justify-content-between py-2">
                                <span className="text-decoration-line-through text-muted">{task.name}</span>
                                <button
                                    className="btn btn-outline-warning btn-sm"
                                    onClick={() => handleToggle(task)}
                                    title="Réouvrir"
                                >
                                    <i className="fa fa-undo" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {done.length === 0 && <p className="text-muted text-center small">Aucune terminée</p>}
                </div>
            </div>
        </>
    );
}

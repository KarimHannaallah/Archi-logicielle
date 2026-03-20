import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject, getTasksByProject, apiPost, apiPut, apiDelete } from '../api/client';
import type { Project, TodoItem } from '../types';

export default function ProjectDetail() {
    const { id } = useParams<{ id: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<TodoItem[]>([]);
    const [newTaskName, setNewTaskName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const refresh = () => {
        if (id) getProject(id).then(setProject).catch(() => {});
    };

    useEffect(() => {
        if (!id) return;
        Promise.all([getProject(id), getTasksByProject(id)])
            .then(([p, t]) => { setProject(p); setTasks(t); })
            .catch(() => setError('Impossible de charger le projet.'))
            .finally(() => setLoading(false));
    }, [id]);

    const addTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskName.trim() || !id) return;
        try {
            const task = await apiPost<TodoItem>('/items', { name: newTaskName, projectId: id });
            setTasks(prev => [...prev, task]);
            setNewTaskName('');
            setTimeout(refresh, 500);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const toggleTask = async (task: TodoItem) => {
        try {
            const updated = await apiPut<TodoItem>(`/items/${task.id}`, {
                name: task.name,
                completed: !task.completed,
            });
            setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
            if (id) setTimeout(refresh, 500);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const deleteTask = async (task: TodoItem) => {
        try {
            await apiDelete(`/items/${task.id}`);
            setTasks(prev => prev.filter(t => t.id !== task.id));
            setTimeout(refresh, 500);
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (loading) return <div className="text-center mt-5 text-muted">Chargement...</div>;
    if (!project) return (
        <div className="mt-4 page-fade">
            <div className="alert alert-danger">{error || 'Projet introuvable.'}</div>
            <Link to="/" className="btn btn-outline-secondary btn-sm">← Retour</Link>
        </div>
    );

    const todo = tasks.filter(t => !t.completed);
    const done = tasks.filter(t => t.completed);
    const pct = project.totalTasks > 0
        ? Math.round((project.completedTasks / project.totalTasks) * 100)
        : 0;

    return (
        <div className="page-fade">
            {/* Header */}
            <div className="d-flex align-items-center gap-2 mb-2">
                <Link to="/" className="btn btn-outline-secondary btn-sm">←</Link>
                <h3 className="page-title mb-0">{project.name}</h3>
                <span className={`badge-status ${project.status === 'closed' ? 'closed' : 'open'}`}>
                    {project.status === 'closed' ? 'Fermé' : 'Ouvert'}
                </span>
                <small className="text-muted ms-auto">
                    {project.completedTasks}/{project.totalTasks} terminée{project.totalTasks !== 1 ? 's' : ''}
                </small>
            </div>

            {/* Global progress */}
            <div className="progress mb-4">
                <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${pct}%` }}
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                />
            </div>

            {error && <div className="alert alert-danger py-1">{error}</div>}

            {/* Add task form */}
            <form onSubmit={addTask} className="mb-4">
                <div className="input-group">
                    <input
                        className="form-control"
                        value={newTaskName}
                        onChange={e => setNewTaskName(e.target.value)}
                        type="text"
                        placeholder="New Item"
                        disabled={project.status === 'closed'}
                    />
                    <button
                        type="submit"
                        className="btn btn-success"
                        disabled={!newTaskName.trim() || project.status === 'closed'}
                    >
                        Add Item
                    </button>
                </div>
            </form>

            {tasks.length === 0 && (
                <p className="text-center">No items yet! Add one above!</p>
            )}

            {/* Kanban columns */}
            <div className="row">
                <div className="col-md-6 mb-3">
                    <div className="kanban-col">
                        <div className="kanban-col-header">À faire ({todo.length})</div>
                        {todo.length === 0 && (
                            <div className="empty-state py-3">
                                <div className="empty-icon" style={{ fontSize: '1.8rem' }}>✅</div>
                                <p className="empty-text mb-0">Aucune tâche en attente</p>
                            </div>
                        )}
                        {todo.map(task => (
                            <div key={task.id} className="item task-card task-todo">
                                <span className="task-name">{task.name}</span>
                                <div className="task-actions">
                                    <button
                                        className="btn btn-link btn-sm text-success p-0"
                                        onClick={() => toggleTask(task)}
                                        aria-label="Mark item as complete"
                                        title="Complete"
                                    >
                                        <i className="far fa-square" />
                                    </button>
                                    <button
                                        className="btn btn-link btn-sm text-danger p-0"
                                        onClick={() => deleteTask(task)}
                                        aria-label="Remove Item"
                                        title="Remove"
                                    >
                                        <i className="fa fa-trash" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-md-6 mb-3">
                    <div className="kanban-col">
                        <div className="kanban-col-header">Terminées ({done.length})</div>
                        {done.length === 0 && (
                            <div className="empty-state py-3">
                                <div className="empty-icon" style={{ fontSize: '1.8rem' }}>🎯</div>
                                <p className="empty-text mb-0">Aucune tâche terminée</p>
                            </div>
                        )}
                        {done.map(task => (
                            <div key={task.id} className="item task-card task-done">
                                <span className="task-name">{task.name}</span>
                                <div className="task-actions">
                                    <button
                                        className="btn btn-link btn-sm text-muted p-0"
                                        onClick={() => toggleTask(task)}
                                        aria-label="Mark item as incomplete"
                                        title="Reopen"
                                    >
                                        <i className="far fa-check-square" />
                                    </button>
                                    <button
                                        className="btn btn-link btn-sm text-danger p-0"
                                        onClick={() => deleteTask(task)}
                                        aria-label="Remove Item"
                                        title="Remove"
                                    >
                                        <i className="fa fa-trash" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useState, type FormEvent } from 'react';
import { createProject } from '../api/client';
import type { Project } from '../types';

interface Props {
    onProjectCreated: (p: Project) => void;
}

export default function CreateProjectForm({ onProjectCreated }: Props) {
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const project = await createProject(name);
            onProjectCreated(project);
            setName('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mb-4">
            {error && <div className="alert alert-danger py-1">{error}</div>}
            <div className="input-group">
                <input
                    className="form-control"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    type="text"
                    placeholder="Nom du projet"
                />
                <button
                    type="submit"
                    className="btn btn-success"
                    disabled={!name.trim() || submitting}
                >
                    {submitting ? 'Création...' : 'Créer projet'}
                </button>
            </div>
        </form>
    );
}

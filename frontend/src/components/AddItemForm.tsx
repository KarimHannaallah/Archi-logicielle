import { useState, type FormEvent } from 'react';
import { apiPost } from '../api/client';
import type { TodoItem } from '../types';

interface Props {
    onNewItem: (item: TodoItem) => void;
}

export default function AddItemForm({ onNewItem }: Props) {
    const [newItem, setNewItem] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submitNewItem = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const item = await apiPost<TodoItem>('/items', { name: newItem });
            onNewItem(item);
            setNewItem('');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={submitNewItem}>
            <div className="input-group mb-3">
                <input
                    className="form-control"
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    type="text"
                    placeholder="New Item"
                />
                <button
                    type="submit"
                    className="btn btn-success"
                    disabled={!newItem.length || submitting}
                >
                    {submitting ? 'Adding...' : 'Add Item'}
                </button>
            </div>
        </form>
    );
}

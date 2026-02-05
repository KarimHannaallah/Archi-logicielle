import { apiPut, apiDelete } from '../api/client';
import type { TodoItem } from '../types';

interface Props {
    item: TodoItem;
    onItemUpdate: (item: TodoItem) => void;
    onItemRemoval: (item: TodoItem) => void;
}

export default function ItemDisplay({ item, onItemUpdate, onItemRemoval }: Props) {
    const toggleCompletion = async () => {
        const updated = await apiPut<TodoItem>(`/items/${item.id}`, {
            name: item.name,
            completed: !item.completed,
        });
        onItemUpdate(updated);
    };

    const removeItem = async () => {
        await apiDelete(`/items/${item.id}`);
        onItemRemoval(item);
    };

    return (
        <div className={`item container-fluid ${item.completed ? 'completed' : ''}`}>
            <div className="row align-items-center">
                <div className="col-1 text-center">
                    <button
                        className="btn btn-link btn-sm text-dark"
                        onClick={toggleCompletion}
                        aria-label={item.completed ? 'Mark item as incomplete' : 'Mark item as complete'}
                    >
                        <i className={`far ${item.completed ? 'fa-check-square' : 'fa-square'}`} />
                    </button>
                </div>
                <div className="col-10 name">
                    {item.name}
                </div>
                <div className="col-1 text-center remove">
                    <button
                        className="btn btn-link btn-sm text-danger"
                        onClick={removeItem}
                        aria-label="Remove Item"
                    >
                        <i className="fa fa-trash" />
                    </button>
                </div>
            </div>
        </div>
    );
}

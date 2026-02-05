import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../api/client';
import type { TodoItem } from '../types';
import AddItemForm from './AddItemForm';
import ItemDisplay from './ItemDisplay';

export default function TodoListCard() {
    const [items, setItems] = useState<TodoItem[] | null>(null);

    useEffect(() => {
        apiGet<TodoItem[]>('/items').then(setItems).catch(() => setItems([]));
    }, []);

    const onNewItem = useCallback(
        (newItem: TodoItem) => {
            setItems(prev => prev ? [...prev, newItem] : [newItem]);
        },
        [],
    );

    const onItemUpdate = useCallback(
        (item: TodoItem) => {
            setItems(prev => {
                if (!prev) return prev;
                const index = prev.findIndex(i => i.id === item.id);
                return [...prev.slice(0, index), item, ...prev.slice(index + 1)];
            });
        },
        [],
    );

    const onItemRemoval = useCallback(
        (item: TodoItem) => {
            setItems(prev => {
                if (!prev) return prev;
                return prev.filter(i => i.id !== item.id);
            });
        },
        [],
    );

    if (items === null) return <div className="text-center">Loading...</div>;

    return (
        <>
            <AddItemForm onNewItem={onNewItem} />
            {items.length === 0 && (
                <p className="text-center">No items yet! Add one above!</p>
            )}
            {items.map(item => (
                <ItemDisplay
                    item={item}
                    key={item.id}
                    onItemUpdate={onItemUpdate}
                    onItemRemoval={onItemRemoval}
                />
            ))}
        </>
    );
}

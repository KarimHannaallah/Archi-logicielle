export interface Project {
    id: string;
    name: string;
    userId: string;
    status: 'open' | 'closed';
    totalTasks: number;
    completedTasks: number;
    createdAt: string;
}

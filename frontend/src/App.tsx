import Navbar from './components/Navbar';
import TodoListCard from './components/TodoListCard';

export default function App() {
    return (
        <>
            <Navbar />
            <div className="container">
                <TodoListCard />
            </div>
        </>
    );
}
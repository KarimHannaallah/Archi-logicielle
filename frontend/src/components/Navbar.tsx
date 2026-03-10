import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar navbar-expand navbar-dark bg-dark mb-4">
            <div className="container">
                <Link className="navbar-brand" to="/">Kanban App</Link>
                <div className="navbar-nav ms-auto">
                    {user ? (
                        <>
                            <Link className="nav-link" to="/">Projets</Link>
                            <Link className="nav-link" to="/profile">{user.name}</Link>
                            <button className="btn btn-outline-light btn-sm ms-2" onClick={handleLogout}>
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link className="nav-link" to="/login">Login</Link>
                            <Link className="nav-link" to="/register">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

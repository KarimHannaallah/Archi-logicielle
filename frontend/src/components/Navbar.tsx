import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationPanel from './NotificationPanel';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar navbar-expand navbar-custom mb-4">
            <div className="container">
                <Link className="navbar-brand" to="/">📋 Kanban App</Link>
                <div className="navbar-nav ms-auto align-items-center gap-1">
                    {user ? (
                        <>
                            <Link className="nav-link" to="/">Projets</Link>
                            <NotificationPanel />
                            <Link className="nav-link" to="/profile">{user.name}</Link>
                            <button className="btn btn-logout ms-2" onClick={handleLogout}>
                                <i className="fa fa-right-from-bracket me-1" />
                                Déconnexion
                            </button>
                        </>
                    ) : (
                        <>
                            <Link className="nav-link" to="/login">Connexion</Link>
                            <Link className="nav-link" to="/register">Inscription</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

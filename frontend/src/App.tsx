import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import ProjectList from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import Navbar from './components/Navbar';

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { token, loading } = useAuth();
    if (loading) return null;
    return token ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
    return (
        <>
            <Navbar />
            <div className="container">
                <div className="row">
                    <div className="col-md-8 offset-md-2">
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/profile" element={
                                <PrivateRoute><Profile /></PrivateRoute>
                            } />
                            <Route path="/projects/:id" element={
                                <PrivateRoute><ProjectDetail /></PrivateRoute>
                            } />
                            <Route path="/" element={
                                <PrivateRoute><ProjectList /></PrivateRoute>
                            } />
                        </Routes>
                    </div>
                </div>
            </div>
        </>
    );
}

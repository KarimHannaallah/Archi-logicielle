import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [consent, setConsent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (!consent) {
            setError('You must consent to data processing to register (RGPD)');
            return;
        }
        setLoading(true);
        try {
            await register(email, name, password, consent);
            navigate('/');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-fade">
            <div className="auth-card">
                <div className="auth-title">📝 Créer un compte</div>
                {error && <div className="alert alert-danger py-2">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label htmlFor="name" className="form-label fw-medium">Name</label>
                        <input
                            type="text"
                            className="form-control"
                            id="name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="email" className="form-label fw-medium">Email</label>
                        <input
                            type="email"
                            className="form-control"
                            id="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="password" className="form-label fw-medium">Mot de passe</label>
                        <input
                            type="password"
                            className="form-control"
                            id="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                    <div className="mb-3 form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="consent"
                            checked={consent}
                            onChange={e => setConsent(e.target.checked)}
                        />
                        <label className="form-check-label text-muted" htmlFor="consent" style={{ fontSize: '0.85rem' }}>
                            I consent to the processing of my personal data (email, name) for the purpose
                            of using this application, in accordance with RGPD. I understand I can delete
                            my account and all associated data at any time.
                        </label>
                    </div>
                    <button type="submit" className="btn btn-success w-100" disabled={loading || !consent}>
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>
                <p className="text-center mt-3 text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                    Déjà un compte ? <Link to="/login">Se connecter</Link>
                </p>
            </div>
        </div>
    );
}

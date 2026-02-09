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
        <div className="card p-4">
            <h2 className="text-center mb-4">Register</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="name" className="form-label">Name</label>
                    <input type="text" className="form-control" id="name"
                        value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input type="email" className="form-control" id="email"
                        value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="mb-3">
                    <label htmlFor="password" className="form-label">Password</label>
                    <input type="password" className="form-control" id="password"
                        value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
                <div className="mb-3 form-check">
                    <input type="checkbox" className="form-check-input" id="consent"
                        checked={consent} onChange={e => setConsent(e.target.checked)} />
                    <label className="form-check-label" htmlFor="consent">
                        I consent to the processing of my personal data (email, name) for the purpose
                        of using this application, in accordance with RGPD. I understand I can delete
                        my account and all associated data at any time.
                    </label>
                </div>
                <button type="submit" className="btn btn-success w-100" disabled={loading || !consent}>
                    {loading ? 'Registering...' : 'Register'}
                </button>
            </form>
            <p className="text-center mt-3">
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </div>
    );
}
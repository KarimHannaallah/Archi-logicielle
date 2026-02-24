import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserProfile } from '../types';

export default function Profile() {
    const { getProfile, updateProfile, deleteAccount } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        getProfile().then(p => {
            setProfile(p);
            setName(p.name);
            setEmail(p.email);
        }).catch(() => setError('Failed to load profile'));
    }, []);

    const handleUpdate = async () => {
        setError('');
        setSuccess('');
        try {
            const updated = await updateProfile({ name, email });
            setProfile(updated);
            setEditing(false);
            setSuccess('Profile updated successfully');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Update failed');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete your account? This action is irreversible and will delete all your personal data (RGPD right to erasure).')) {
            return;
        }
        try {
            await deleteAccount();
            navigate('/login');
        } catch {
            setError('Failed to delete account');
        }
    };

    if (!profile) return <div className="text-center">Loading...</div>;

    return (
        <div className="card p-4">
            <h2 className="text-center mb-4">My Profile</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {editing ? (
                <>
                    <div className="mb-3">
                        <label className="form-label">Name</label>
                        <input className="form-control" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-primary" onClick={handleUpdate}>Save</button>
                        <button className="btn btn-secondary" onClick={() => { setEditing(false); setName(profile.name); setEmail(profile.email); }}>Cancel</button>
                    </div>
                </>
            ) : (
                <>
                    <dl className="row">
                        <dt className="col-sm-4">Name</dt>
                        <dd className="col-sm-8">{profile.name}</dd>
                        <dt className="col-sm-4">Email</dt>
                        <dd className="col-sm-8">{profile.email}</dd>
                        <dt className="col-sm-4">Member since</dt>
                        <dd className="col-sm-8">{new Date(profile.createdAt).toLocaleDateString()}</dd>
                        <dt className="col-sm-4">Consent RGPD</dt>
                        <dd className="col-sm-8">{profile.consentGiven ? 'Yes' : 'No'}</dd>
                    </dl>
                    <div className="d-flex gap-2">
                        <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit Profile</button>
                        <button className="btn btn-danger" onClick={handleDelete}>Delete Account</button>
                    </div>
                </>
            )}

            <div className="mt-4 p-3 bg-light rounded">
                <h6>Your personal data (RGPD)</h6>
                <small className="text-muted">
                    We store only the minimum data necessary: your name, email and an encrypted
                    password hash. You can edit or delete your data at any time. Account deletion
                    is immediate and permanent.
                </small>
            </div>
        </div>
    );
}

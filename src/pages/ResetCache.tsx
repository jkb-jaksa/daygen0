import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { layout } from '../styles/designSystem';

export default function ResetCache() {
    const navigate = useNavigate();
    const [status, setStatus] = useState('Initializing reset...');

    useEffect(() => {
        const performReset = async () => {
            try {
                setStatus('Clearing LocalStorage and SessionStorage...');
                localStorage.clear();
                sessionStorage.clear();

                setStatus('Clearing IndexedDB...');
                if (window.indexedDB && window.indexedDB.databases) {
                    const dbs = await window.indexedDB.databases();
                    await Promise.all(
                        dbs.map((db) => {
                            if (db.name) {
                                return new Promise<void>((resolve, reject) => {
                                    const req = window.indexedDB.deleteDatabase(db.name!);
                                    req.onsuccess = () => resolve();
                                    req.onerror = () => reject(req.error);
                                    req.onblocked = () => {
                                        console.warn(`Database ${db.name} delete blocked`);
                                        resolve(); // Proceed anyway
                                    }
                                });
                            }
                            return Promise.resolve();
                        })
                    );
                }

                setStatus('Signing out of Supabase...');
                await supabase.auth.signOut();

                setStatus('Reset complete. Redirecting...');
                setTimeout(() => {
                    navigate('/', { replace: true });
                    window.location.reload(); // Hard reload to ensure fresh state
                }, 1500);

            } catch (error) {
                console.error('Reset failed:', error);
                setStatus(`Reset failed: ${String(error)}`);
            }
        };

        performReset();
    }, [navigate]);

    return (
        <div className={`${layout.container} flex items-center justify-center min-h-screen text-theme-text`}>
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl glass-panel">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-theme-primary border-t-transparent" />
                <h1 className="text-xl font-bold">Reseting Application Cache</h1>
                <p className="font-mono text-sm text-theme-text/70">{status}</p>
            </div>
        </div>
    );
}

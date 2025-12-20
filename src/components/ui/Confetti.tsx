import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ConfettiProps {
    count?: number;
}

export function Confetti({ count = 50 }: ConfettiProps) {
    const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; rotation: number }[]>([]);

    useEffect(() => {
        const colors = ['#22d3ee', '#f472b6', '#34d399', '#facc15', '#a78bfa'];

        const newParticles = Array.from({ length: count }).map((_, i) => ({
            id: i,
            x: Math.random() * 100 - 50, // -50 to 50
            y: Math.random() * 100 - 50, // -50 to 50
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
        }));

        setParticles(newParticles);
    }, [count]);

    return (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50 overflow-hidden">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                    animate={{
                        opacity: [1, 1, 0],
                        scale: [0, 1.5, 0],
                        x: p.x * 15, // Spread factor
                        y: p.y * 15, // Spread factor
                        rotate: [0, p.rotation, p.rotation * 2],
                    }}
                    transition={{
                        duration: 2.5,
                        ease: "easeOut",
                        times: [0, 0.2, 1]
                    }}
                    className="absolute w-3 h-3 rounded-sm"
                    style={{ backgroundColor: p.color }}
                />
            ))}
        </div>
    );
}

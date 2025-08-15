import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  direction: 'up' | 'down' | 'left' | 'right' | 'diagonal';
}

interface FloatingParticlesProps {
  count?: number;
  colors?: string[];
  className?: string;
  speed?: 'slow' | 'medium' | 'fast';
  size?: 'small' | 'medium' | 'large';
}

export default function FloatingParticles({
  count = 20,
  colors = ['#00FF88', '#00CCFF', '#FFFFFF', '#FF6B6B'],
  className = '',
  speed = 'medium',
  size = 'medium'
}: FloatingParticlesProps) {
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;

    const newParticles: FloatingParticle[] = [];
    
    for (let i = 0; i < count; i++) {
      newParticles.push(createParticle(i, dimensions.width, dimensions.height));
    }
    
    setParticles(newParticles);
  }, [count, dimensions]);

  const createParticle = (id: number, width: number, height: number): FloatingParticle => {
    const directions: FloatingParticle['direction'][] = ['up', 'down', 'left', 'right', 'diagonal'];
    const speedMultiplier = speed === 'slow' ? 0.7 : speed === 'fast' ? 1.5 : 1;
    const sizeMultiplier = size === 'small' ? 0.7 : size === 'large' ? 1.5 : 1;
    
    return {
      id,
      x: Math.random() * width,
      y: Math.random() * height,
      size: (Math.random() * 8 + 4) * sizeMultiplier,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: (Math.random() * 20 + 15) / speedMultiplier, // 15-35 seconds
      delay: Math.random() * 5,
      direction: directions[Math.floor(Math.random() * directions.length)]
    };
  };

  const getAnimationVariants = (particle: FloatingParticle) => {
    const { direction, x, y } = particle;
    const distance = 200;
    
    let targetX = x;
    let targetY = y;
    
    switch (direction) {
      case 'up':
        targetY = y - distance;
        break;
      case 'down':
        targetY = y + distance;
        break;
      case 'left':
        targetX = x - distance;
        break;
      case 'right':
        targetX = x + distance;
        break;
      case 'diagonal':
        targetX = x + (Math.random() > 0.5 ? distance : -distance);
        targetY = y + (Math.random() > 0.5 ? distance : -distance);
        break;
    }
    
    return {
      initial: { 
        x, 
        y, 
        opacity: 0,
        scale: 0
      },
      animate: {
        x: [x, targetX, x],
        y: [y, targetY, y],
        opacity: [0, 0.6, 0.8, 0.6, 0],
        scale: [0, 1, 1.2, 1, 0],
        rotate: [0, 360]
      },
      exit: {
        opacity: 0,
        scale: 0
      }
    };
  };

  const ParticleComponent = ({ particle }: { particle: FloatingParticle }) => {
    const variants = getAnimationVariants(particle);
    
    return (
      <motion.div
        key={particle.id}
        className="absolute pointer-events-none"
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={{
          duration: particle.duration,
          delay: particle.delay,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          left: 0,
          top: 0,
        }}
      >
        {/* Outer glow */}
        <div
          className="absolute rounded-full blur-sm"
          style={{
            width: particle.size * 2,
            height: particle.size * 2,
            backgroundColor: particle.color,
            opacity: 0.3,
            transform: 'translate(-50%, -50%)'
          }}
        />
        
        {/* Inner core */}
        <div
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            opacity: 0.8,
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 ${particle.size}px ${particle.color}`,
          }}
        />
        
        {/* Center highlight */}
        <div
          className="absolute rounded-full bg-white"
          style={{
            width: particle.size * 0.3,
            height: particle.size * 0.3,
            opacity: 0.9,
            transform: 'translate(-50%, -50%)',
            left: '30%',
            top: '30%'
          }}
        />
      </motion.div>
    );
  };

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      <AnimatePresence>
        {particles.map((particle) => (
          <ParticleComponent key={particle.id} particle={particle} />
        ))}
      </AnimatePresence>
    </div>
  );
}
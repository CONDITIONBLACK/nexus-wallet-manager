import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

interface ParticleFieldProps {
  density?: number;
  speed?: number;
  colors?: string[];
  interactive?: boolean;
  className?: string;
}

export default function ParticleField({
  density = 50,
  speed = 0.5,
  colors = ['#00FF88', '#00CCFF', '#FFFFFF'],
  interactive = true,
  className = ''
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      setDimensions({ width: rect.width, height: rect.height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;

    // Initialize particles
    const particles: Particle[] = [];
    for (let i = 0; i < density; i++) {
      particles.push(createParticle(i, dimensions.width, dimensions.height));
    }
    particlesRef.current = particles;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    // Touch move handler
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      if (touch) {
        mouseRef.current = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top
        };
      }
    };

    if (interactive) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      particlesRef.current.forEach((particle, index) => {
        updateParticle(particle, dimensions.width, dimensions.height, mouseRef.current, interactive);
        drawParticle(ctx, particle);

        // Remove dead particles and create new ones
        if (particle.life <= 0) {
          particlesRef.current[index] = createParticle(index, dimensions.width, dimensions.height);
        }
      });

      // Draw connections between nearby particles
      drawConnections(ctx, particlesRef.current, dimensions.width, dimensions.height);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (interactive) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, [dimensions, density, speed, interactive]);

  const createParticle = (id: number, width: number, height: number): Particle => {
    const maxLife = 300 + Math.random() * 200; // 5-8 seconds at 60fps
    return {
      id,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: maxLife,
      maxLife
    };
  };

  const updateParticle = (
    particle: Particle, 
    width: number, 
    height: number, 
    mouse: { x: number; y: number },
    interactive: boolean
  ) => {
    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;

    // Interactive mouse attraction/repulsion
    if (interactive) {
      const dx = mouse.x - particle.x;
      const dy = mouse.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 100) {
        const force = (100 - distance) / 1000;
        const angle = Math.atan2(dy, dx);
        
        // Attract particles to mouse
        particle.vx += Math.cos(angle) * force * 0.1;
        particle.vy += Math.sin(angle) * force * 0.1;
      }
    }

    // Apply velocity damping
    particle.vx *= 0.99;
    particle.vy *= 0.99;

    // Add slight random movement
    particle.vx += (Math.random() - 0.5) * 0.01;
    particle.vy += (Math.random() - 0.5) * 0.01;

    // Boundary conditions with wrapping
    if (particle.x < -10) particle.x = width + 10;
    if (particle.x > width + 10) particle.x = -10;
    if (particle.y < -10) particle.y = height + 10;
    if (particle.y > height + 10) particle.y = -10;

    // Update life and opacity
    particle.life--;
    particle.opacity = (particle.life / particle.maxLife) * (Math.random() * 0.3 + 0.3);
  };

  const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();
    
    // Create gradient for particle
    const gradient = ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, particle.size * 2
    );
    gradient.addColorStop(0, `${particle.color}${Math.floor(particle.opacity * 255).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(1, `${particle.color}00`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw core
    ctx.fillStyle = `${particle.color}${Math.floor(particle.opacity * 255).toString(16).padStart(2, '0')}`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  };

  const drawConnections = (
    ctx: CanvasRenderingContext2D, 
    particles: Particle[], 
    width: number, 
    height: number
  ) => {
    ctx.save();
    
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 120) {
          const opacity = (120 - distance) / 120 * 0.1;
          
          const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          gradient.addColorStop(0, `${p1.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
          gradient.addColorStop(1, `${p2.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }
    
    ctx.restore();
  };

  return (
    <motion.canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ 
        width: '100%', 
        height: '100%',
        mixBlendMode: 'screen'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2 }}
    />
  );
}
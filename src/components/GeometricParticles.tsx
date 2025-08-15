import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GeometricShape {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  shape: 'circle' | 'square' | 'triangle' | 'hexagon' | 'diamond';
  color: string;
  opacity: number;
  duration: number;
  delay: number;
}

interface GeometricParticlesProps {
  count?: number;
  colors?: string[];
  className?: string;
  interactive?: boolean;
}

export default function GeometricParticles({
  count = 15,
  colors = ['#00FF88', '#00CCFF', '#FFFFFF'],
  className = '',
  interactive = true
}: GeometricParticlesProps) {
  const [shapes, setShapes] = useState<GeometricShape[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const newShapes: GeometricShape[] = [];
    
    for (let i = 0; i < count; i++) {
      newShapes.push(createShape(i));
    }
    
    setShapes(newShapes);
  }, [count]);

  useEffect(() => {
    if (!interactive) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive]);

  const createShape = (id: number): GeometricShape => {
    const shapes: GeometricShape['shape'][] = ['circle', 'square', 'triangle', 'hexagon', 'diamond'];
    
    return {
      id,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 60 + 20,
      rotation: Math.random() * 360,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.3 + 0.1,
      duration: Math.random() * 30 + 20,
      delay: Math.random() * 10
    };
  };

  const getShapeElement = (shape: GeometricShape) => {
    const baseStyle = {
      width: shape.size,
      height: shape.size,
      backgroundColor: 'transparent',
      border: `2px solid ${shape.color}`,
      opacity: shape.opacity,
    };

    switch (shape.shape) {
      case 'circle':
        return (
          <div
            style={{
              ...baseStyle,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${shape.color}20, transparent 70%)`
            }}
          />
        );
      
      case 'square':
        return (
          <div
            style={{
              ...baseStyle,
              background: `linear-gradient(45deg, ${shape.color}20, transparent 70%)`
            }}
          />
        );
      
      case 'triangle':
        return (
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: `${shape.size / 2}px solid transparent`,
              borderRight: `${shape.size / 2}px solid transparent`,
              borderBottom: `${shape.size}px solid ${shape.color}`,
              opacity: shape.opacity,
              filter: `drop-shadow(0 0 10px ${shape.color})`
            }}
          />
        );
      
      case 'diamond':
        return (
          <div
            style={{
              ...baseStyle,
              transform: 'rotate(45deg)',
              background: `linear-gradient(135deg, ${shape.color}20, transparent 70%)`
            }}
          />
        );
      
      case 'hexagon':
        return (
          <div
            style={{
              width: shape.size,
              height: shape.size * 0.866,
              background: `linear-gradient(30deg, ${shape.color}20, transparent 70%)`,
              position: 'relative',
              border: `2px solid ${shape.color}`,
              opacity: shape.opacity,
            }}
            className="hexagon"
          />
        );
      
      default:
        return (
          <div style={baseStyle} />
        );
    }
  };

  const calculateMouseInteraction = (shape: GeometricShape) => {
    if (!interactive) return { x: 0, y: 0, scale: 1 };

    const dx = mousePosition.x - shape.x;
    const dy = mousePosition.y - shape.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 200;

    if (distance < maxDistance) {
      const force = (maxDistance - distance) / maxDistance;
      const angle = Math.atan2(dy, dx);
      
      return {
        x: -Math.cos(angle) * force * 50,
        y: -Math.sin(angle) * force * 50,
        scale: 1 + force * 0.5
      };
    }

    return { x: 0, y: 0, scale: 1 };
  };

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      <style jsx>{`
        .hexagon:before,
        .hexagon:after {
          content: "";
          position: absolute;
          width: 0;
          border-left: ${(shape: any) => shape.size / 2}px solid transparent;
          border-right: ${(shape: any) => shape.size / 2}px solid transparent;
        }
        .hexagon:before {
          bottom: 100%;
          border-bottom: ${(shape: any) => shape.size * 0.289}px solid ${(shape: any) => shape.color};
        }
        .hexagon:after {
          top: 100%;
          border-top: ${(shape: any) => shape.size * 0.289}px solid ${(shape: any) => shape.color};
        }
      `}</style>
      
      <AnimatePresence>
        {shapes.map((shape) => {
          const interaction = calculateMouseInteraction(shape);
          
          return (
            <motion.div
              key={shape.id}
              className="absolute"
              initial={{
                x: shape.x,
                y: shape.y,
                rotate: shape.rotation,
                opacity: 0,
                scale: 0
              }}
              animate={{
                x: shape.x + interaction.x,
                y: shape.y + interaction.y,
                rotate: shape.rotation + 360,
                opacity: shape.opacity,
                scale: interaction.scale,
                filter: `blur(${interaction.scale > 1 ? 0 : 1}px)`
              }}
              exit={{
                opacity: 0,
                scale: 0
              }}
              transition={{
                duration: shape.duration,
                delay: shape.delay,
                repeat: Infinity,
                ease: "linear",
                opacity: { duration: 2 },
                scale: { 
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                },
                x: {
                  type: "spring",
                  stiffness: 100,
                  damping: 20
                },
                y: {
                  type: "spring",
                  stiffness: 100,
                  damping: 20
                }
              }}
              whileHover={{
                scale: interaction.scale * 1.2,
                opacity: shape.opacity * 1.5
              }}
            >
              {getShapeElement(shape)}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
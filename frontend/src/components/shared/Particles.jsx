import { useEffect, useRef } from 'react';

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function Particles({
  particleColors = ['#340df8'],
  particleCount = 300,
  particleSpread = 10,
  speed = 0.1,
  particleBaseSize = 100,
  moveParticlesOnHover = true,
  alphaParticles = false,
  disableRotation = false,
  pixelRatio = 1,
}) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const particlesRef = useRef([]);
  const pointerRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
      return undefined;
    }

    const setupParticles = (width, height) => {
      const count = Math.max(1, particleCount);
      const areaScale = Math.max(0.5, Math.min(2.2, (width * height) / (1440 * 900)));
      const dynamicCount = Math.floor(count * areaScale);
      const baseRadius = Math.max(1, particleBaseSize / 55);

      particlesRef.current = Array.from({ length: dynamicCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: randomBetween(-1, 1) * speed * 0.8,
        vy: randomBetween(-1, 1) * speed * 0.8,
        radius: randomBetween(baseRadius * 0.5, baseRadius * 1.35),
        color: particleColors[Math.floor(Math.random() * particleColors.length)] ?? '#340df8',
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const width = Math.floor(canvas.clientWidth);
      const height = Math.floor(canvas.clientHeight);
      if (!width || !height) {
        return;
      }

      const dpr = Math.max(1, (window.devicePixelRatio || 1) * pixelRatio);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      setupParticles(width, height);
    };

    const onMouseMove = (event) => {
      if (!moveParticlesOnHover) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        active: true,
      };
    };

    const onMouseLeave = () => {
      pointerRef.current.active = false;
    };

    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);

    let previousTime = performance.now();

    const render = (time) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const elapsed = Math.max(0.001, (time - previousTime) / 16.667);
      previousTime = time;

      context.clearRect(0, 0, width, height);

      const pointer = pointerRef.current;
      const pullRadius = Math.max(120, Math.min(width, height) * (particleSpread / 10));

      for (const particle of particlesRef.current) {
        if (!disableRotation) {
          const swing = Math.sin(time * 0.001 + particle.phase) * 0.025;
          particle.vx += swing * speed;
          particle.vy -= swing * speed;
        }

        if (pointer.active && moveParticlesOnHover) {
          const dx = pointer.x - particle.x;
          const dy = pointer.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          if (distance < pullRadius) {
            const force = (1 - distance / pullRadius) * 0.06;
            particle.vx += (dx / distance) * force;
            particle.vy += (dy / distance) * force;
          }
        }

        particle.x += particle.vx * elapsed;
        particle.y += particle.vy * elapsed;

        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.y > height + 20) particle.y = -20;

        particle.vx *= 0.995;
        particle.vy *= 0.995;

        context.beginPath();
        context.fillStyle = particle.color;
        context.globalAlpha = alphaParticles ? 0.25 : 0.95;
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      frameRef.current = window.requestAnimationFrame(render);
    };

    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [
    alphaParticles,
    disableRotation,
    moveParticlesOnHover,
    particleBaseSize,
    particleColors,
    particleCount,
    particleSpread,
    pixelRatio,
    speed,
  ]);

  return <canvas ref={canvasRef} className="w-full h-full" aria-hidden style={{ pointerEvents: 'none' }} />;
}

export default Particles;
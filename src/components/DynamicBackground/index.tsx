import React, { useEffect, useRef } from 'react';
import './index.less';

const DynamicBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let paused = false;

    // 移动端降低粒子数
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 20 : 50;
    const connectionDistance = 150;
    const mouse = { x: 0, y: 0, active: false };

    // 根据暗色模式获取粒子颜色
    const getColors = () => {
      const isDark = document.body.getAttribute('data-dark') === 'true';
      return {
        particle: isDark
          ? 'rgba(129, 140, 248, 0.2)'  // indigo-400
          : 'rgba(99, 102, 241, 0.15)',   // indigo-500
        line: isDark
          ? 'rgba(129, 140, 248, OPACITY)'
          : 'rgba(99, 102, 241, OPACITY)',
        // 极光光斑颜色
        auroraColors: isDark
          ? [
              'rgba(99, 102, 241, 0.06)',
              'rgba(139, 92, 246, 0.05)',
              'rgba(79, 70, 229, 0.04)',
            ]
          : [
              'rgba(99, 102, 241, 0.08)',
              'rgba(139, 92, 246, 0.06)',
              'rgba(199, 210, 254, 0.1)',
            ],
      };
    };

    let colors = getColors();

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;

      constructor(w: number, h: number) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.size = Math.random() * 2 + 0.5;
      }

      update(w: number, h: number) {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > w) this.vx *= -1;
        if (this.y < 0 || this.y > h) this.vy *= -1;

        if (mouse.active) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            this.x -= dx * 0.008;
            this.y -= dy * 0.008;
          }
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = colors.particle;
        ctx.fill();
      }
    }

    // 极光光斑
    interface AuroraBlob {
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      color: string;
    }

    const auroraBlobs: AuroraBlob[] = [];

    const initAurora = () => {
      auroraBlobs.length = 0;
      const w = canvas.width;
      const h = canvas.height;
      colors.auroraColors.forEach((color, i) => {
        auroraBlobs.push({
          x: w * (0.2 + i * 0.3),
          y: h * (0.3 + i * 0.2),
          radius: Math.min(w, h) * (0.2 + Math.random() * 0.15),
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.2,
          color,
        });
      });
    };

    const drawAurora = () => {
      auroraBlobs.forEach((blob) => {
        blob.x += blob.vx;
        blob.y += blob.vy;
        if (blob.x < -blob.radius || blob.x > canvas.width + blob.radius) blob.vx *= -1;
        if (blob.y < -blob.radius || blob.y > canvas.height + blob.radius) blob.vy *= -1;

        const gradient = ctx.createRadialGradient(
          blob.x, blob.y, 0,
          blob.x, blob.y, blob.radius
        );
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(
          blob.x - blob.radius,
          blob.y - blob.radius,
          blob.radius * 2,
          blob.radius * 2
        );
      });
    };

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
      initAurora();
    };

    const animate = () => {
      if (paused) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制极光
      drawAurora();

      // 绘制粒子和连线
      particles.forEach((p, i) => {
        p.update(canvas.width, canvas.height);
        p.draw(ctx);

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const opacity = 0.12 * (1 - dist / connectionDistance);
            ctx.beginPath();
            ctx.strokeStyle = colors.line.replace('OPACITY', String(opacity));
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      init();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    // 页面不可见时暂停
    const handleVisibilityChange = () => {
      paused = document.hidden;
    };

    // 暗色模式切换时更新颜色
    const observer = new MutationObserver(() => {
      colors = getColors();
      // 更新极光颜色
      auroraBlobs.forEach((blob, i) => {
        blob.color = colors.auroraColors[i % colors.auroraColors.length];
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-dark'],
    });

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    init();
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return <canvas ref={canvasRef} className="dynamic-background-canvas" />;
};

export default DynamicBackground;

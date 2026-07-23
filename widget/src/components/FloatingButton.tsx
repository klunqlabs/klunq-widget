import { useContext, useEffect, useRef } from "preact/hooks";
import { AppConfigContext } from "../App";

interface FloatingButtonProps {
  onClick: () => void;
}

export default function FloatingButton({ onClick }: FloatingButtonProps) {
  const config = useContext(AppConfigContext);
  const innerOrbRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const innerOrb = innerOrbRef.current;
    const container = containerRef.current;
    if (!innerOrb || !container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxMove = 10;
      const moveX = (deltaX / (distance || 1)) * Math.min(distance / 60, maxMove);
      const moveY = (deltaY / (distance || 1)) * Math.min(distance / 60, maxMove);
      if (!isNaN(moveX) && !isNaN(moveY)) {
        innerOrb.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
    };

    const proactive = setInterval(() => {
      if (Math.random() > 0.85) {
        container.style.boxShadow =
          "0 8px 30px rgba(0, 0, 0, 0.08), 0 0 20px var(--color-proactive-glow)";
        setTimeout(() => {
          container.style.boxShadow = "";
        }, 1200);
      }
    }, 6000);

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      clearInterval(proactive);
    };
  }, []);

  const handleClick = () => {
    const innerOrb = innerOrbRef.current;
    if (innerOrb) {
      innerOrb.style.boxShadow =
        "0 0 30px var(--color-primary), 0 0 60px var(--color-click-burst)";
      innerOrb.style.transform = "scale(1.2)";
      setTimeout(() => {
        innerOrb.style.boxShadow = "";
        innerOrb.style.transform = "";
      }, 500);
    }
    onClick();
  };

  return (
    <div key={config.pos} class={`fixed bottom-15 z-60 ${config.pos === 'right' ? 'right-15' : 'left-15'}`}>
      <button
        ref={containerRef}
        class="aura-eye-container"
        onClick={handleClick}
        aria-label="Open chat"
      >
        <div class="iris-scanner" />
        <div class="orb-outer">
          <div ref={innerOrbRef} class="orb-inner" />
          <div class="interaction-text">DEPLOY</div>
        </div>
      </button>
    </div>
  );
}

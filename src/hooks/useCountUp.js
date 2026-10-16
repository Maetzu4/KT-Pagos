import { useState, useEffect, useRef } from 'react';

/**
 * Hook useCountUp: Anima un número desde 0 (o su valor previo) hasta endValue.
 *
 * @param {number} endValue - Valor final al que debe llegar el contador.
 * @param {number} duration - Duración en milisegundos de la animación (default 1000ms).
 * @returns {number} Valor actual animado.
 */
export function useCountUp(endValue, duration = 1000) {
  const target = Number(endValue) || 0;
  const [count, setCount] = useState(0);
  const startValRef = useRef(0);
  const startTimeRef = useRef(null);

  useEffect(() => {
    let animId;
    const startVal = startValRef.current;
    const diff = target - startVal;

    if (diff === 0) {
      setCount(target);
      return;
    }

    const step = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing suave (ease-out cubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startVal + diff * easeProgress;

      setCount(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setCount(target);
        startValRef.current = target;
        startTimeRef.current = null;
      }
    };

    startTimeRef.current = null;
    animId = requestAnimationFrame(step);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      startValRef.current = target;
      startTimeRef.current = null;
    };
  }, [target, duration]);

  return count;
}

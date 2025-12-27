import './DecorativeButterflies.css';

interface DecorativeButterfliesProps {
  count?: number;
}

export function DecorativeButterflies({ count = 5 }: DecorativeButterfliesProps) {
  const butterflies = Array.from({ length: count }, (_, i) => ({
    id: i,
    delay: i * 0.5,
    duration: 15 + Math.random() * 10,
    size: 30 + Math.random() * 20,
    left: Math.random() * 100,
    top: Math.random() * 100,
  }));

  return (
    <div className="butterflies-container">
      {butterflies.map((butterfly) => (
        <div
          key={butterfly.id}
          className="butterfly"
          style={{
            left: `${butterfly.left}%`,
            top: `${butterfly.top}%`,
            width: `${butterfly.size}px`,
            height: `${butterfly.size}px`,
            animationDelay: `${butterfly.delay}s`,
            animationDuration: `${butterfly.duration}s`,
          }}
        >
          <img
            src="https://factorydirectcraft.com/mpix/osc_products/20150323132401-219653.jpg"
            alt="Decorative butterfly"
            className="butterfly-image"
          />
        </div>
      ))}
    </div>
  );
}











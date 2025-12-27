import './DecorativeLadybugs.css';

interface DecorativeLadybugsProps {
  count?: number;
}

export function DecorativeLadybugs({ count = 4 }: DecorativeLadybugsProps) {
  const ladybugs = Array.from({ length: count }, (_, i) => ({
    id: i,
    delay: i * 0.8,
    duration: 20 + Math.random() * 15,
    size: 25 + Math.random() * 15,
    left: Math.random() * 100,
    top: 60 + Math.random() * 30, // Position them lower on the screen (ground level)
  }));

  return (
    <div className="ladybugs-container">
      {ladybugs.map((ladybug) => (
        <div
          key={ladybug.id}
          className="ladybug"
          style={{
            left: `${ladybug.left}%`,
            top: `${ladybug.top}%`,
            width: `${ladybug.size}px`,
            height: `${ladybug.size}px`,
            animationDelay: `${ladybug.delay}s`,
            animationDuration: `${ladybug.duration}s`,
          }}
        >
          <img
            src="https://i.etsystatic.com/7608168/r/il/592c1c/3194647175/il_1588xN.3194647175_11t7.jpg"
            alt="Decorative ladybug"
            className="ladybug-image"
          />
        </div>
      ))}
    </div>
  );
}











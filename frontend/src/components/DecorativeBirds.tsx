import './DecorativeBirds.css';

interface DecorativeBirdsProps {
  count?: number;
}

export function DecorativeBirds({ count = 4 }: DecorativeBirdsProps) {
  const birds = Array.from({ length: count }, (_, i) => ({
    id: i,
    delay: i * 0.7,
    duration: 18 + Math.random() * 12,
    size: 35 + Math.random() * 20,
    left: Math.random() * 100,
    top: 10 + Math.random() * 40, // Position them in the upper portion of the screen (sky level)
  }));

  return (
    <div className="birds-container">
      {birds.map((bird) => (
        <div
          key={bird.id}
          className="bird"
          style={{
            left: `${bird.left}%`,
            top: `${bird.top}%`,
            width: `${bird.size}px`,
            height: `${bird.size}px`,
            animationDelay: `${bird.delay}s`,
            animationDuration: `${bird.duration}s`,
          }}
        >
          <img
            src="https://tse2.mm.bing.net/th/id/OIP.-5WEnJDxUxk-CUa4d0PgEgHaHa?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3"
            alt="Decorative bird"
            className="bird-image"
          />
        </div>
      ))}
    </div>
  );
}










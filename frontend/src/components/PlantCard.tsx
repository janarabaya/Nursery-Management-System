import './PlantCard.css';

export interface BasePlant {
  name: string;
  price: string;
  description: string;
  imageUrl: string;
  id?: number;
  quantity?: number;
}

interface PlantCardProps {
  plant: BasePlant;
  isFavorite: boolean;
  onFavoriteClick: () => void;
  onAddToCart: () => void;
  favoriteId?: string | number;
}

export function PlantCard({ plant, isFavorite, onFavoriteClick, onAddToCart, favoriteId }: PlantCardProps) {
  const plantKey = favoriteId !== undefined ? favoriteId : plant.name;

  return (
    <div className="plant-card" key={plantKey}>
      <div className="plant-card-image-wrapper">
        <img
          className="plant-card-image"
          src={plant.imageUrl}
          alt={plant.name}
        />
      </div>
      <div className="plant-card-info">
        <div className="plant-card-header">
          <h3>{plant.name}</h3>
          <span className="plant-price">{plant.price}</span>
        </div>
        <p className="plant-description">{plant.description}</p>
        <div className="plant-card-actions">
          <button 
            className="favorite-btn"
            onClick={onFavoriteClick}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill={isFavorite ? "#e74c3c" : "none"} 
              stroke={isFavorite ? "#e74c3c" : "#666"} 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
          <button 
            className="plant-buy-btn"
            onClick={onAddToCart}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}












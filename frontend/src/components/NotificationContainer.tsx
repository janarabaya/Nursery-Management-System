import './NotificationContainer.css';

interface Notification {
  id: number;
  message: string;
}

interface NotificationContainerProps {
  cartNotifications: Notification[];
  favoriteNotifications: Notification[];
}

export function NotificationContainer({ cartNotifications, favoriteNotifications }: NotificationContainerProps) {
  return (
    <div className="cart-notifications-container">
      {cartNotifications.map((notification) => (
        <div 
          key={notification.id} 
          className="cart-notification"
        >
          {notification.message}
        </div>
      ))}
      {favoriteNotifications.map((notification) => (
        <div 
          key={notification.id} 
          className="cart-notification"
        >
          {notification.message}
        </div>
      ))}
    </div>
  );
}











import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

/**
 * Whether a card's quick add has nothing to add: a plain product the shop
 * holds none of. A product sold in sizes opens its page instead, where each
 * combination's own stock decides (its total here can be stale).
 */
export const soldOutOnCard = (p) => !p.hasVariants && p.quantity != null && !(Number(p.quantity) > 0);

/**
 * The "+" on a product card, the same everywhere a card is drawn.
 *
 * A product sold in sizes or colours is chosen on its own page: added from a
 * card it would reach checkout without a combination, and the server refuses
 * the whole order (D11, review H3). Anything else goes straight in the bag,
 * with its stock, so the bag never holds more than the shop has (review M13).
 */
export default function useQuickAdd() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  return (p) => {
    if (p.hasVariants) return navigate(`/product/${p.id}`);
    if (soldOutOnCard(p)) return undefined;
    return addToCart({
      id: p.id, title: p.title, price: p.price, image: p.image, thumbnail: p.thumbnail, stock: p.quantity,
    });
  };
}

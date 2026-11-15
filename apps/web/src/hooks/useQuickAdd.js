import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

/**
 * The "+" on a product card, the same everywhere a card is drawn.
 *
 * A product sold in sizes or colours is chosen on its own page: added from a
 * card it would reach checkout without a combination, and the server refuses
 * the whole order (D11, review H3). Anything else goes straight in the bag.
 */
export default function useQuickAdd() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  return (p) => (p.hasVariants
    ? navigate(`/product/${p.id}`)
    : addToCart({ id: p.id, title: p.title, price: p.price, image: p.image, thumbnail: p.thumbnail }));
}

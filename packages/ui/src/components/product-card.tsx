import { Card, CardContent } from "./card";
import { Badge } from "./badge";
import { cn } from "../lib/utils";

export interface ProductCardProps {
  name: string;
  price: number;
  imageUrl: string | null;
  outOfStock?: boolean;
  currency?: string;
  onClick?: () => void;
  className?: string;
  onAdd?: () => void;
  quantity?: number;
  onIncrement?: () => void;
  onDecrement?: () => void;
}

export function ProductCard({
  name,
  price,
  imageUrl,
  outOfStock = false,
  currency = "PKR",
  onClick,
  className,
  onAdd,
  quantity = 0,
  onIncrement,
  onDecrement,
}: ProductCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "overflow-hidden transition-shadow hover:shadow-md",
        onClick && "cursor-pointer",
        outOfStock && "opacity-60",
        className,
      )}
    >
      <div className="relative aspect-square bg-(--color-muted)">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-(--color-muted-foreground) text-xs">
            No image
          </div>
        )}
        {outOfStock && (
          <Badge variant="destructive" className="absolute right-2 top-2">
            Out of stock
          </Badge>
        )}
      </div>
      <CardContent className="p-3">
        <p className="line-clamp-1 text-sm font-medium">{name}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-(--color-primary)">
            {currency} {price.toLocaleString()}
          </p>
          {!outOfStock &&
            onAdd &&
            (quantity > 0 ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={onDecrement}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-(--color-primary) text-(--color-primary-foreground) text-sm font-bold leading-none"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm font-semibold">{quantity}</span>
                <button
                  onClick={onIncrement}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-(--color-primary) text-(--color-primary-foreground) text-sm font-bold leading-none"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                className="flex h-7 items-center gap-1 rounded-lg bg-(--color-primary) px-2.5 text-xs font-semibold text-(--color-primary-foreground) transition-colors hover:opacity-90"
              >
                + Add
              </button>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

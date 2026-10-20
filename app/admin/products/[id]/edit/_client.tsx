"use client";

import ProductForm from "../../_components/ProductForm";

import { IVariation } from "@/models/Product";

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  categoryId?: string;
  price: number;
  unitPrice: string;
  image?: string;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  tags: string[];
  variations?: IVariation[];
}

export default function ProductFormEdit({ product }: { product: Product }) {
  return (
    <ProductForm
      mode="edit"
      productId={product._id}
      initialData={{
        name: product.name,
        slug: product.slug,
        description: product.description,
        categoryId: product.categoryId ?? "",
        price: String(product.price),
        unitPrice: product.unitPrice ?? "",
        image: product.image ?? "",
        rating: String(product.rating),
        reviewCount: String(product.reviewCount),
        isActive: product.isActive,
        tags: product.tags?.join(", ") ?? "",
        variations: product.variations ?? [],
      }}
    />
  );
}

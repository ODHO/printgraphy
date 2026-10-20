import ProductForm from "../_components/ProductForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Product — Printgraphy Admin",
};

export default function NewProductPage() {
  return <ProductForm mode="create" />;
}

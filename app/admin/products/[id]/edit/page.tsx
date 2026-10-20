import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import type { Metadata } from "next";
import ProductFormEdit from "./_client";

export const metadata: Metadata = {
  title: "Edit Product — Printgraphy Admin",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await dbConnect();
  const product = await Product.findById(id).lean();

  if (!product) notFound();

  const productSerialized = JSON.parse(JSON.stringify(product));

  return <ProductFormEdit product={productSerialized} />;
}

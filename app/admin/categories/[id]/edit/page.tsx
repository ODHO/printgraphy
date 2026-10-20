import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import type { Metadata } from "next";
import CategoryEditClient from "./_client";

export const metadata: Metadata = {
  title: "Edit Category — Printgraphy Admin",
};

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await dbConnect();
  const category = await Category.findById(id).lean();

  if (!category) notFound();

  const serializedCategory = JSON.parse(JSON.stringify(category));

  return <CategoryEditClient category={serializedCategory} />;
}

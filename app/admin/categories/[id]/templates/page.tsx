import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import type { Metadata } from "next";
import CategoryTemplatesClient from "./_client";

export const metadata: Metadata = {
  title: "Category Templates — Printgraphy Admin",
};

export default async function CategoryTemplatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await dbConnect();
  const category = await Category.findById(id).lean();

  if (!category) {
    notFound();
  }

  const categorySerialized = JSON.parse(JSON.stringify(category));

  return <CategoryTemplatesClient category={categorySerialized} />;
}

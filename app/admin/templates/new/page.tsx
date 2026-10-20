import type { Metadata } from "next";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import CategoryCanvasEditor from "@/components/admin/CategoryCanvasEditor";

export const metadata: Metadata = {
  title: "New Template — Printgraphy Admin",
};

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string; category?: string }>;
}) {
  await dbConnect();
  const { categoryId, category: categorySlug } = await searchParams;

  const categories = await Category.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  const serializedCategories = JSON.parse(JSON.stringify(categories));
  let initialCat = serializedCategories.find(
    (c: any) => c._id === categoryId || c.slug === categorySlug
  );
  if (!initialCat && serializedCategories.length > 0) {
    initialCat = serializedCategories[0];
  }

  return (
    <CategoryCanvasEditor
      mode="create"
      allCategories={serializedCategories}
      initialCategory={initialCat}
    />
  );
}

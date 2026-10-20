import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import Template from "@/models/Template";
import Category from "@/models/Category";
import type { Metadata } from "next";
import TemplateFormEdit from "./_client";

export const metadata: Metadata = {
  title: "Edit Template — Printgraphy Admin",
};

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await dbConnect();
  const [template, categories] = await Promise.all([
    Template.findById(id).lean(),
    Category.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
  ]);

  if (!template) notFound();

  const templateSerialized = JSON.parse(JSON.stringify(template));
  const categoriesSerialized = JSON.parse(JSON.stringify(categories));

  return (
    <TemplateFormEdit
      template={templateSerialized}
      allCategories={categoriesSerialized}
    />
  );
}

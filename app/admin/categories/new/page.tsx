import CategoryForm from "../_components/CategoryForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Category — Printgraphy Admin",
};

export default function NewCategoryPage() {
  return <CategoryForm mode="create" />;
}

import fs from "fs";
import path from "path";
import { ProductData } from "@/types";
import ReleaseTable from "@/app/_components/productReleaseTables";

async function loadProductData(product: string): Promise<ProductData | null> {
  const dataPath = path.join(process.cwd(), "data/results", `${product}.json`);
  try {
    const fileContent = fs.readFileSync(dataPath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error loading file for product ${product}:`, error);
    return null;
  }
}

export async function generateStaticParams() {
  const dataPath = path.join(process.cwd(), "data/results");
  const productFiles = fs.readdirSync(dataPath);
  return productFiles.map((file) => {
    return {
      product: file.replace(".json", ""),
    };
  });
}

export default async function ProductPage({
  params: { product },
}: {
  params: { product: string };
}) {
  const productData = await loadProductData(product);
  return <ReleaseTable productData={productData} />;
}

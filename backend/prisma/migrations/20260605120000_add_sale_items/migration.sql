-- CreateTable: SaleItem must exist before we migrate data into it
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- DataMigration: each existing Sale row becomes one SaleItem
INSERT INTO "SaleItem" ("id", "saleId", "productId", "productName", "unitPrice", "quantity", "discount", "lineTotal", "createdAt")
SELECT
    gen_random_uuid()::text,
    "id",
    "productId",
    "productName",
    "unitPrice",
    "quantity",
    "discount",
    ("quantity" * "unitPrice") - "discount",
    "createdAt"
FROM "Sale";

-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "Sale_productId_fkey";

-- AlterTable: remove per-item columns now that they live in SaleItem
ALTER TABLE "Sale"
    DROP COLUMN "discount",
    DROP COLUMN "productId",
    DROP COLUMN "productName",
    DROP COLUMN "quantity",
    DROP COLUMN "unitPrice";

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

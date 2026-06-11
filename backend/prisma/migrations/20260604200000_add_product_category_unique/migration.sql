-- AddUniqueConstraint: ProductCategory(businessId, name)
CREATE UNIQUE INDEX IF NOT EXISTS "ProductCategory_businessId_name_key" ON "ProductCategory"("businessId", "name");

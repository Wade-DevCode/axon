import { expect, test } from "bun:test"
import { Product } from "../../src/util/product"

test("product metadata exposes Axon author signature", () => {
  expect(Product.info.name).toBe("Axon")
  expect(Product.info.author).toBe("WANGHUI")
  expect(Product.info.authorSignature).toBe("author: WANGHUI")
  expect(Product.info.packageName).toBe("@wanghuimvp/axon")
})

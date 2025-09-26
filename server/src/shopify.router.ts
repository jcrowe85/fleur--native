import express from "express";
import { createDiscountCode, createCheckoutWithDiscount } from "./shopify.service";

const router = express.Router();

// Create discount code endpoint
router.post("/discount-code", async (req, res) => {
  try {
    const { code, amount, userId, productSku } = req.body;
    
    if (!code || !amount || !userId || !productSku) {
      return res.status(400).json({ 
        error: "Missing required fields: code, amount, userId, productSku" 
      });
    }

    const result = await createDiscountCode(code, amount, userId, productSku);
    res.json(result);
  } catch (error) {
    console.error("Error creating discount code:", error);
    res.status(500).json({ 
      error: "Failed to create discount code",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Create checkout with discount endpoint
router.post("/checkout", async (req, res) => {
  try {
    const { productSku, userId, userPoints } = req.body;
    
    if (!productSku || !userId || !userPoints) {
      return res.status(400).json({ 
        error: "Missing required fields: productSku, userId, userPoints" 
      });
    }

    const result = await createCheckoutWithDiscount(productSku, userId, userPoints);
    res.json(result);
  } catch (error) {
    console.error("Error creating checkout:", error);
    res.status(500).json({ 
      error: "Failed to create checkout",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;

import { Request, Response } from "express";
import Order from "../models/order.model";
import Product from "../models/product.model";
import { User } from "../models/user.model";

// Create a new order
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { user: userId, products } = req.body;

    // Validate user ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Validate products
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ status: false, message: "Invalid products array" });
    }

    // Calculate total amount and validate product IDs
    let totalAmount = 0;
    const validatedProducts = [];

    for (const item of products) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ status: false, message: `Product with ID ${item.product} not found` });
      }

      const price = product.price;
      totalAmount += price * item.quantity;

      validatedProducts.push({
        product: item.product,
        quantity: item.quantity,
        price,
      });
    }

    // Create the order
    const order = new Order({
      user: userId,
      products: validatedProducts,
      totalAmount,
    });

    await order.save();

    // Populate the response
    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name")
      .populate("products.product", "name price");

    res.status(201).json({
      status: true,
      message: "Order created successfully",
      order: populatedOrder,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Error creating order", error });
  }
};

// Get all orders
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find()
      .populate("user", "name")
      .populate("products.product", "name price");
    
    res.status(200).json({ 
      status: true, 
      message: "Orders fetched successfully",
      orders 
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Error fetching orders", error });
  }
};

// Get order by ID
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate("user", "name")
      .populate("products.product", "name price");
    
    if (!order) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }
    
    res.status(200).json({ 
      status: true, 
      message: "Order fetched successfully",
      order 
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Error fetching order", error });
  }
};

// Update order status
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ status: false, message: "Invalid status value" });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate("user", "name")
      .populate("products.product", "name price");

    if (!order) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }

    res.status(200).json({
      status: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Error updating order status", error });
  }
};

// Delete order
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }

    res.status(200).json({
      status: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Error deleting order", error });
  }
};
import { Request, Response } from "express";
import Order from "../models/order.model";
import Product from "../models/product.model";
import { User } from "../models/user.model";
import Delivery from "../models/delivery.model";
import { uploadToCloudinary } from "../utils/cloudinary";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

interface OrderProduct {
  product: string;
  quantity: number;
}

interface CreateOrderRequest {
  user: string;
  products: OrderProduct[];
}

interface CustomizeProductRequest {
  productId: string;
  color: string | null;
  size: string;
  quantity: number;
  userId: string; // Add this
}


// Create a new order
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { user: userId, products } = req.body as CreateOrderRequest;

    // Validate inputs
    if (!userId || !products) {
      return res.status(400).json({
        status: false,
        message: "User ID and products array are required",
      });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        status: false, 
        message: "User not found" 
      });
    }

    // Validate products
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ 
        status: false, 
        message: "Products must be a non-empty array" 
      });
    }

    // Process products
    let totalAmount = 0;
    const orderProducts = [];
    
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      for (const item of products) {
        if (!item.product || !item.quantity) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            status: false,
            message: "Each product must have an ID and quantity",
          });
        }

        const product = await Product.findById(item.product).session(session);
        if (!product) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({
            status: false,
            message: `Product with ID ${item.product} not found`,
          });
        }

        if (item.quantity < 1) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            status: false,
            message: `Quantity must be at least 1 for product ${product.name}`,
          });
        }

        // Check if product has sufficient quantity
        if (product.quantity < item.quantity) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            status: false,
            message: `Insufficient stock for product ${product.name}. Available: ${product.quantity}`,
          });
        }

        const price = product.price;
        totalAmount += price * item.quantity;

        // Decrement product quantity
        product.quantity -= item.quantity;
        product.inStock = product.quantity > 0;
        await product.save({ session });

        orderProducts.push({
          product: item.product,
          quantity: item.quantity,
          price,
        });
      }

      // Create and save order
      const order = new Order({
        user: userId,
        products: orderProducts,
        totalAmount,
        status: 'pending' // Default status
      });

      await order.save({ session });

      // Verify orderSlug was generated
      if (!order.orderSlug || order.orderSlug === 'TEMP-SLUG') {
        throw new Error('Order slug generation failed');
      }

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Populate order details
      const populatedOrder = await Order.findById(order._id)
        .populate("user", "name email")
        .populate("products.product", "name price images");

      if (!populatedOrder) {
        throw new Error('Order population failed');
      }

      // Successful response
      res.status(201).json({
        status: true,
        message: "Order created successfully",
        data: {
          ...populatedOrder.toObject(),
          orderSlug: order.orderSlug,
        },
      });

    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error: any) {
    console.error("Order creation error:", error);
    res.status(500).json({ 
      status: false, 
      message: "Error creating order",
      error: error.message 
    });
  }
};

// Get all orders with pagination and search
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Search and filter parameters
    const search = req.query.search as string;
    const status = req.query.status as string;
    const userId = req.query.userId as string;

    // Build the base query
    let baseQuery = Order.find();

    // Apply filters
    if (status) {
      baseQuery = baseQuery.where('status').equals(status);
    }

    if (userId) {
      baseQuery = baseQuery.where('user').equals(userId);
    }

    // Apply search if provided
    if (search) {
      baseQuery = baseQuery.populate({
        path: 'products.product',
        match: { name: { $regex: search, $options: 'i' } },
        select: 'name price'
      }).populate("user", "name email");
    } else {
      baseQuery = baseQuery.populate("user", "name email")
        .populate("products.product", "name price images");
    }

    // Execute the query with pagination
    const orders = await baseQuery
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean() // Convert to plain JavaScript objects
      .exec();

    // Get total count (different approach for search vs non-search)
    let totalCount;
    if (search) {
      // For search, we need to count after filtering null products
      const allOrders = await baseQuery.lean().exec();
      totalCount = allOrders.filter(order => 
        order.products.some(p => p.product !== null)
      ).length;
    } else {
      // For non-search, we can use countDocuments
      totalCount = await Order.countDocuments(baseQuery.getFilter());
    }

    // Filter out orders with null products when searching
    const filteredOrders = search 
      ? orders.filter(order => 
          order.products.some(p => p.product !== null)
        ) 
      : orders;

    // Format the response
    const response = {
      status: true,
      message: "Orders retrieved successfully",
      data: {
        orders: filteredOrders.map(order => ({
          ...order,
          // No need for toObject() since we used lean()
          orderSlug: order.orderSlug
        })),
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        }
      }
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error("Error retrieving orders:", error);
    res.status(500).json({ 
      status: false, 
      message: "Error retrieving orders",
      error: error.message 
    });
  }
};

// Get order by ID
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate("user", "name")
      .populate({
        path: "products.product",
        select: "name price media.images",
      })
      .lean(); // Convert to plain JavaScript object
    
    if (!order) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }
    
    // Transform the products array to flatten the structure
    const transformedOrder = {
      ...order,
      products: order.products.map(item => ({
        ...item,
        product: {
          _id: item.product._id,
          name: (item.product as any).name,
          price: (item.product as any).price,
          images: (item.product as any).media?.images || []
        }
      }))    };
    
    res.status(200).json({ 
      status: true, 
      message: "Order fetched successfully",
      order: transformedOrder
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

    const validStatuses = ["pending", "processing", "paid", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ status: false, message: "Invalid status value" });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findById(id).session(session);
      if (!order) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ status: false, message: "Order not found" });
      }

      // Handle status changes
      if (status === 'cancelled' && order.status !== 'cancelled') {
        // If cancelling an order, restore product quantities
        for (const item of order.products) {
          const product = await Product.findById(item.product).session(session);
          if (product) {
            product.quantity += item.quantity;
            product.inStock = true;
            await product.save({ session });
          }
        }
      } else if (order.status === 'cancelled' && status !== 'cancelled') {
        // If uncancelling an order, deduct quantities again
        for (const item of order.products) {
          const product = await Product.findById(item.product).session(session);
          if (product) {
            if (product.quantity < item.quantity) {
              await session.abortTransaction();
              session.endSession();
              return res.status(400).json({
                status: false,
                message: `Cannot restore order - insufficient stock for product ${product.name}`,
              });
            }
            product.quantity -= item.quantity;
            product.inStock = product.quantity > 0;
            await product.save({ session });
          }
        }
      }

      // Update order status
      order.status = status;
      await order.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Populate and return updated order
      const updatedOrder = await Order.findById(order._id)
        .populate("user", "name")
        .populate("products.product", "name price");

      res.status(200).json({
        status: true,
        message: "Order status updated successfully",
        order: updatedOrder,
      });
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error: any) {
    console.error("Error updating order status:", error);
    res.status(500).json({ 
      status: false, 
      message: "Error updating order status",
      error: error.message 
    });
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

// Get order history for a specific user
export const getOrderHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    if (!userId) {
      return res.status(400).json({
        status: false,
        message: "User ID is required",
      });
    }

    // Fetch orders for the user
    const orders = await Order.find({ user: userId })
      .populate("products.product", "name price")
      .sort({ createdAt: -1 });

    // Fetch delivery status for each order
    const orderHistory = await Promise.all(
      orders.map(async (order) => {
        const delivery = await Delivery.findOne({ order: order._id });
        return {
          orderNo: order.orderSlug,
          total: `${order.totalAmount} (${order.products.length} Products)`,
          status: order ? order.status : "Not Assigned",
          date: order.createdAt,
          orderId: order._id,
        };
      })
    );

    res.status(200).json({
      status: true,
      message: "Order history retrieved successfully",
      data: orderHistory,
    });
  } catch (error: any) {
    console.error("Error retrieving order history:", error);
    res.status(500).json({
      status: false,
      message: "Error retrieving order history",
      error: error.message,
    });
  }
};


// Cancel an order// Cancel an order
export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.body;

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findOne({ 
        _id: orderId, 
        user: userId 
      }).session(session).populate('delivery');

      if (!order) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ 
          status: false, 
          message: "Order not found or doesn't belong to this user" 
        });
      }

      // Check if order can be cancelled
      if (order.status === 'cancelled') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          status: false, 
          message: "Order is already cancelled" 
        });
      }

      if (order.status === 'delivered') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          status: false, 
          message: "Delivered orders cannot be cancelled" 
        });
      }

      // Restore product quantities
      for (const item of order.products) {
        const product = await Product.findById(item.product).session(session);
        if (product) {
          product.quantity += item.quantity;
          product.inStock = true;
          await product.save({ session });
        }
      }

      // Update order status
      order.status = 'cancelled';
      
      // Update delivery status if exists
      const deliveryId = (order as any).delivery;
      if (deliveryId) {
        const delivery = await Delivery.findById(deliveryId).session(session);
        if (delivery) {
          delivery.set('status', 'cancelled');
          await delivery.save({ session });
        }
      }

      await order.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        status: true,
        message: "Order cancelled successfully",
        data: {
          orderId: order._id,
          status: order.status,
          orderSlug: order.orderSlug
        }
      });
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error: any) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ 
      status: false, 
      message: "Error cancelling order",
      error: error.message 
    });
  }
};

export const getBestSellingProducts = async (req: Request, res: Response) => {
  try {
    // Fetch all orders excluding cancelled orders
    const orders = await Order.find({
      status: { $ne: "cancelled" }, // Exclude cancelled orders
    })
      .populate("products.product")
      .lean();

    // Create a map to store total quantity sold for each product
    const productQuantityMap: { [key: string]: number } = {};

    // Iterate through each order
    for (const order of orders) {
      for (const productItem of order.products) {
        // Check if the product exists and has a valid _id
        if (!productItem.product || !productItem.product._id) {
          continue; // Skip this product if it's null or undefined
        }

        const productId = productItem.product._id.toString();
        const quantity = productItem.quantity;

        // Exclude products from cancelled deliveries
        if ((order as any).delivery) {
          if (order && order.status === "cancelled") {
            continue; // Skip this product if delivery is cancelled
          }
        }

        // Update the total quantity sold for the product
        if (productQuantityMap[productId]) {
          productQuantityMap[productId] += quantity;
        } else {
          productQuantityMap[productId] = quantity;
        }
      }
    }

    // Convert the map to an array of objects
    const bestSellingProducts = Object.keys(productQuantityMap).map((productId) => ({
      product: productId,
      totalQuantitySold: productQuantityMap[productId],
    }));

    // Sort the products by totalQuantitySold in descending order
    bestSellingProducts.sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);

    // Fetch product details for the best-selling products
    const topProducts = await Promise.all(
      bestSellingProducts.map(async (item) => {
        const product = await Product.findById(item.product).select("name price media.images colors");
        if (!product) {
          return null;
        }
        
        // Start with the main product images
        let allImages = [...(product.media?.images || [])];
        
        // Add color images if they exist
        if (product.colors && product.colors.length > 0) {
          for (const color of product.colors) {
            if (color.images && color.images.length > 0) {
              allImages = [...allImages, ...color.images];
            }
          }
        }

        return {
          _id: product._id,
          name: product.name,
          price: product.price,
          images: allImages, // Combined array of all images
          totalQuantitySold: item.totalQuantitySold,
        };
      })
    );

    // Filter out any null values (products that might have been deleted)
    const filteredProducts = topProducts.filter(product => product !== null);

    // Return the response
    res.status(200).json({
      status: true,
      message: "Best selling products retrieved successfully",
      data: filteredProducts,
    });
  } catch (error: any) {
    console.error("Error fetching best selling products:", error);
    res.status(500).json({
      status: false,
      message: "Error fetching best selling products",
      error: error.message,
    });
  }
};


// Customize product and create order
export const customizeProductAndCreateOrder = async (req: Request, res: Response) => {
  try {
    const { productId, color, size, quantity, userId } = req.body as CustomizeProductRequest;

    // Validate inputs
    if (!productId || !size || !quantity) {
      return res.status(400).json({
        status: false,
        message: "Product ID, size, and quantity are required",
      });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate product exists
      const product = await Product.findById(productId).session(session);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          status: false,
          message: "Product not found",
        });
      }

      // Check if product has sufficient quantity
      if (product.quantity < quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          status: false,
          message: `Insufficient stock for product ${product.name}. Available: ${product.quantity}`,
        });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      let frontCustomizationPreviewUrl: string | undefined;
      let logoImageUrl: string | undefined;

      // Upload frontCustomizationPreview to Cloudinary if present
      if (files?.["frontCustomizationPreview"]?.[0]) {
        frontCustomizationPreviewUrl = await uploadToCloudinary(
          files["frontCustomizationPreview"][0].path,
          "customizations"
        );
      }

      // Upload logoImage to Cloudinary if present
      if (files?.["logoImage"]?.[0]) {
        logoImageUrl = await uploadToCloudinary(
          files["logoImage"][0].path,
          "logos"
        );
      }

      // Decrement product quantity
      product.quantity -= quantity;
      product.inStock = product.quantity > 0;
      await product.save({ session });

      // Create order products array
      const orderProducts = [
        {
          product: productId,
          quantity,
          price: product.price,
          customization: {
            color,
            size,
            frontCustomizationPreview: frontCustomizationPreviewUrl,
            logoImage: logoImageUrl,
            userId,
          },
        },
      ];

      // Calculate total amount
      const totalAmount = product.price * quantity;

      // Create and save order
      const order = new Order({
        user: userId,
        products: orderProducts,
        totalAmount,
      });

      await order.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Populate order details
      const populatedOrder = await Order.findById(order._id)
        .populate("products.product", "name price images");

      res.status(201).json({
        status: true,
        message: "Order created successfully with customization",
        data: populatedOrder,
      });
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error: any) {
    console.error("Error customizing product and creating order:", error);
    res.status(500).json({
      status: false,
      message: "Error customizing product and creating order",
      error: error.message,
    });
  }
};

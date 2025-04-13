import { Request, Response } from "express";
import Order from "../models/order.model";
import Product from "../models/product.model";
import { User } from "../models/user.model";

interface OrderProduct {
  product: string;
  quantity: number;
}

interface CreateOrderRequest {
  user: string;
  products: OrderProduct[];
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
    
    for (const item of products) {
      if (!item.product || !item.quantity) {
        return res.status(400).json({
          status: false,
          message: "Each product must have an ID and quantity",
        });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          status: false,
          message: `Product with ID ${item.product} not found`,
        });
      }

      if (item.quantity < 1) {
        return res.status(400).json({
          status: false,
          message: `Quantity must be at least 1 for product ${product.name}`,
        });
      }

      const price = product.price;
      totalAmount += price * item.quantity;

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
    });

    // Explicitly save to trigger pre-save hooks
    await order.save();

    // Verify orderSlug was generated
    if (!order.orderSlug || order.orderSlug === 'TEMP-SLUG') {
      throw new Error('Order slug generation failed');
    }

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
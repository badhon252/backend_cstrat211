import { Request, Response } from 'express';
import Payment from '../models/payment.model';
import Order from '../models/order.model';
import { User } from '../models/user.model';
import Delivery from '../models/delivery.model';

interface RegionData {
  region: string;
  totalAmount: number;
  percentage?: string; // Change to string to include "%"
}

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    // Total income (from payments)
    const totalIncomeResult = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalIncome = totalIncomeResult[0]?.total || 0;

    // Total orders
    const totalOrders = await Order.countDocuments();

    // Total customers
    const totalCustomers = await User.countDocuments({ role: 'customer' });

    // Sales by location with order total amounts
    const salesByLocation = await Delivery.aggregate([
      { 
        $lookup: {
          from: "orders", // The collection name in MongoDB
          localField: "order",
          foreignField: "_id",
          as: "orderDetails"
        }
      },
      { $unwind: "$orderDetails" },
      { $match: { deliveryStatus: 'delivered' } },
      {
        $group: {
          _id: { $toLower: "$region" },
          region: { $first: "$region" }, // Preserve original casing
          totalAmount: { $sum: "$orderDetails.totalAmount" }
        }
      },
      {
        $project: {
          _id: 0,
          region: 1,
          totalAmount: 1,
          percentage: {
            $cond: [
              { $eq: [totalIncome, 0] },
              "0%", // Default to "0%" if totalIncome is 0
              {
                $concat: [
                  { $toString: { $ceil: { $multiply: [{ $divide: ["$totalAmount", totalIncome] }, 100] } } },
                  "%"
                ]
              }
            ]
          }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Ensure percentage is defined for all regions
    salesByLocation.forEach((location: RegionData) => {
      location.percentage = location.percentage || "0%"; // Default to "0%" if undefined
    });

    // Ensure percentage sums up to 100%
    const totalPercentage = salesByLocation.reduce((sum, loc) => sum + parseFloat(loc.percentage.replace("%", "")), 0);
    if (totalPercentage < 100 && salesByLocation.length > 0) {
      const remainingPercentage = 100 - totalPercentage;
      const remainingPercentageString = `${Math.ceil(remainingPercentage)}%`;
      salesByLocation[0].percentage = `${parseFloat(salesByLocation[0].percentage.replace("%", "")) + Math.ceil(remainingPercentage)}%`;
    }

    // Top products
    const topProducts = await Order.aggregate([
      { $unwind: "$products" },
      { $group: { _id: "$products.product", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          name: "$productDetails.name",
          count: 1
        }
      }
    ]);

    // Cancelled products
    const cancelledProducts = await Delivery.aggregate([
      { $match: { deliveryStatus: 'cancelled' } }, // Match cancelled deliveries
      { 
        $lookup: {
          from: "orders",
          localField: "order",
          foreignField: "_id",
          as: "orderDetails"
        }
      },
      { $unwind: "$orderDetails" },
      { $unwind: "$orderDetails.products" },
      { $group: { _id: "$orderDetails.products.product", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          name: "$productDetails.name",
          count: 1
        }
      }
    ]);

    // Calculate percentage for cancelled products
    const totalCancelledProducts = cancelledProducts.reduce((sum, product) => sum + product.count, 0);
    cancelledProducts.forEach((product) => {
      product.percentage = totalCancelledProducts > 0
        ? `${Math.ceil((product.count / totalCancelledProducts) * 100)}%`
        : "0%";
    });

    // Response structure with status, message, and data
    res.status(200).json({
      status: true,
      message: "Analytics fetched successfully",
      data: {
        totalIncome,
        totalOrders,
        totalCustomers,
        salesByLocation,
        topProducts,
        cancelledProducts
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: false,
      message: "Error fetching analytics",
      error: error.message
    });
  }
};
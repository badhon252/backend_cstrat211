import { Request, Response } from "express";
import Delivery from "../models/delivery.model";
import Order, { IOrder } from "../models/order.model";
import { User } from "../models/user.model";
import mongoose from 'mongoose';

export const createDelivery = async (req: Request, res: Response) => {
  try {
    const { orderId, userId, fullName, phoneNumber, houseNoStreet, colonyLocality, region, city, area, address } = req.body;
    
    // Check if order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        status: false, 
        message: "Order not found" 
      });
    }
    
    // Check if userId is provided
    if (!userId) {
      return res.status(400).json({ 
        status: false, 
        message: "User ID is required" 
      });
    }
    
    // Validate userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        status: false, 
        message: "User not found" 
      });
    }
    
    // Create delivery
    const delivery = new Delivery({
      order: new mongoose.Types.ObjectId(orderId),
      user: new mongoose.Types.ObjectId(userId),
      fullName,
      phoneNumber,
      houseNoStreet,
      colonyLocality,
      region,
      city,
      area,
      address
    });
    
    await delivery.save();
    
    // Update order with delivery reference - FIXED TYPE ISSUE HERE
    order.delivery = delivery._id as mongoose.Types.ObjectId;
    await order.save();
    
    res.status(201).json({ 
      status: true, 
      message: "Delivery created successfully",
      data: delivery,
      orderStatus: order.status,
      orderAmount: order.totalAmount
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: false, 
      message: "Error creating delivery", 
      error: error.message 
    });
  }
};
export const getDeliveryByOrderId = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    const delivery = await Delivery.findOne({ order: orderId })
      .populate('order')
      // .populate('user');
    
    if (!delivery) {
      return res.status(404).json({ 
        status: false, 
        message: "Delivery not found" 
      });
    }
    
    // Proper type checking
    const populatedOrder = delivery.order as IOrder;
    const orderAmount = 'totalAmount' in populatedOrder ? populatedOrder.totalAmount : undefined;
    const orderStatus = 'status' in populatedOrder ? populatedOrder.status : undefined;
    
    res.status(200).json({
      status: true,
      message: "Delivery retrieved successfully",
      data: delivery,
      orderStatus,
      orderAmount
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: false, 
      message: "Error fetching delivery", 
      error: error.message 
    });
  }
};
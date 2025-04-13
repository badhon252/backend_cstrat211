import { Request, Response } from "express";
import Delivery, { IDelivery } from "../models/delivery.model";
import Order from "../models/order.model";
import mongoose from 'mongoose';

export const createDelivery = async (req: Request, res: Response) => {
  try {
    const { orderId, fullName, phoneNumber, houseNoStreet, colonyLocality, region, city, area, address } = req.body;
    
    // Check if order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        status: false, 
        message: "Order not found" 
      });
    }
    
    // Create delivery
    const delivery = new Delivery({
      order: orderId,
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
    
    // Update order with delivery reference
    order.delivery = delivery._id as mongoose.Types.ObjectId;
    await order.save();
    
    res.status(201).json({ 
      status: true, 
      message: "Delivery created successfully",
      data: delivery,
      //show the amount of the order
      orderAmount: typeof order === 'object' && 'totalAmount' in order ? order.totalAmount : undefined
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
    const delivery = await Delivery.findOne({ order: orderId }).populate('order');
    
    if (!delivery) {
      return res.status(404).json({ 
        status: false, 
        message: "Delivery not found" 
      });
    }
    
    res.status(200).json({
      status: true,
      message: "Delivery retrieved successfully",
      data: delivery,
      //show the amount of the order
      orderAmount: typeof delivery.order === 'object' && 'totalAmount' in delivery.order ? delivery.order.totalAmount : undefined//save the database
     

    });
  } catch (error: any) {
    res.status(500).json({ 
      status: false, 
      message: "Error fetching delivery", 
      error: error.message 
    });
  }
};

export const updateDeliveryStatus = async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.params;
    const { deliveryStatus } = req.body;
    
    const delivery = await Delivery.findByIdAndUpdate(
      deliveryId,
      { deliveryStatus },
      { new: true }
    );
    
    if (!delivery) {
      return res.status(404).json({ 
        status: false, 
        message: "Delivery not found" 
      });
    }
    
    res.status(200).json({
      status: true,
      message: "Delivery status updated successfully",
      data: delivery
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: false, 
      message: "Error updating delivery status", 
      error: error.message 
    });
  }
};
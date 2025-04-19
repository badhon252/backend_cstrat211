// controllers/RefundController.ts
import { Request, Response } from 'express';
import Refund, { IRefund } from '../models/Refund';
import Order from '../models/order.model'; // Import the Order model

// Create a new refund request
export const createRefund = async (req: Request, res: Response) => {
  try {
    const { orderId, reason } = req.body;

    // Fetch the order details to get the total
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ status: false, message: 'Order not found' });
    }

    const refund: IRefund = new Refund({
      orderId,
      total: order.totalAmount, // Changed from order.total to order.totalAmount
      reason,
    });

    await refund.save();
    res.status(201).json({ status: true, message: 'Refund request created successfully', refund });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Error creating refund request', error });
  }
};
// Get all refund requests
export const getAllRefunds = async (req: Request, res: Response) => {
  try {
    const refunds = await Refund.find().populate('orderId');
    res.status(200).json({ status: true, message: 'Refund requests retrieved successfully', refunds });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Error fetching refund requests', error });
  }
};

// Approve a refund request
export const approveRefund = async (req: Request, res: Response) => {
  try {
    const { refundId } = req.params;

    const refund = await Refund.findByIdAndUpdate(
      refundId,
      { status: 'Approved', action: 'Approve' },
      { new: true }
    );

    if (!refund) {
      return res.status(404).json({ status: false, message: 'Refund request not found' });
    }

    res.status(200).json({ status: true, message: 'Refund request approved', refund });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Error approving refund request', error });
  }
};

// Reject a refund request

export const rejectRefund = async (req: Request, res: Response) => {
    try {
      const { refundId } = req.params;
      const { reason } = req.body; // Get the reason from the request body
  
      // Find and update the refund request
      const refund = await Refund.findByIdAndUpdate(
        refundId,
        { status: 'Rejected', action: 'Not Approve', reason }, // Update the reason
        { new: true } // Return the updated document
      );
  
      if (!refund) {
        return res.status(404).json({ status: false, message: 'Refund request not found' });
      }
  
      // Return the updated refund object in the response
      res.status(200).json({
        status: true,
        message: 'Refund request rejected',
        refund,
      });
    } catch (error) {
      res.status(500).json({ status: false, message: 'Error rejecting refund request', error });
    }
  };

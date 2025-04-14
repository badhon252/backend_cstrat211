import Stripe from 'stripe';
import dotenv from 'dotenv';
import { Request, Response } from 'express';
import Payment from '../models/payment.model';
import Order from '../models/order.model'; // Import your Order model
import { User } from '../models/user.model';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-03-31.basil',
});

export const createPaymentSession = async (req: Request, res: Response): Promise<void> => {
  const { userId, orderId } = req.body;

  // Validate required fields
  if (!userId || !orderId) {
    res.status(400).json({ 
      status: false, 
      message: 'userId and orderId are required!' 
    });
    return;
  }

  try {
    // Find the order in database
    const order = await Order.findById(orderId);
    
    if (!order) {
      res.status(404).json({ 
        status: false, 
        message: 'Order not found' 
      });
      return;
    }

    // Verify the order belongs to the user
    if (order.user.toString() !== userId) {
      res.status(403).json({ 
        status: false, 
        message: 'This order does not belong to the specified user' 
      });
      return;
    }

    // Check if order is already paid
    if (order.status === 'paid') {
      res.status(400).json({ 
        status: false, 
        message: 'Order is already paid' 
      });
      return;
    }

    const totalAmountInCents = Math.round(order.totalAmount * 100);

    // Validate FRONTEND_URL is set
    if (!process.env.FRONTEND_URL) {
      throw new Error('FRONTEND_URL environment variable is not set');
    }

    const successUrl = `${process.env.FRONTEND_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/order/cancel`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Order #${orderId}`,
              description: `Payment for order ${orderId}`,
            },
            unit_amount: totalAmountInCents,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        orderId,
      },
    });

    // Save the payment session in the database
    const newPayment = new Payment({
      userId,
      orderId,
      amount: order.totalAmount,
      stripeSessionId: session.id,
      paymentStatus: 'pending',
    });

    await newPayment.save();
    
    res.status(200).json({ 
      status: true, 
      message: 'Payment session created',
      url: session.url,
      sessionId: session.id,
      amount: order.totalAmount // Optional: include amount in response
    });
  } catch (error) {
    console.error('Payment session creation error:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to create payment session',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;

  if (!sessionId) {
    res.status(400).json({
      status: false,
      message: 'Session ID is required',
    });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      // Update payment status in database
      const updatedPayment = await Payment.findOneAndUpdate(
        { stripeSessionId: sessionId },
        { paymentStatus: 'completed' },
        { new: true }
      );

      if (!updatedPayment) {
        res.status(404).json({
          status: false,
          message: 'Payment verification failed: Record not found',
        });
        return;
      }
      
      // Also update the order status to 'paid'
      await Order.findByIdAndUpdate(updatedPayment.orderId, { status: 'paid' });
      
      if (updatedPayment) {
        const user = await User.findById(updatedPayment.userId);
        res.status(200).json({
          status: true, 
          message: 'Payment successfully verified and completed',
          paid: true,
          payment: {
            ...updatedPayment.toObject(),
            userName: user?.name,
            userPhone: user?.phone
          } 
        });
      }
    } else {
      res.status(200).json({ 
        status: true, 
        message: `Payment is ${session.payment_status}`,
        paid: false,
        paymentStatus: session.payment_status 
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      status: false,
      message: 'Payment verification failed: Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};


//get all Payment successfully verified and completed in response show details
export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const payments = await Payment.find({ paymentStatus: 'completed' }).lean();

    // Extract all userIds and orderIds from payments
    const userIds = payments.map(p => p.userId);
    const orderIds = payments.map(p => p.orderId);

    // Fetch users and orders in bulk (correct field: 'phone')
    const users = await User.find({ _id: { $in: userIds } }).select('name phone').lean();
    const orders = await Order.find({ _id: { $in: orderIds } }).select('status orderSlug').lean(); // Include 'orderSlug' here

    // Convert to maps for quick lookup
    const userMap = users.reduce((map, user) => {
      map[user._id.toString()] = { 
        name: user.name || '', 
        phone: user.phone || null // Use 'phone' (not 'phonel')
      };
      return map;
    }, {} as Record<string, { name: string; phone: string | null }>);

    const orderMap = orders.reduce((map, order) => {
      map[order._id.toString()] = { 
        status: order.status || null,
        orderSlug: order.orderSlug || null // Include 'orderSlug' in the map
      };
      return map;
    }, {} as Record<string, { status: string | null; orderSlug: string | null }>);

    // Enhance payments with additional fields
    const enhancedPayments = payments.map(payment => {
      const orderId = payment.orderId.toString();
      const userId = payment.userId.toString();

      return {
        ...payment,
        name: userMap[userId]?.name || null,
        phone: userMap[userId]?.phone || null, // Now correctly mapped
        status: orderMap[orderId]?.status || null,
        orderSlug: orderMap[orderId]?.orderSlug || null, // Include the 'orderSlug' from the database
      };
    });

    res.status(200).json({
      status: true,
      message: 'All payments fetched successfully',
      payments: enhancedPayments,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch payments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
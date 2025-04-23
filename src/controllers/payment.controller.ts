import Stripe from 'stripe';
import dotenv from 'dotenv';
import { Request, Response } from 'express';
import Payment from '../models/payment.model';
import Order from '../models/order.model';
import { User } from '../models/user.model';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-03-31.basil',
});

export const createPaymentSession = async (req: Request, res: Response): Promise<void> => {
  const { userId, orderIds } = req.body;

  if (!userId || !orderIds || !Array.isArray(orderIds)) {
    res.status(400).json({ 
      status: false, 
      message: 'userId and orderIds (array) are required!' 
    });
    return;
  }

  try {
    const orders = await Order.find({ 
      _id: { $in: orderIds },
      user: userId,
      status: { $in: ['pending', 'processing'] }
    });

    if (!orders.length) {
      res.status(404).json({ 
        status: false, 
        message: 'No valid orders found for payment' 
      });
      return;
    }

    const paidOrders = orders.filter(order => order.status === 'paid');
    if (paidOrders.length > 0) {
      res.status(400).json({ 
        status: false, 
        message: 'Some orders are already paid',
        paidOrderIds: paidOrders.map(order => order._id)
      });
      return;
    }

    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalAmountInCents = Math.round(totalAmount * 100);

    if (!process.env.FRONTEND_URL) {
      throw new Error('FRONTEND_URL environment variable is not set');
    }

    const successUrl = `${process.env.FRONTEND_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/order/cancel`;

    const lineItems = orders.map(order => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Order #${order.orderSlug}`,
          description: `Payment for order ${order.orderSlug}`,
        },
        unit_amount: Math.round(order.totalAmount * 100),
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        orderIds: JSON.stringify(orderIds),
      },
    });

    await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { paymentSessionId: session.id } }
    );

    const newPayment = new Payment({
      userId,
      orderIds,
      amount: totalAmount,
      stripeSessionId: session.id,
      paymentStatus: 'pending',
    });

    await newPayment.save();
    
    res.status(200).json({ 
      status: true, 
      message: 'Payment session created for multiple orders',
      url: session.url,
      sessionId: session.id,
      amount: totalAmount,
      orderCount: orders.length
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
      
      // Parse order IDs from metadata
      const orderIds = session.metadata?.orderIds ? JSON.parse(session.metadata.orderIds) : [];
      
      // Update all orders status to 'paid'
      await Order.updateMany(
        { _id: { $in: orderIds } },
        { $set: { status: 'paid' } }
      );
      
      if (updatedPayment) {
        const user = await User.findById(updatedPayment.userId);
        res.status(200).json({
          status: true, 
          message: 'Payment successfully verified and completed for all orders',
          paid: true,
          payment: {
            ...updatedPayment.toObject(),
            userName: user?.name,
            userPhone: user?.phone,
            orderCount: orderIds.length
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
export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const payments = await Payment.find().lean().sort({ createdAt: -1 });

    // Extract all userIds and flatten all orderIds from payments
    const userIds = payments.map(p => p.userId);
    const allOrderIds = payments.flatMap(p => p.orderIds || []);

    // Fetch users and orders in bulk
    const users = await User.find({ _id: { $in: userIds } }).select('name phone').lean();
    const orders = await Order.find({ _id: { $in: allOrderIds } }).select('status orderSlug').lean();

    // Convert to maps for quick lookup
    const userMap = users.reduce((map, user) => {
      map[user._id.toString()] = { 
        name: user.name || '', 
        phone: user.phone || null
      };
      return map;
    }, {} as Record<string, { name: string; phone: string | null }>);

    const orderMap = orders.reduce((map, order) => {
      map[order._id.toString()] = { 
        status: order.status || null,
        orderSlug: order.orderSlug || null
      };
      return map;
    }, {} as Record<string, { status: string | null; orderSlug: string | null }>);

    // Enhance payments with additional fields
    const enhancedPayments = payments.map(payment => {
      const userId = payment.userId.toString();
      const orderDetails = (payment.orderIds || []).map(orderId => ({
        orderId: orderId.toString(),
        status: orderMap[orderId.toString()]?.status || null,
        orderSlug: orderMap[orderId.toString()]?.orderSlug || null,
      }));

      return {
        ...payment,
        name: userMap[userId]?.name || null,
        phone: userMap[userId]?.phone || null,
        orderDetails,
        orderCount: payment.orderIds?.length || 0,
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
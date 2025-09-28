const { Router } = require('express');
const jwt = require('jsonwebtoken');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAuth(req, res, next) {
    const token = req.cookies.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        return next();
    } catch (e) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

// RRA EBM Bill Generation
router.post('/rra-ebm', requireAuth, async (req, res) => {
    try {
        const { 
            customerName, 
            customerTin, 
            customerEmail, 
            customerPhone, 
            serviceType, 
            amount, 
            description, 
            bookingId, 
            taxRate = 18 
        } = req.body;

        // Validate required fields
        if (!customerName || !customerTin || !amount) {
            return res.status(400).json({ message: 'Customer name, TIN, and amount are required' });
        }

        // Validate TIN format (10 digits)
        const tinRegex = /^[0-9]{10}$/;
        if (!tinRegex.test(customerTin)) {
            return res.status(400).json({ message: 'Invalid TIN format. Must be 10 digits' });
        }

        // Validate amount
        if (Number(amount) <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than 0' });
        }

        // Calculate tax
        const subtotal = Number(amount);
        const taxAmount = (subtotal * Number(taxRate)) / 100;
        const totalAmount = subtotal + taxAmount;

        // Generate invoice number
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const invoiceNumber = `RRA${year}${month}${day}${random}`;

        // Generate bill ID
        const billId = `RRA${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // Simulate RRA EBM API call
        // In a real implementation, you would integrate with RRA's actual EBM system
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock successful bill generation response
        const billData = {
            billId,
            invoiceNumber,
            customerName,
            customerTin,
            customerEmail,
            customerPhone,
            serviceType,
            description,
            bookingId,
            subtotal,
            taxRate: Number(taxRate),
            taxAmount,
            totalAmount,
            currency: 'RWF',
            generatedAt: new Date().toISOString(),
            status: 'generated',
            qrCode: `QR_${billId}_${Date.now()}`, // Mock QR code data
            rraReference: `RRA_REF_${billId}`
        };

        res.json({
            success: true,
            message: 'EBM Bill generated successfully',
            billId,
            billData
        });

    } catch (error) {
        console.error('RRA EBM bill generation error:', error);
        res.status(500).json({ message: 'Bill generation failed', error: error.message });
    }
});

// Get bill details
router.get('/bill/:billId', requireAuth, async (req, res) => {
    try {
        const { billId } = req.params;
        
        // In a real implementation, you would fetch from RRA's system
        // For now, return a mock response
        res.json({
            billId,
            status: 'generated',
            message: 'Bill retrieved successfully',
            // In real implementation, return actual bill data from database
        });
    } catch (error) {
        console.error('Bill retrieval error:', error);
        res.status(500).json({ message: 'Failed to retrieve bill', error: error.message });
    }
});

// Verify bill with RRA
router.post('/verify/:billId', requireAuth, async (req, res) => {
    try {
        const { billId } = req.params;
        
        // In a real implementation, you would verify with RRA's system
        // For now, return a mock verification response
        res.json({
            billId,
            verified: true,
            message: 'Bill verified successfully with RRA',
            verificationDate: new Date().toISOString()
        });
    } catch (error) {
        console.error('Bill verification error:', error);
        res.status(500).json({ message: 'Bill verification failed', error: error.message });
    }
});

module.exports = router;

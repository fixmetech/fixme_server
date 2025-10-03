class bookingModel {
    constructor(
        {
            bookingId,
            userId,
            technicianId,
            serviceCategory,
            serviceSpecialization,
            description,
            status = 'pending', // pending, confirmed, completed, cancelled
            scheduledDate,
            scheduledTime,
            userDetails: {
                name,
                email,
                phone,
                address
            },
            technicianDetails: {
                name: technicianName,
                email: technicianEmail,
                phone: technicianPhone
            },
            createdAt,
            updatedAt,
            paymentDetails = {
                method: 'credit_card', // credit_card, cash, online
                status: 'unpaid', // unpaid, paid, refunded
                transactionId: null
            },
            priceEstimate,

        }
    ) {
        this.bookingId = bookingId;
        this.userId = userId;
        this.technicianId = technicianId;
        this.serviceCategory = serviceCategory;
        this.serviceSpecialization = serviceSpecialization;
        this.description = description;
        this.status = status; // pending, confirmed, completed, cancelled
        this.scheduledDate = scheduledDate;
        this.scheduledTime = scheduledTime;
        this.userDetails = {
            name,
            email,
            phone,
            address
        };
        this.technicianDetails = {
            name: technicianName,
            email: technicianEmail,
            phone: technicianPhone
        };
        this.createdAt = createdAt || new Date();
        this.updatedAt = updatedAt || new Date();
        this.paymentDetails = paymentDetails;
        this.priceEstimate = priceEstimate || 0; // Default to 0 if not provided

    }


    }



module.exports = bookingModel;
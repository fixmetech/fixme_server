class User {
    constructor({
        businessName,
        createdAt,
        email,
        isOwner,
        phone,
        role,
        uid,
        userName
    }) {
        this.businessName = businessName || '';
        this.createdAt = createdAt || new Date();
        this.email = email || '';
        this.isOwner = isOwner || false;
        this.phone = phone || '';
        this.role = role || '';
        this.uid = uid || '';
        this.userName = userName || '';
    }

}

module.exports = User;
